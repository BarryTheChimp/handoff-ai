import { FastifyInstance } from 'fastify';
import { storySplitService, SplitSuggestion } from '../services/StorySplitService.js';

interface WorkItemParams {
  id: string;
}

interface ExecuteSplitBody {
  suggestions: SplitSuggestion[];
}

export async function splitRoutes(fastify: FastifyInstance) {
  // Analyze if a work item should be split
  fastify.get<{ Params: WorkItemParams }>(
    '/api/workitems/:id/split-analysis',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const analysis = await storySplitService.analyzeSplit(id);
        return reply.send({ data: analysis });
      } catch (error) {
        console.error('Split analysis failed:', error);
        return reply.status(500).send({
          error: {
            code: 'SPLIT_ANALYSIS_ERROR',
            message: error instanceof Error ? error.message : 'Failed to analyze split',
          },
        });
      }
    }
  );

  // Execute an AI-suggested split
  fastify.post<{ Params: WorkItemParams; Body: ExecuteSplitBody }>(
    '/api/workitems/:id/execute-split',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const { suggestions } = request.body;

      if (!suggestions || suggestions.length === 0) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_SUGGESTIONS',
            message: 'At least one split suggestion is required',
          },
        });
      }

      try {
        const created = await storySplitService.executeSplit(id, suggestions);
        return reply.status(201).send({ data: created });
      } catch (error) {
        console.error('Split execution failed:', error);
        return reply.status(500).send({
          error: {
            code: 'SPLIT_EXECUTION_ERROR',
            message: error instanceof Error ? error.message : 'Failed to execute split',
          },
        });
      }
    }
  );

  // Get split history for a work item
  fastify.get<{ Params: WorkItemParams }>(
    '/api/workitems/:id/split-history',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const history = await storySplitService.getSplitHistory(id);
        return reply.send({ data: history });
      } catch (error) {
        console.error('Failed to get split history:', error);
        return reply.status(500).send({
          error: {
            code: 'SPLIT_HISTORY_ERROR',
            message: 'Failed to get split history',
          },
        });
      }
    }
  );

  // Check if a split can be undone
  fastify.get<{ Params: WorkItemParams }>(
    '/api/workitems/:id/can-undo-split',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const result = await storySplitService.canUndoSplit(id);
        return reply.send({ data: result });
      } catch (error) {
        console.error('Failed to check undo split:', error);
        return reply.status(500).send({
          error: {
            code: 'UNDO_CHECK_ERROR',
            message: 'Failed to check if split can be undone',
          },
        });
      }
    }
  );

  // Undo a split
  fastify.post<{ Params: WorkItemParams }>(
    '/api/workitems/:id/undo-split',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const result = await storySplitService.undoSplit(id);
        if (!result.restored) {
          return reply.status(400).send({
            error: {
              code: 'UNDO_FAILED',
              message: result.message,
            },
          });
        }
        return reply.send({ data: result });
      } catch (error) {
        console.error('Undo split failed:', error);
        return reply.status(500).send({
          error: {
            code: 'UNDO_SPLIT_ERROR',
            message: error instanceof Error ? error.message : 'Failed to undo split',
          },
        });
      }
    }
  );
}
