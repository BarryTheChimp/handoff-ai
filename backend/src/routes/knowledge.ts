import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { DocumentType, ACFormat, Verbosity, TechnicalDepth } from '@prisma/client';
import { getKnowledgeService, type CreateGlossaryTermInput, type UpdateGlossaryTermInput, type UpdatePreferencesConfigInput } from '../services/KnowledgeService.js';
import { getContextBuilder } from '../services/ContextBuilder.js';
import { storageService } from '../services/StorageService.js';
import type { SafeUser } from '../services/AuthService.js';

// =============================================================================
// REQUEST BODIES
// =============================================================================

interface UpdateBriefBody {
  brief: string;
}

interface CreateGlossaryTermBody {
  term: string;
  definition: string;
  aliases?: string[];
  category?: string;
  useInstead?: string;
  avoidTerms?: string[];
}

interface UpdateGlossaryTermBody {
  term?: string;
  definition?: string;
  aliases?: string[];
  category?: string | null;
  useInstead?: string | null;
  avoidTerms?: string[];
}

interface BulkImportGlossaryBody {
  terms: CreateGlossaryTermBody[];
}

interface UpdatePreferencesConfigBody {
  acFormat?: ACFormat;
  requiredSections?: string[];
  maxAcCount?: number;
  verbosity?: Verbosity;
  technicalDepth?: TechnicalDepth;
  customPrefs?: unknown[];
}

interface UpdateReferenceDocBody {
  name?: string;
  docType?: DocumentType;
  isActive?: boolean;
}

interface ContextPreviewBody {
  specContent: string;
  maxTokens?: number;
}

// =============================================================================
// ROUTES
// =============================================================================

