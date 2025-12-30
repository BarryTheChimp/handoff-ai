import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getHealthScoreService } from '../services/HealthScoreService.js';

// =============================================================================
// ROUTES
// =============================================================================

export async function projectHealthRoutes(fastify: FastifyInstance): Promise<void> {
  const healthService = getHealthScoreService();

  // =========================================================================
  // HEALTH SCORE
  // =========================================================================

  // Get health score for a project
  fastify.get(
    '/api/projects/:projectId/health',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId } = request.params as Record<string, string>;

      // Try to get cached health first
      let health = await healthService.getHealth(projectId);

      // If no cached health, calculate it
      if (!health) {
        health = await healthService.calculateHealth(projectId);
      }

      return reply.send({ data: health });
    }
  );

  // Force recalculate health score
  fastify.post(
    '/api/projects/:projectId/health/recalculate',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId } = request.params as Record<string, string>;

      const health = await healthService.recalculateHealth(projectId);

      return reply.send({ data: health });
    }
  );
}
