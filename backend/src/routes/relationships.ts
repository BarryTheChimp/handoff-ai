import { FastifyInstance } from 'fastify';
import { relationshipService } from '../services/RelationshipService';

interface SpecParams {
  specId: string;
}

export async function relationshipRoutes(fastify: FastifyInstance) {
  // Get relationship map for a spec
  fastify.get<{ Params: SpecParams }>(
    '/api/specs/:specId/relationships',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { specId } = request.params;

      try {
        const map = await relationshipService.getCachedRelationshipMap(specId);
        return reply.send({ data: map });
      } catch (error) {
        console.error('Failed to get relationship map:', error);
        return reply.status(500).send({
          error: {
            code: 'RELATIONSHIP_MAP_ERROR',
            message: 'Failed to generate relationship map',
          },
        });
      }
    }
  );

  // Refresh relationship map (regenerate from work items)
  fastify.post<{ Params: SpecParams }>(
    '/api/specs/:specId/relationships/refresh',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { specId } = request.params;

      try {
        const map = await relationshipService.getRelationshipMap(specId);
        return reply.send({ data: map });
      } catch (error) {
        console.error('Failed to refresh relationship map:', error);
        return reply.status(500).send({
          error: {
            code: 'RELATIONSHIP_MAP_ERROR',
            message: 'Failed to refresh relationship map',
          },
        });
      }
    }
  );

  // Get entities only
  fastify.get<{ Params: SpecParams }>(
    '/api/specs/:specId/entities',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { specId } = request.params;

      try {
        const entities = await relationshipService.extractEntities(specId);
        return reply.send({ data: entities });
      } catch (error) {
        console.error('Failed to extract entities:', error);
        return reply.status(500).send({
          error: {
            code: 'ENTITY_EXTRACTION_ERROR',
            message: 'Failed to extract entities',
          },
        });
      }
    }
  );
}
