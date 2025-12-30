import { FastifyInstance } from 'fastify';
import { historyService } from '../services/HistoryService.js';

interface WorkItemIdParams {
  id: string;
}

interface SpecIdParams {
  specId: string;
}

export async function historyRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/workitems/:id/history
   * Get history for a specific work item
   */
  app.get<{ Params: WorkItemIdParams; Querystring: { limit?: string } }>(
    '/api/workitems/:id/history',
    {
      onRequest: [app.authenticate],
    },
    async (request, _reply) => {
      const { id } = request.params;
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;

      const history = await historyService.getWorkItemHistory(id, limit);

      return { data: history };
    }
  );

  /**
   * GET /api/specs/:specId/history
   * Get history for all work items in a spec
   */
  app.get<{ Params: SpecIdParams; Querystring: { limit?: string } }>(
    '/api/specs/:specId/history',
    {
      onRequest: [app.authenticate],
    },
    async (request, _reply) => {
      const { specId } = request.params;
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 100;

      const history = await historyService.getSpecHistory(specId, limit);

      return { data: history };
    }
  );

  /**
   * POST /api/workitems/:id/undo
   * Undo the last change to a work item
   */
  app.post<{ Params: WorkItemIdParams }>(
    '/api/workitems/:id/undo',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;

      const result = await historyService.undoLastChange(id);

      if (!result.success) {
        return reply.status(400).send({
          error: {
            code: 'UNDO_FAILED',
            message: result.message || 'Failed to undo',
          },
        });
      }

      return { data: result.restoredItem };
    }
  );
}
