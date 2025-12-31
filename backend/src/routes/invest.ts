import { FastifyInstance, FastifyRequest } from 'fastify';
import { investScoreService } from '../services/InvestScoreService.js';

interface WorkItemParams {
  id: string;
}

export async function investRoutes(fastify: FastifyInstance) {
  // Get INVEST score for a work item
  fastify.get<{ Params: WorkItemParams }>(
    '/workitems/:id/invest-score',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: WorkItemParams }>, reply) => {
      try {
        const { id } = request.params;
        const score = await investScoreService.getScore(id);
        return reply.send({ data: score });
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) {
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message: error.message },
          });
        }
        throw error;
      }
    }
  );
}
