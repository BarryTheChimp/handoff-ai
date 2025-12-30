import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getCoverageService } from '../services/CoverageService.js';

interface UpdateCoverageStatusBody {
  intentionallyUncovered: boolean;
  reason?: string;
}

export async function coverageRoutes(fastify: FastifyInstance): Promise<void> {
  const coverageService = getCoverageService();

  // Get coverage data for a spec
  fastify.get(
    '/api/specs/:specId/coverage',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { specId } = request.params as { specId: string };

      try {
        const coverage = await coverageService.calculateCoverage(specId);
        return reply.send({ data: coverage });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to calculate coverage';

        return reply.status(500).send({
          error: {
            code: 'COVERAGE_ERROR',
            message,
          },
        });
      }
    }
  );

  // Update section coverage status
  fastify.put(
    '/api/spec-sections/:id/coverage-status',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { intentionallyUncovered, reason } = request.body as UpdateCoverageStatusBody;

      if (typeof intentionallyUncovered !== 'boolean') {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'intentionallyUncovered must be a boolean',
          },
        });
      }

      try {
        await coverageService.markSectionCovered(id, intentionallyUncovered, reason);
        return reply.send({
          data: {
            id,
            intentionallyUncovered,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update coverage status';

        if (message.includes('not found')) {
          return reply.status(404).send({
            error: {
              code: 'NOT_FOUND',
              message: 'Section not found',
            },
          });
        }

        return reply.status(500).send({
          error: {
            code: 'UPDATE_ERROR',
            message,
          },
        });
      }
    }
  );
}
