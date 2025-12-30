import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getEstimationService, type Confidence } from '../services/EstimationService.js';

interface EstimateBatchBody {
  overwriteExisting?: boolean;
  minConfidence?: Confidence;
}

interface UndoBatchBody {
  undoToken: string;
}

export async function estimateRoutes(fastify: FastifyInstance): Promise<void> {
  const estimationService = getEstimationService();

  // Estimate a single work item
  fastify.post(
    '/api/workitems/:id/estimate',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as Record<string, string>;

      try {
        const result = await estimationService.estimateSingle(id);
        return reply.send({ data: result });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Estimation failed';

        if (message.includes('not found')) {
          return reply.status(404).send({
            error: {
              code: 'NOT_FOUND',
              message: 'Work item not found',
            },
          });
        }

        return reply.status(500).send({
          error: {
            code: 'ESTIMATION_ERROR',
            message,
          },
        });
      }
    }
  );

  // Batch estimate all stories in a spec
  fastify.post(
    '/api/specs/:specId/estimate-all',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { specId } = request.params as Record<string, string>;
      const body = (request.body || {}) as EstimateBatchBody;
      const { overwriteExisting, minConfidence } = body;

      try {
        const result = await estimationService.estimateBatch(specId, {
          overwriteExisting,
          minConfidence,
        });
        return reply.send({ data: result });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Batch estimation failed';

        return reply.status(500).send({
          error: {
            code: 'BATCH_ESTIMATION_ERROR',
            message,
          },
        });
      }
    }
  );

  // Undo batch estimation
  fastify.post(
    '/api/specs/:specId/estimate-undo',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { undoToken } = (request.body || {}) as UndoBatchBody;

      if (!undoToken) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'undoToken is required',
          },
        });
      }

      try {
        const result = await estimationService.undoBatch(undoToken);
        return reply.send({ data: result });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Undo failed';

        if (message.includes('not found') || message.includes('expired')) {
          return reply.status(404).send({
            error: {
              code: 'TOKEN_NOT_FOUND',
              message,
            },
          });
        }

        return reply.status(500).send({
          error: {
            code: 'UNDO_ERROR',
            message,
          },
        });
      }
    }
  );
}
