import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createDocumentService, DocumentValidationError } from '../services/DocumentService.js';
import { createExtractionService, ExtractionError } from '../services/ExtractionService.js';
import { createTranslationService, TranslationError } from '../services/TranslationService.js';
import { prisma } from '../lib/prisma.js';

interface ListSpecsQuery {
  projectId?: string;
}

interface SpecIdParams {
  id: string;
}

export async function specsRoutes(app: FastifyInstance): Promise<void> {
  const documentService = createDocumentService();
  const extractionService = createExtractionService();
  const translationService = createTranslationService(prisma);

  /**
   * POST /api/specs
   * Upload a specification document
   */
  app.post(
    '/api/specs',
    {
      onRequest: [app.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = await request.file();

        if (!data) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'No file provided',
            },
          });
        }

        // Get form fields
        const fields = data.fields;

        // Extract projectId from fields
        const projectIdField = fields.projectId;
        const projectId =
          projectIdField && 'value' in projectIdField ? projectIdField.value : null;

        if (!projectId || typeof projectId !== 'string') {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'projectId is required',
            },
          });
        }

        // Verify project exists
        const project = await prisma.project.findUnique({
          where: { id: projectId },
        });

        if (!project) {
          return reply.status(404).send({
            error: {
              code: 'NOT_FOUND',
              message: 'Project not found',
            },
          });
        }

        // Extract specType from fields (optional)
        const specTypeField = fields.specType;
        const specType =
          specTypeField && 'value' in specTypeField ? specTypeField.value : 'api-spec';

        // Read file buffer
        const buffer = await data.toBuffer();

        // Upload the document
        const result = await documentService.upload({
          projectId,
          filename: data.filename,
          data: buffer,
          specType: typeof specType === 'string' ? specType : 'api-spec',
          uploadedBy: request.user.id,
        });

        return reply.status(201).send({ data: result });
      } catch (error) {
        if (error instanceof DocumentValidationError) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: error.message,
            },
          });
        }
        throw error;
      }
    }
  );

  /**
   * GET /api/specs
   * List all specs (optionally filtered by projectId)
   */
  app.get<{ Querystring: ListSpecsQuery }>(
    '/api/specs',
    {
      onRequest: [app.authenticate],
    },
    async (request, _reply) => {
      const { projectId } = request.query;

      const whereClause = projectId ? { projectId } : {};

      const specs = await prisma.spec.findMany({
        where: whereClause,
        orderBy: { uploadedAt: 'desc' },
        select: {
          id: true,
          name: true,
          fileType: true,
          fileSize: true,
          status: true,
          specType: true,
          uploadedAt: true,
          projectId: true,
        },
      });

      return { data: specs };
    }
  );

  /**
   * GET /api/specs/:id
   * Get a specific spec by ID
   */
  app.get<{ Params: SpecIdParams }>(
    '/api/specs/:id',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;

      const spec = await documentService.getSpec(id);

      if (!spec) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Spec not found',
          },
        });
      }

      return { data: spec };
    }
  );

  /**
   * DELETE /api/specs/:id
   * Delete a spec
   */
  app.delete<{ Params: SpecIdParams }>(
    '/api/specs/:id',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;

      const spec = await documentService.getSpec(id);

      if (!spec) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Spec not found',
          },
        });
      }

      await documentService.deleteSpec(id);

      return reply.status(204).send();
    }
  );

  /**
   * PATCH /api/specs/:id/metadata
   * Update spec metadata (questionnaire answers)
   */
  app.patch<{ Params: SpecIdParams; Body: { metadata: Record<string, unknown> } }>(
    '/api/specs/:id/metadata',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { metadata } = request.body;

      const spec = await documentService.getSpec(id);

      if (!spec) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Spec not found',
          },
        });
      }

      // Merge with existing metadata
      const existingMetadata = spec.metadata as Record<string, unknown> | null;
      const mergedMetadata = {
        ...(existingMetadata || {}),
        ...metadata,
      };

      const updatedSpec = await prisma.spec.update({
        where: { id },
        data: {
          metadata: mergedMetadata as object,
        },
      });

      return { data: updatedSpec };
    }
  );

  /**
   * POST /api/specs/:id/extract
   * Trigger text extraction for a spec
   */
  app.post<{ Params: SpecIdParams }>(
    '/api/specs/:id/extract',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;

      // Check if spec exists
      const spec = await documentService.getSpec(id);

      if (!spec) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Spec not found',
          },
        });
      }

      // Check if already extracting
      if (spec.status === 'extracting') {
        return reply.status(409).send({
          error: {
            code: 'CONFLICT',
            message: 'Extraction already in progress',
          },
        });
      }

      // Start extraction asynchronously
      // We return 202 immediately, extraction continues in background
      extractionService.extractContent(id).catch((error) => {
        console.error(`Extraction failed for spec ${id}:`, error);
      });

      return reply.status(202).send({
        data: {
          specId: id,
          status: 'extracting',
          message: 'Extraction started',
        },
      });
    }
  );

  /**
   * GET /api/specs/:id/sections
   * Get all sections for a spec
   */
  app.get<{ Params: SpecIdParams }>(
    '/api/specs/:id/sections',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;

      // Check if spec exists
      const spec = await documentService.getSpec(id);

      if (!spec) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Spec not found',
          },
        });
      }

      const sections = await prisma.specSection.findMany({
        where: { specId: id },
        orderBy: { orderIndex: 'asc' },
      });

      return {
        data: sections,
        meta: {
          total: sections.length,
          specStatus: spec.status,
        },
      };
    }
  );

  /**
   * POST /api/specs/:id/translate
   * Trigger AI translation for a spec (4-pass pipeline)
   * Uses Haiku for analysis/validation, Sonnet for generation
   */
  app.post<{ Params: SpecIdParams }>(
    '/api/specs/:id/translate',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;

      // Check if spec exists
      const spec = await documentService.getSpec(id);

      if (!spec) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Spec not found',
          },
        });
      }

      // Check status
      if (spec.status === 'translating') {
        return reply.status(409).send({
          error: {
            code: 'CONFLICT',
            message: 'Translation already in progress',
          },
        });
      }

      if (spec.status !== 'ready') {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Spec must be in 'ready' status before translation. Current status: ${spec.status}`,
          },
        });
      }

      try {
        // Run translation synchronously (can take 30-60 seconds)
        // For production, this should be moved to a job queue
        const result = await translationService.translate(id);

        return reply.status(200).send({
          data: {
            specId: result.specId,
            epicsCreated: result.epicsCreated,
            featuresCreated: result.featuresCreated,
            storiesCreated: result.storiesCreated,
            qualityScore: result.enrichment.qualityScore,
            coveragePercent: result.enrichment.coverage.coveragePercent,
            warnings: result.warnings,
            durationMs: result.durationMs,
          },
        });
      } catch (error) {
        if (error instanceof TranslationError) {
          return reply.status(500).send({
            error: {
              code: 'TRANSLATION_ERROR',
              message: error.message,
              phase: error.phase,
            },
          });
        }
        throw error;
      }
    }
  );

  /**
   * GET /api/specs/:id/workitems
   * Get all work items (epics, features, stories) for a spec
   */
  app.get<{ Params: SpecIdParams }>(
    '/api/specs/:id/workitems',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;

      // Check if spec exists
      const spec = await documentService.getSpec(id);

      if (!spec) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Spec not found',
          },
        });
      }

      // Fetch all work items with their hierarchy
      const workItems = await prisma.workItem.findMany({
        where: { specId: id },
        include: {
          sources: {
            include: {
              section: {
                select: {
                  sectionRef: true,
                  heading: true,
                },
              },
            },
          },
        },
        orderBy: [{ type: 'asc' }, { orderIndex: 'asc' }],
      });

      // Build hierarchical structure
      const epics = workItems
        .filter((wi) => wi.type === 'epic')
        .map((epic) => ({
          ...epic,
          children: workItems
            .filter((wi) => wi.type === 'feature' && wi.parentId === epic.id)
            .map((feature) => ({
              ...feature,
              children: workItems.filter(
                (wi) => wi.type === 'story' && wi.parentId === feature.id
              ),
            })),
        }));

      return {
        data: {
          flat: workItems,
          hierarchical: epics,
        },
        meta: {
          total: workItems.length,
          epics: workItems.filter((wi) => wi.type === 'epic').length,
          features: workItems.filter((wi) => wi.type === 'feature').length,
          stories: workItems.filter((wi) => wi.type === 'story').length,
          specStatus: spec.status,
        },
      };
    }
  );
}
