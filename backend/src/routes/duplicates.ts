import { FastifyInstance } from 'fastify';
import { duplicateDetectionService, DuplicatePair } from '../services/DuplicateDetectionService';
import { prisma } from '../lib/prisma.js';

interface SpecParams {
  specId: string;
}

interface MatchParams {
  matchId: string;
}

interface AnalyzePairBody {
  pair: DuplicatePair;
}

interface MergeBody {
  item1Id: string;
  item2Id: string;
  mergedData: {
    title: string;
    description: string;
    acceptanceCriteria: string[];
  };
}

export async function duplicateRoutes(fastify: FastifyInstance) {
  // Detect duplicates in a spec
  fastify.get<{ Params: SpecParams }>(
    '/api/specs/:specId/duplicates',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { specId } = request.params;

      try {
        const report = await duplicateDetectionService.detectDuplicates(specId);
        return reply.send({ data: report });
      } catch (error) {
        console.error('Duplicate detection failed:', error);
        return reply.status(500).send({
          error: {
            code: 'DUPLICATE_DETECTION_ERROR',
            message: 'Failed to detect duplicates',
          },
        });
      }
    }
  );

  // Analyze a specific pair with AI
  fastify.post<{ Params: SpecParams; Body: AnalyzePairBody }>(
    '/api/specs/:specId/duplicates/analyze',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { pair } = request.body;

      try {
        const analysis = await duplicateDetectionService.analyzeWithAI(pair);
        return reply.send({ data: analysis });
      } catch (error) {
        console.error('Pair analysis failed:', error);
        return reply.status(500).send({
          error: {
            code: 'PAIR_ANALYSIS_ERROR',
            message: 'Failed to analyze pair',
          },
        });
      }
    }
  );

  // Merge two duplicate items (with full merged data)
  fastify.post<{ Body: MergeBody }>(
    '/api/duplicates/merge',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { item1Id, item2Id, mergedData } = request.body;

      if (!item1Id || !item2Id || !mergedData) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_REQUEST',
            message: 'item1Id, item2Id, and mergedData are required',
          },
        });
      }

      try {
        const resultId = await duplicateDetectionService.mergeItems(item1Id, item2Id, mergedData);
        return reply.send({
          data: {
            mergedItemId: resultId,
            deletedItemId: item2Id,
          },
        });
      } catch (error) {
        console.error('Merge failed:', error);
        return reply.status(500).send({
          error: {
            code: 'MERGE_ERROR',
            message: error instanceof Error ? error.message : 'Failed to merge items',
          },
        });
      }
    }
  );

  // Ignore a duplicate match (mark as not a duplicate)
  fastify.post<{ Params: MatchParams }>(
    '/api/duplicates/:matchId/ignore',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { matchId } = request.params;

      try {
        const match = await prisma.duplicateMatch.update({
          where: { id: matchId },
          data: {
            status: 'ignored',
            reviewedAt: new Date(),
            reviewedBy: request.user.id,
          },
        });

        return reply.send({ data: { success: true, match } });
      } catch (error) {
        console.error('Ignore failed:', error);
        return reply.status(500).send({
          error: {
            code: 'IGNORE_ERROR',
            message: 'Failed to ignore duplicate match',
          },
        });
      }
    }
  );

  // Get pending duplicates for a project
  fastify.get<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/duplicates',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { projectId } = request.params;

      try {
        const matches = await prisma.duplicateMatch.findMany({
          where: { projectId, status: 'pending' },
          include: {
            sourceWorkItem: {
              select: { id: true, title: true, description: true, acceptanceCriteria: true },
            },
            targetWorkItem: {
              select: { id: true, title: true, description: true, acceptanceCriteria: true },
            },
          },
          orderBy: { similarityScore: 'desc' },
        });

        return reply.send({ data: matches });
      } catch (error) {
        console.error('Failed to get duplicates:', error);
        return reply.status(500).send({
          error: {
            code: 'FETCH_ERROR',
            message: 'Failed to fetch duplicate matches',
          },
        });
      }
    }
  );
}
