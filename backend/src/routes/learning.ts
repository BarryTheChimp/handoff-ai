import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { EditField } from '@prisma/client';
import { getLearningService } from '../services/LearningService.js';
import type { SafeUser } from '../config/users.js';

// =============================================================================
// REQUEST BODIES
// =============================================================================

interface TrackEditBody {
  workItemId: string;
  field: EditField;
  beforeValue: string;
  afterValue: string;
}

// =============================================================================
// ROUTES
// =============================================================================

export async function learningRoutes(fastify: FastifyInstance): Promise<void> {
  const learningService = getLearningService();

  // =========================================================================
  // EDIT TRACKING
  // =========================================================================

  // Track an edit to a work item
  fastify.post(
    '/api/workitems/:workItemId/edits',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workItemId } = request.params as Record<string, string>;
      const body = (request.body || {}) as TrackEditBody;
      const userId = (request.user as SafeUser).id;

      // Validation
      if (!body.field) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Field is required' },
        });
      }

      if (body.beforeValue === undefined || body.afterValue === undefined) {
        return reply.status(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Before and after values are required' },
        });
      }

      try {
        const edit = await learningService.trackEdit({
          workItemId,
          field: body.field,
          beforeValue: body.beforeValue,
          afterValue: body.afterValue,
          userId,
        });

        return reply.status(201).send({ data: edit });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to track edit';

        if (message === 'No actual change detected') {
          return reply.status(400).send({
            error: { code: 'NO_CHANGE', message },
          });
        }

        if (message === 'Work item not found') {
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message },
          });
        }

        return reply.status(500).send({
          error: { code: 'TRACK_FAILED', message },
        });
      }
    }
  );

  // Get edits for a work item
  fastify.get(
    '/api/workitems/:workItemId/edits',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { workItemId } = request.params as Record<string, string>;

      const edits = await learningService.getEditsForWorkItem(workItemId);

      return reply.send({ data: edits });
    }
  );

  // =========================================================================
  // PATTERN MANAGEMENT
  // =========================================================================

  // Get pending patterns for a project
  fastify.get(
    '/api/projects/:projectId/learning/patterns',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId } = request.params as Record<string, string>;

      const patterns = await learningService.getPendingPatterns(projectId);

      return reply.send({ data: patterns });
    }
  );

  // Manually trigger pattern detection
  fastify.post(
    '/api/projects/:projectId/learning/detect',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId } = request.params as Record<string, string>;

      const patterns = await learningService.detectPatterns(projectId);

      return reply.send({
        data: {
          detected: patterns.length,
          patterns: patterns.slice(0, 5), // Return top 5
        },
      });
    }
  );

  // Accept a pattern
  fastify.post(
    '/api/projects/:projectId/learning/patterns/:patternId/accept',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { patternId } = request.params as Record<string, string>;
      const userId = (request.user as SafeUser).id;

      try {
        const pattern = await learningService.acceptPattern(patternId, userId);
        return reply.send({ data: pattern });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to accept pattern';

        if (message === 'Pattern not found') {
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message },
          });
        }

        return reply.status(500).send({
          error: { code: 'ACCEPT_FAILED', message },
        });
      }
    }
  );

  // Dismiss a pattern
  fastify.post(
    '/api/projects/:projectId/learning/patterns/:patternId/dismiss',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { patternId } = request.params as Record<string, string>;
      const userId = (request.user as SafeUser).id;

      try {
        const pattern = await learningService.dismissPattern(patternId, userId);
        return reply.send({ data: pattern });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to dismiss pattern';
        return reply.status(500).send({
          error: { code: 'DISMISS_FAILED', message },
        });
      }
    }
  );

  // =========================================================================
  // STATS
  // =========================================================================

  // Get learning statistics
  fastify.get(
    '/api/projects/:projectId/learning/stats',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId } = request.params as Record<string, string>;

      const stats = await learningService.getLearningStats(projectId);

      return reply.send({ data: stats });
    }
  );

  // Get edits for a project
  fastify.get(
    '/api/projects/:projectId/learning/edits',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId } = request.params as Record<string, string>;
      const { days } = request.query as { days?: string };

      const edits = await learningService.getEditsForProject(
        projectId,
        days ? parseInt(days, 10) : 7
      );

      return reply.send({ data: edits });
    }
  );
}
