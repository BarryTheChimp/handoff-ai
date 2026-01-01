import { FastifyInstance } from 'fastify';
import { workBreakdownService } from '../services/WorkBreakdownService';

interface ProjectParams {
  projectId: string;
}

interface SpecParams {
  specId: string;
}

export async function workBreakdownRoutes(fastify: FastifyInstance) {
  // Get work breakdown for a project
  fastify.get<{ Params: ProjectParams }>(
    '/api/projects/:projectId/work-breakdown',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { projectId } = request.params;

      try {
        const breakdown = await workBreakdownService.getWorkBreakdown(projectId);
        return reply.send({ data: breakdown });
      } catch (error) {
        console.error('Work breakdown failed:', error);
        return reply.status(500).send({
          error: {
            code: 'WORK_BREAKDOWN_ERROR',
            message: error instanceof Error ? error.message : 'Failed to get work breakdown',
          },
        });
      }
    }
  );

  // Get work breakdown for a specific spec
  fastify.get<{ Params: SpecParams }>(
    '/api/specs/:specId/work-breakdown',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { specId } = request.params;

      try {
        const breakdown = await workBreakdownService.getSpecWorkBreakdown(specId);
        return reply.send({ data: breakdown });
      } catch (error) {
        console.error('Work breakdown failed:', error);
        return reply.status(500).send({
          error: {
            code: 'WORK_BREAKDOWN_ERROR',
            message: error instanceof Error ? error.message : 'Failed to get work breakdown',
          },
        });
      }
    }
  );
}
