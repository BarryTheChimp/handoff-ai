import { FastifyInstance, FastifyRequest } from 'fastify';
import { investScoreService, calculateInvestScore } from '../services/InvestScoreService.js';
import { prisma } from '../lib/prisma.js';

interface WorkItemParams {
  id: string;
}

interface SpecParams {
  specId: string;
}

export async function investRoutes(fastify: FastifyInstance) {
  // Get INVEST score for a work item
  fastify.get<{ Params: WorkItemParams }>(
    '/api/workitems/:id/invest-score',
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

  // Batch score all stories in a spec
  fastify.post<{ Params: SpecParams }>(
    '/api/specs/:specId/quality/batch',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: SpecParams }>, reply) => {
      const { specId } = request.params;

      // Get all stories for this spec
      const stories = await prisma.workItem.findMany({
        where: { specId, type: 'story' },
      });

      if (stories.length === 0) {
        return reply.send({
          data: { scored: 0, averageScore: 0, scores: [] },
        });
      }

      // Score each story
      const scores = await Promise.all(
        stories.map(async (story) => {
          // Get siblings for independence check
          let siblings: { id: string; type: string; title: string; description: string | null; acceptanceCriteria: string | null; technicalNotes: string | null; sizeEstimate: string | null; parentId: string | null; dependsOnIds: string[] }[] = [];
          if (story.parentId) {
            const siblingItems = await prisma.workItem.findMany({
              where: { parentId: story.parentId, id: { not: story.id } },
            });
            siblings = siblingItems.map((s) => ({
              id: s.id,
              type: s.type,
              title: s.title,
              description: s.description,
              acceptanceCriteria: s.acceptanceCriteria,
              technicalNotes: s.technicalNotes,
              sizeEstimate: s.sizeEstimate,
              parentId: s.parentId,
              dependsOnIds: (s.dependsOnIds as string[]) || [],
            }));
          }

          const score = calculateInvestScore(
            {
              id: story.id,
              type: story.type,
              title: story.title,
              description: story.description,
              acceptanceCriteria: story.acceptanceCriteria,
              technicalNotes: story.technicalNotes,
              sizeEstimate: story.sizeEstimate,
              parentId: story.parentId,
              dependsOnIds: (story.dependsOnIds as string[]) || [],
            },
            siblings
          );

          return {
            workItemId: story.id,
            title: story.title,
            ...score,
          };
        })
      );

      const averageScore = Math.round(
        scores.reduce((sum, s) => sum + s.overall, 0) / scores.length
      );

      return reply.send({
        data: {
          scored: scores.length,
          averageScore,
          scores,
        },
      });
    }
  );

  // Get quality summary for a spec
  fastify.get<{ Params: SpecParams }>(
    '/api/specs/:specId/quality/summary',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Params: SpecParams }>, reply) => {
      const { specId } = request.params;

      // Get all stories with scores
      const stories = await prisma.workItem.findMany({
        where: { specId, type: 'story' },
      });

      if (stories.length === 0) {
        return reply.send({
          data: {
            averageScore: 0,
            distribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
            lowestScoring: [],
            suggestions: [],
          },
        });
      }

      // Calculate scores for all stories
      const scoredStories = await Promise.all(
        stories.map(async (story) => {
          let siblings: { id: string; type: string; title: string; description: string | null; acceptanceCriteria: string | null; technicalNotes: string | null; sizeEstimate: string | null; parentId: string | null; dependsOnIds: string[] }[] = [];
          if (story.parentId) {
            const siblingItems = await prisma.workItem.findMany({
              where: { parentId: story.parentId, id: { not: story.id } },
            });
            siblings = siblingItems.map((s) => ({
              id: s.id,
              type: s.type,
              title: s.title,
              description: s.description,
              acceptanceCriteria: s.acceptanceCriteria,
              technicalNotes: s.technicalNotes,
              sizeEstimate: s.sizeEstimate,
              parentId: s.parentId,
              dependsOnIds: (s.dependsOnIds as string[]) || [],
            }));
          }

          const score = calculateInvestScore(
            {
              id: story.id,
              type: story.type,
              title: story.title,
              description: story.description,
              acceptanceCriteria: story.acceptanceCriteria,
              technicalNotes: story.technicalNotes,
              sizeEstimate: story.sizeEstimate,
              parentId: story.parentId,
              dependsOnIds: (story.dependsOnIds as string[]) || [],
            },
            siblings
          );

          return { ...story, investScore: score };
        })
      );

      const scores = scoredStories.map((s) => s.investScore.overall);
      const averageScore = Math.round(
        scores.reduce((a, b) => a + b, 0) / scores.length
      );

      // Calculate distribution
      const distribution = {
        excellent: scores.filter((s) => s >= 80).length,
        good: scores.filter((s) => s >= 60 && s < 80).length,
        fair: scores.filter((s) => s >= 40 && s < 60).length,
        poor: scores.filter((s) => s < 40).length,
      };

      // Get lowest scoring stories
      const lowestScoring = scoredStories
        .sort((a, b) => a.investScore.overall - b.investScore.overall)
        .slice(0, 5)
        .map((s) => ({
          id: s.id,
          title: s.title,
          score: s.investScore.overall,
        }));

      // Aggregate suggestions
      const allSuggestions = scoredStories.flatMap((s) => s.investScore.suggestions);
      const suggestionCounts = new Map<string, number>();
      allSuggestions.forEach((s) =>
        suggestionCounts.set(s, (suggestionCounts.get(s) || 0) + 1)
      );
      const topSuggestions = Array.from(suggestionCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([suggestion]) => suggestion);

      return reply.send({
        data: {
          averageScore,
          distribution,
          lowestScoring,
          suggestions: topSuggestions,
        },
      });
    }
  );
}
