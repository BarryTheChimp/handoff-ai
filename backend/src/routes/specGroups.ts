import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getSpecGroupService } from '../services/SpecGroupService.js';
import { documentService } from '../services/DocumentService.js';
import { extractionService } from '../services/ExtractionService.js';

interface BatchUploadBody {
  groupName?: string;
  primarySpecIndex?: number;
}

interface ResolveBody {
  resolutions: Array<{
    conflictId: string;
    resolution: 'use_spec1' | 'use_spec2' | 'merge' | 'ignore';
    mergedText?: string;
  }>;
}

interface AddSpecBody {
  specId: string;
}

export async function specGroupRoutes(fastify: FastifyInstance): Promise<void> {
  const specGroupService = getSpecGroupService();

  // List spec groups for a project
  fastify.get(
    '/api/projects/:projectId/spec-groups',
    { preHandler: [fastify.authenticate] },
    async (
      request: FastifyRequest<{ Params: { projectId: string } }>,
      reply: FastifyReply
    ) => {
      const { projectId } = request.params;

      const groups = await specGroupService.listGroups(projectId);

      return reply.send({ data: groups });
    }
  );

  // Batch upload specs and create a group
  fastify.post(
    '/api/projects/:projectId/specs/batch',
    { preHandler: [fastify.authenticate] },
    async (
      request: FastifyRequest<{ Params: { projectId: string } }>,
      reply: FastifyReply
    ) => {
      const { projectId } = request.params;
      const user = request.user as { id: string };

      // Parse multipart
      const parts = request.parts();
      const files: Array<{ filename: string; mimetype: string; buffer: Buffer }> = [];
      let groupName = '';
      let primarySpecIndex = 0;

      for await (const part of parts) {
        if (part.type === 'file') {
          const buffer = await part.toBuffer();
          files.push({
            filename: part.filename ?? 'unknown',
            mimetype: part.mimetype,
            buffer,
          });
        } else {
          // Field
          const value = part.value as string;
          if (part.fieldname === 'groupName') {
            groupName = value;
          } else if (part.fieldname === 'primarySpecIndex') {
            primarySpecIndex = parseInt(value, 10) || 0;
          }
        }
      }

      // Validate file count
      if (files.length < 2) {
        return reply.status(400).send({
          error: {
            code: 'MIN_FILES_REQUIRED',
            message: 'At least 2 files required for batch upload',
            details: { fileCount: files.length, minRequired: 2 },
          },
        });
      }

      if (files.length > 10) {
        return reply.status(400).send({
          error: {
            code: 'MAX_FILES_EXCEEDED',
            message: 'Maximum 10 files allowed per batch',
            details: { fileCount: files.length, maxAllowed: 10 },
          },
        });
      }

      // Validate total size
      const totalSize = files.reduce((sum, f) => sum + f.buffer.length, 0);
      if (totalSize > 50 * 1024 * 1024) {
        return reply.status(413).send({
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: 'Total upload size exceeds 50MB limit',
            details: { totalSize, maxSize: 50 * 1024 * 1024 },
          },
        });
      }

      // Upload each file and get spec IDs
      const specIds: string[] = [];
      const uploadedSpecs: Array<{ id: string; filename: string; status: string; isPrimary: boolean }> = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;

        try {
          // Use document service to upload
          const spec = await documentService.upload({
            projectId,
            data: file.buffer,
            filename: file.filename,
            uploadedBy: user.id,
          });

          specIds.push(spec.specId);
          uploadedSpecs.push({
            id: spec.specId,
            filename: file.filename,
            status: 'uploaded',
            isPrimary: i === primarySpecIndex,
          });
        } catch (error) {
          // Log but continue with other files
          console.error(`Failed to upload ${file.filename}:`, error);
        }
      }

      if (specIds.length < 2) {
        return reply.status(400).send({
          error: {
            code: 'UPLOAD_FAILED',
            message: 'Failed to upload enough files',
            details: { successfulUploads: specIds.length },
          },
        });
      }

      // Generate group name if not provided
      const finalGroupName = groupName || `Batch Upload - ${new Date().toLocaleDateString()}`;

      // Get primary spec ID
      const primarySpecId = primarySpecIndex >= 0 && primarySpecIndex < specIds.length
        ? specIds[primarySpecIndex]
        : undefined;

      // Create the group
      const group = await specGroupService.createGroup(
        projectId,
        finalGroupName,
        specIds,
        primarySpecId
      );

      // Start async extraction and conflict analysis
      setImmediate(async () => {
        try {
          // Extract each spec
          for (const specId of specIds) {
            try {
              await extractionService.extractContent(specId);
            } catch (error) {
              console.error(`Failed to extract spec ${specId}:`, error);
            }
          }

          // Analyze conflicts
          await specGroupService.analyzeConflicts(group.id);
        } catch (error) {
          console.error(`Failed to analyze group ${group.id}:`, error);
        }
      });

      return reply.status(202).send({
        data: {
          specGroupId: group.id,
          name: finalGroupName,
          status: group.status,
          specs: uploadedSpecs,
          statusUrl: `/api/spec-groups/${group.id}`,
        },
      });
    }
  );

  // Get spec group details
  fastify.get(
    '/api/spec-groups/:id',
    { preHandler: [fastify.authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;

      const group = await specGroupService.getGroup(id);

      if (!group) {
        return reply.status(404).send({
          error: {
            code: 'GROUP_NOT_FOUND',
            message: 'Spec group not found',
          },
        });
      }

      return reply.send({ data: group });
    }
  );

  // Resolve conflicts
  fastify.post(
    '/api/spec-groups/:id/resolve',
    { preHandler: [fastify.authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: ResolveBody }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const { resolutions } = request.body;
      const user = request.user as { id: string };

      if (!resolutions || !Array.isArray(resolutions) || resolutions.length === 0) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Resolutions array is required',
          },
        });
      }

      try {
        const result = await specGroupService.resolveConflicts(id, resolutions, user.id);

        const group = await specGroupService.getGroup(id);

        return reply.send({
          data: {
            resolved: result.resolved,
            remaining: result.remaining,
            status: result.status,
            stitchedContext: group?.stitchedContext ?? null,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to resolve conflicts';
        return reply.status(500).send({
          error: {
            code: 'RESOLUTION_FAILED',
            message,
          },
        });
      }
    }
  );

  // Trigger translation using stitched context
  fastify.post(
    '/api/spec-groups/:id/translate',
    { preHandler: [fastify.authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;

      const group = await specGroupService.getGroup(id);

      if (!group) {
        return reply.status(404).send({
          error: {
            code: 'GROUP_NOT_FOUND',
            message: 'Spec group not found',
          },
        });
      }

      if (group.status !== 'ready') {
        return reply.status(400).send({
          error: {
            code: 'NOT_READY',
            message: `Spec group is not ready for translation. Current status: ${group.status}`,
            details: { unresolvedCount: group.conflictSummary.unresolved },
          },
        });
      }

      // TODO: Integrate with TranslationService using stitchedContext
      // For now, return success with placeholder data
      return reply.send({
        data: {
          specGroupId: id,
          message: 'Translation started',
          status: 'pending',
        },
      });
    }
  );

  // Delete spec group
  fastify.delete(
    '/api/spec-groups/:id',
    { preHandler: [fastify.authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;

      try {
        await specGroupService.deleteGroup(id);
        return reply.status(204).send();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete group';
        return reply.status(500).send({
          error: {
            code: 'DELETE_FAILED',
            message,
          },
        });
      }
    }
  );

  // Add spec to group
  fastify.post(
    '/api/spec-groups/:id/specs',
    { preHandler: [fastify.authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: AddSpecBody }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const { specId } = request.body;

      if (!specId) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'specId is required',
          },
        });
      }

      try {
        await specGroupService.addSpecToGroup(id, specId);
        return reply.send({ data: { success: true } });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add spec';
        return reply.status(400).send({
          error: {
            code: 'ADD_FAILED',
            message,
          },
        });
      }
    }
  );

  // Remove spec from group
  fastify.delete(
    '/api/spec-groups/:id/specs/:specId',
    { preHandler: [fastify.authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string; specId: string } }>,
      reply: FastifyReply
    ) => {
      const { id, specId } = request.params;

      try {
        await specGroupService.removeSpecFromGroup(id, specId);
        return reply.status(204).send();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to remove spec';
        return reply.status(400).send({
          error: {
            code: 'REMOVE_FAILED',
            message,
          },
        });
      }
    }
  );

  // Retry conflict analysis
  fastify.post(
    '/api/spec-groups/:id/analyze',
    { preHandler: [fastify.authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;

      try {
        // Start async analysis
        setImmediate(async () => {
          try {
            await specGroupService.analyzeConflicts(id);
          } catch (error) {
            console.error(`Failed to analyze group ${id}:`, error);
          }
        });

        return reply.status(202).send({
          data: {
            message: 'Analysis started',
            statusUrl: `/api/spec-groups/${id}`,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to start analysis';
        return reply.status(500).send({
          error: {
            code: 'ANALYSIS_FAILED',
            message,
          },
        });
      }
    }
  );
}
