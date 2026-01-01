import { FastifyInstance } from 'fastify';
import { specAnalysisService } from '../services/SpecAnalysisService';

interface SpecParams {
  specId: string;
}

export async function analysisRoutes(fastify: FastifyInstance) {
  // Get pre-translation analysis for a spec
  fastify.get<{ Params: SpecParams }>(
    '/api/specs/:specId/analysis',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { specId } = request.params;

      try {
        // Try to get cached analysis first
        const cached = await specAnalysisService.getCachedAnalysis(specId);
        if (cached) {
          return reply.send({ data: cached, cached: true });
        }

        // Generate new analysis
        const analysis = await specAnalysisService.analyzeSpec(specId);
        return reply.send({ data: analysis, cached: false });
      } catch (error) {
        console.error('Analysis failed:', error);
        return reply.status(500).send({
          error: {
            code: 'ANALYSIS_ERROR',
            message: error instanceof Error ? error.message : 'Failed to analyze spec',
          },
        });
      }
    }
  );

  // Force refresh analysis
  fastify.post<{ Params: SpecParams }>(
    '/api/specs/:specId/analysis/refresh',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { specId } = request.params;

      try {
        const analysis = await specAnalysisService.analyzeSpec(specId);
        return reply.send({ data: analysis });
      } catch (error) {
        console.error('Analysis refresh failed:', error);
        return reply.status(500).send({
          error: {
            code: 'ANALYSIS_ERROR',
            message: error instanceof Error ? error.message : 'Failed to analyze spec',
          },
        });
      }
    }
  );
}
