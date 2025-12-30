import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { ContextSourceType } from '@prisma/client';
import { getContextSourceService, type CreateContextSourceInput } from '../services/ContextSourceService.js';

// =============================================================================
// REQUEST BODIES
// =============================================================================

interface CreateSourceBody {
  sourceType: ContextSourceType;
  name: string;
  config?: Record<string, unknown>;
}

interface UpdateSourceBody {
  name?: string;
  config?: Record<string, unknown>;
  isEnabled?: boolean;
}

interface SearchQuery {
  q: string;
  sources?: string;
  limit?: string;
}

// =============================================================================
// ROUTES
// =============================================================================

export async function contextSourceRoutes(fastify: FastifyInstance): Promise<void> {
  const contextSourceService = getContextSourceService();

  // =========================================================================
  // CONTEXT SOURCES
  // =========================================================================

  // List context sources
  fastify.get(
    '/api/projects/:projectId/context-sources',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId } = request.params as Record<string, string>;

      // Ensure default sources exist
      await contextSourceService.ensureDefaultSources(projectId);

      const sources = await contextSourceService.listSources(projectId);

      return reply.send({ data: sources });
    }
  );

  // Create context source
  fastify.post(
    '/api/projects/:projectId/context-sources',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId } = request.params as Record<string, string>;
      const body = (request.body || {}) as CreateSourceBody;

      // Validation
      if (!body.sourceType) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Source type is required' },
        });
      }

      if (!body.name || body.name.trim() === '') {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Source name is required' },
        });
      }

      const validTypes: ContextSourceType[] = ['specs', 'jira', 'document', 'confluence', 'github'];
      if (!validTypes.includes(body.sourceType)) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid source type' },
        });
      }

      const input: CreateContextSourceInput = {
        sourceType: body.sourceType,
        name: body.name.trim(),
        config: body.config,
      };

      const source = await contextSourceService.createSource(projectId, input);

      return reply.status(201).send({ data: source });
    }
  );

  // Get context source
  fastify.get(
    '/api/projects/:projectId/context-sources/:sourceId',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { sourceId } = request.params as Record<string, string>;

      const source = await contextSourceService.getSource(sourceId);

      if (!source) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Context source not found' },
        });
      }

      return reply.send({ data: source });
    }
  );

  // Update context source
  fastify.put(
    '/api/projects/:projectId/context-sources/:sourceId',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { sourceId } = request.params as Record<string, string>;
      const body = (request.body || {}) as UpdateSourceBody;

      try {
        const source = await contextSourceService.updateSource(sourceId, body);
        return reply.send({ data: source });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Update failed';
        return reply.status(400).send({
          error: { code: 'UPDATE_FAILED', message },
        });
      }
    }
  );

  // Delete context source
  fastify.delete(
    '/api/projects/:projectId/context-sources/:sourceId',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { sourceId } = request.params as Record<string, string>;

      try {
        await contextSourceService.deleteSource(sourceId);
        return reply.status(204).send();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Delete failed';
        return reply.status(500).send({
          error: { code: 'DELETE_FAILED', message },
        });
      }
    }
  );

  // Toggle context source enabled/disabled
  fastify.post(
    '/api/projects/:projectId/context-sources/:sourceId/toggle',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { sourceId } = request.params as Record<string, string>;
      const body = (request.body || {}) as { isEnabled: boolean };

      if (body.isEnabled === undefined) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'isEnabled is required' },
        });
      }

      const source = await contextSourceService.toggleSource(sourceId, body.isEnabled);
      return reply.send({ data: source });
    }
  );

  // Sync context source
  fastify.post(
    '/api/projects/:projectId/context-sources/:sourceId/sync',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId, sourceId } = request.params as Record<string, string>;

      const source = await contextSourceService.getSource(sourceId);
      if (!source) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Context source not found' },
        });
      }

      try {
        let result: { synced: number };

        switch (source.sourceType) {
          case 'specs':
            result = await contextSourceService.syncSpecsSource(projectId);
            break;
          case 'document':
            result = await contextSourceService.syncDocumentsSource(projectId);
            break;
          case 'jira':
            // Jira sync would require OAuth connection - placeholder for now
            result = { synced: 0 };
            break;
          default:
            return reply.status(400).send({
              error: { code: 'UNSUPPORTED', message: `Sync not supported for ${source.sourceType}` },
            });
        }

        return reply.send({
          data: {
            synced: result.synced,
            message: `Synced ${result.synced} items`,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Sync failed';
        await contextSourceService.updateSourceSyncStatus(sourceId, { itemCount: 0, error: message });
        return reply.status(500).send({
          error: { code: 'SYNC_FAILED', message },
        });
      }
    }
  );

  // =========================================================================
  // CONTEXT SEARCH
  // =========================================================================

  // Search across context sources
  fastify.get(
    '/api/projects/:projectId/context-search',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId } = request.params as Record<string, string>;
      const query = request.query as SearchQuery;

      if (!query.q || query.q.trim() === '') {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Search query (q) is required' },
        });
      }

      const sourceTypes = query.sources
        ? query.sources.split(',').filter(Boolean) as ContextSourceType[]
        : undefined;

      const limit = query.limit ? parseInt(query.limit, 10) : 10;

      const results = await contextSourceService.searchContext(projectId, query.q.trim(), {
        sourceTypes,
        limit: Math.min(limit, 50),
      });

      return reply.send({ data: results });
    }
  );

  // =========================================================================
  // CONTEXT CHUNKS (for debugging/admin)
  // =========================================================================

  // Get chunks for a source
  fastify.get(
    '/api/projects/:projectId/context-sources/:sourceId/chunks',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { sourceId } = request.params as Record<string, string>;

      const source = await contextSourceService.getSource(sourceId);
      if (!source) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Context source not found' },
        });
      }

      const chunks = await contextSourceService.getChunksBySource(sourceId, source.sourceType);

      return reply.send({ data: chunks });
    }
  );
}