export async function knowledgeRoutes(fastify: FastifyInstance): Promise<void> {
  const knowledgeService = getKnowledgeService();

  // =========================================================================
  // PROJECT BRIEF
  // =========================================================================

  // Get project brief
  fastify.get(
    '/api/projects/:projectId/knowledge/brief',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId } = request.params as Record<string, string>;

      const brief = await knowledgeService.getBrief(projectId);

      return reply.send({
        data: brief || { projectId, brief: null, briefUpdatedAt: null },
      });
    }
  );

  // Update project brief
  fastify.put(
    '/api/projects/:projectId/knowledge/brief',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId } = request.params as Record<string, string>;
      const body = (request.body || {}) as UpdateBriefBody;

      if (body.brief === undefined || body.brief === null) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Brief content is required' },
        });
      }

      if (body.brief.length > 50000) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Brief cannot exceed 50,000 characters' },
        });
      }

      const updated = await knowledgeService.updateBrief(projectId, body.brief);

      return reply.send({ data: updated });
    }
  );

  // =========================================================================
  // GLOSSARY TERMS
  // =========================================================================

  // List glossary terms
  fastify.get(
    '/api/projects/:projectId/glossary',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId } = request.params as Record<string, string>;
      const { category } = request.query as { category?: string };

      const terms = await knowledgeService.listGlossaryTerms(projectId, category);

      return reply.send({ data: terms });
    }
  );

  // Create glossary term
  fastify.post(
    '/api/projects/:projectId/glossary',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId } = request.params as Record<string, string>;
      const body = (request.body || {}) as CreateGlossaryTermBody;

      // Validation
      if (!body.term || body.term.trim() === '') {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Term is required' },
        });
      }

      if (!body.definition || body.definition.trim() === '') {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Definition is required' },
        });
      }

      if (body.term.length > 100) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Term cannot exceed 100 characters' },
        });
      }

      try {
        const input: CreateGlossaryTermInput = {
          term: body.term.trim(),
          definition: body.definition,
          aliases: body.aliases,
          category: body.category,
          useInstead: body.useInstead,
          avoidTerms: body.avoidTerms,
        };

        const term = await knowledgeService.createGlossaryTerm(projectId, input);

        return reply.status(201).send({ data: term });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create term';

        if (message.includes('Unique constraint')) {
          return reply.status(400).send({
            error: { code: 'DUPLICATE_TERM', message: 'This term already exists in the glossary' },
          });
        }

        return reply.status(400).send({
          error: { code: 'CREATE_FAILED', message },
        });
      }
    }
  );

  // Update glossary term
  fastify.put(
    '/api/projects/:projectId/glossary/:termId',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { termId } = request.params as Record<string, string>;
      const body = (request.body || {}) as UpdateGlossaryTermBody;

      if (body.term !== undefined && body.term.trim() === '') {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Term cannot be empty' },
        });
      }

      try {
        const input: UpdateGlossaryTermInput = {};
        if (body.term !== undefined) input.term = body.term;
        if (body.definition !== undefined) input.definition = body.definition;
        if (body.aliases !== undefined) input.aliases = body.aliases;
        if (body.category !== undefined) input.category = body.category;
        if (body.useInstead !== undefined) input.useInstead = body.useInstead;
        if (body.avoidTerms !== undefined) input.avoidTerms = body.avoidTerms;

        const term = await knowledgeService.updateGlossaryTerm(termId, input);

        return reply.send({ data: term });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update term';

        if (message.includes('not found')) {
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message: 'Term not found' },
          });
        }

        return reply.status(400).send({
          error: { code: 'UPDATE_FAILED', message },
        });
      }
    }
  );

  // Delete glossary term
  fastify.delete(
    '/api/projects/:projectId/glossary/:termId',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { termId } = request.params as Record<string, string>;

      try {
        await knowledgeService.deleteGlossaryTerm(termId);
        return reply.status(204).send();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete term';
        return reply.status(500).send({
          error: { code: 'DELETE_FAILED', message },
        });
      }
    }
  );

  // Bulk import glossary terms
  fastify.post(
    '/api/projects/:projectId/glossary/bulk',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId } = request.params as Record<string, string>;
      const body = (request.body || {}) as BulkImportGlossaryBody;

      if (!body.terms || !Array.isArray(body.terms)) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Terms array is required' },
        });
      }

      if (body.terms.length > 500) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Maximum 500 terms per import' },
        });
      }

      // Validate each term
      for (let i = 0; i < body.terms.length; i++) {
        const term = body.terms[i];
        if (!term.term || !term.definition) {
          return reply.status(400).send({
            error: { code: 'VALIDATION_ERROR', message: `Term at index ${i} must have term and definition` },
          });
        }
      }

      const result = await knowledgeService.bulkImportGlossary(projectId, body.terms);

      return reply.send({
        data: result,
        message: `Imported ${result.imported} terms, skipped ${result.skipped} duplicates`,
      });
    }
  );

  // =========================================================================
  // REFERENCE DOCUMENTS
  // =========================================================================

  // List reference documents
  fastify.get(
    '/api/projects/:projectId/reference-docs',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId } = request.params as Record<string, string>;

      const docs = await knowledgeService.listReferenceDocuments(projectId);

      return reply.send({ data: docs });
    }
  );

  // Upload reference document
  fastify.post(
    '/api/projects/:projectId/reference-docs',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId } = request.params as Record<string, string>;

      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'File is required' },
        });
      }

      // Get name and docType from fields
      const fields = data.fields as Record<string, { value?: string }>;
      const name = fields.name?.value || data.filename;
      const docType = (fields.docType?.value || 'other') as DocumentType;

      // Save file
      const fileBuffer = await data.toBuffer();
      // Generate a unique ID for the document
      const docId = crypto.randomUUID();
      const filePath = await storageService.save(docId, data.filename, fileBuffer);

      // Create record
      const doc = await knowledgeService.createReferenceDocument(projectId, {
        name,
        fileName: data.filename,
        filePath,
        fileType: data.mimetype || 'application/octet-stream',
        fileSize: fileBuffer.length,
        docType,
        uploadedBy: (request.user as SafeUser).id,
      });

      return reply.status(201).send({ data: doc });
    }
  );

  // Get reference document
  fastify.get(
    '/api/projects/:projectId/reference-docs/:docId',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { docId } = request.params as Record<string, string>;

      const doc = await knowledgeService.getReferenceDocument(docId);

      if (!doc) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Document not found' },
        });
      }

      return reply.send({ data: doc });
    }
  );

  // Update reference document
  fastify.patch(
    '/api/projects/:projectId/reference-docs/:docId',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { docId } = request.params as Record<string, string>;
      const body = (request.body || {}) as UpdateReferenceDocBody;

      try {
        const doc = await knowledgeService.updateReferenceDocument(docId, body);
        return reply.send({ data: doc });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update document';
        return reply.status(400).send({
          error: { code: 'UPDATE_FAILED', message },
        });
      }
    }
  );

  // Preview/download reference document
  fastify.get(
    '/api/projects/:projectId/reference-docs/:docId/preview',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { docId } = request.params as Record<string, string>;

      try {
        const doc = await knowledgeService.getReferenceDocument(docId);

        if (!doc) {
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message: 'Document not found' },
          });
        }

        const buffer = await storageService.read(doc.filePath);
        const fileName = doc.fileName;
        const ext = fileName.split('.').pop()?.toLowerCase() || '';

        // Determine content type
        const mimeTypes: Record<string, string> = {
          pdf: 'application/pdf',
          docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          md: 'text/markdown; charset=utf-8',
          markdown: 'text/markdown; charset=utf-8',
          txt: 'text/plain; charset=utf-8',
        };

        const contentType = mimeTypes[ext] || 'application/octet-stream';

        // For text files, return content directly
        if (['md', 'markdown', 'txt'].includes(ext)) {
          return reply
            .header('Content-Type', contentType)
            .send(buffer.toString('utf-8'));
        }

        // For PDF/DOCX, serve as inline
        return reply
          .header('Content-Type', contentType)
          .header('Content-Disposition', `inline; filename="${fileName}"`)
          .send(buffer);
      } catch (error) {
        console.error('Preview error:', error);
        return reply.status(410).send({
          error: { code: 'FILE_GONE', message: 'File is no longer available' },
        });
      }
    }
  );

  // Delete reference document
  fastify.delete(
    '/api/projects/:projectId/reference-docs/:docId',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { docId } = request.params as Record<string, string>;

      try {
        // Get doc to find file path
        const doc = await knowledgeService.getReferenceDocument(docId);
        if (doc) {
          // Delete file
          await storageService.delete(doc.filePath);
        }

        await knowledgeService.deleteReferenceDocument(docId);
        return reply.status(204).send();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete document';
        return reply.status(500).send({
          error: { code: 'DELETE_FAILED', message },
        });
      }
    }
  );

  // =========================================================================
  // TEAM PREFERENCES CONFIG
  // =========================================================================

  // Get preferences config
  fastify.get(
    '/api/projects/:projectId/preferences-config',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId } = request.params as Record<string, string>;

      const config = await knowledgeService.getPreferencesConfig(projectId);

      // Return defaults if not set
      if (!config) {
        return reply.send({
          data: {
            projectId,
            acFormat: 'bullets',
            requiredSections: [],
            maxAcCount: 8,
            verbosity: 'balanced',
            technicalDepth: 'moderate',
            customPrefs: [],
          },
        });
      }

      return reply.send({ data: config });
    }
  );

  // Update preferences config
  fastify.put(
    '/api/projects/:projectId/preferences-config',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId } = request.params as Record<string, string>;
      const body = (request.body || {}) as UpdatePreferencesConfigBody;

      // Validate acFormat
      if (body.acFormat && !['gherkin', 'bullets', 'checklist', 'numbered'].includes(body.acFormat)) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid AC format' },
        });
      }

      // Validate verbosity
      if (body.verbosity && !['concise', 'balanced', 'detailed'].includes(body.verbosity)) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid verbosity level' },
        });
      }

      // Validate technicalDepth
      if (body.technicalDepth && !['high_level', 'moderate', 'implementation'].includes(body.technicalDepth)) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid technical depth' },
        });
      }

      // Validate maxAcCount
      if (body.maxAcCount !== undefined && (body.maxAcCount < 1 || body.maxAcCount > 20)) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Max AC count must be between 1 and 20' },
        });
      }

      const input: UpdatePreferencesConfigInput = {};
      if (body.acFormat !== undefined) input.acFormat = body.acFormat;
      if (body.requiredSections !== undefined) input.requiredSections = body.requiredSections;
      if (body.maxAcCount !== undefined) input.maxAcCount = body.maxAcCount;
      if (body.verbosity !== undefined) input.verbosity = body.verbosity;
      if (body.technicalDepth !== undefined) input.technicalDepth = body.technicalDepth;
      if (body.customPrefs !== undefined) input.customPrefs = body.customPrefs;

      const config = await knowledgeService.updatePreferencesConfig(projectId, input);

      return reply.send({ data: config });
    }
  );

  // =========================================================================
  // CONTEXT BUILDING
  // =========================================================================

  // Get full context for AI prompts (used internally, but exposed for testing)
  fastify.get(
    '/api/projects/:projectId/knowledge/context',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId } = request.params as Record<string, string>;

      const context = await knowledgeService.buildContextForPrompt(projectId);

      return reply.send({
        data: {
          context,
          tokenEstimate: Math.ceil(context.length / 4), // Rough estimate
        },
      });
    }
  );

  // =========================================================================
  // SMART CONTEXT BUILDER
  // =========================================================================

  // Preview context for a spec (shows what context would be injected)
  fastify.post(
    '/api/projects/:projectId/context/preview',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId } = request.params as Record<string, string>;
      const body = (request.body || {}) as ContextPreviewBody;

      if (!body.specContent || body.specContent.trim() === '') {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Spec content is required for preview' },
        });
      }

      const contextBuilder = getContextBuilder();
      const result = await contextBuilder.previewContext(projectId, body.specContent);

      return reply.send({
        data: {
          contextString: result.contextString,
          tokensUsed: result.tokensUsed,
          sourcesUsed: result.sourcesUsed,
          tokenBudget: body.maxTokens || 2000,
        },
      });
    }
  );

  // Build full context for translation
  fastify.post(
    '/api/projects/:projectId/context/build',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId } = request.params as Record<string, string>;
      const body = (request.body || {}) as ContextPreviewBody;

      if (!body.specContent || body.specContent.trim() === '') {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Spec content is required' },
        });
      }

      const contextBuilder = getContextBuilder();
      const result = await contextBuilder.buildContext(
        projectId,
        body.specContent,
        { maxTokens: body.maxTokens }
      );

      return reply.send({
        data: result,
      });
    }
  );
}
