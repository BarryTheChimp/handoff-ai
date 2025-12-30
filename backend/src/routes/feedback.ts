import type { FastifyInstance, FastifyRequest, FastifyReply, RouteShorthandOptions } from 'fastify';
import { getFeedbackService, getPreferenceService, FeedbackInput } from '../services/FeedbackService.js';

interface FeedbackBody {
  rating: number;
  feedback?: string;
  categories?: string[];
}

interface UserPayload {
  sub: string;
  id?: string;
  username?: string;
}

interface CreatePreferenceBody {
  preference: string;
  description?: string;
  category?: string;
}

interface UpdatePreferenceBody {
  active: boolean;
}

export async function feedbackRoutes(fastify: FastifyInstance): Promise<void> {
  const feedbackService = getFeedbackService();
  const preferenceService = getPreferenceService();

  // Submit feedback for a work item
  fastify.post(
    '/api/workitems/:id/feedback',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as Record<string, string>;
      const body = (request.body || {}) as FeedbackBody;
      const { rating, feedback, categories } = body;
      const user = request.user as unknown as UserPayload;
      const userId = user.sub || user.id || '';

      if (!rating || (rating !== 1 && rating !== 5)) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Rating must be 1 (thumbs down) or 5 (thumbs up)',
          },
        });
      }

      try {
        const feedbackInput: FeedbackInput = {
          rating,
          feedback,
          categories,
        };
        const result = await feedbackService.submitFeedback(id, userId, feedbackInput);
        return reply.status(201).send({ data: result });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to submit feedback';

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
            code: 'FEEDBACK_ERROR',
            message,
          },
        });
      }
    }
  );

  // Get feedback for a work item
  fastify.get(
    '/api/workitems/:id/feedback',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as Record<string, string>;
      const user = request.user as unknown as UserPayload;
      const userId = user.sub || user.id || '';

      try {
        const myFeedback = await feedbackService.getFeedbackByUser(id, userId);
        const allFeedback = await feedbackService.getFeedback(id);

        return reply.send({
          data: {
            myFeedback,
            allFeedback,
          },
        });
      } catch (error) {
        return reply.status(500).send({
          error: {
            code: 'FEEDBACK_ERROR',
            message: 'Failed to get feedback',
          },
        });
      }
    }
  );

  // List team preferences
  fastify.get(
    '/api/projects/:projectId/preferences',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId } = request.params as Record<string, string>;

      try {
        const preferences = await preferenceService.list(projectId);
        return reply.send({ data: preferences });
      } catch (error) {
        return reply.status(500).send({
          error: {
            code: 'PREFERENCES_ERROR',
            message: 'Failed to list preferences',
          },
        });
      }
    }
  );

  // Create a preference
  fastify.post(
    '/api/projects/:projectId/preferences',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId } = request.params as Record<string, string>;
      const body = (request.body || {}) as CreatePreferenceBody;
      const { preference, description, category } = body;

      if (!preference || preference.trim() === '') {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Preference text is required',
          },
        });
      }

      try {
        const result = await preferenceService.create(
          projectId,
          preference.trim(),
          description,
          category
        );
        return reply.status(201).send({ data: result });
      } catch (error) {
        return reply.status(500).send({
          error: {
            code: 'CREATE_ERROR',
            message: 'Failed to create preference',
          },
        });
      }
    }
  );

  // Update preference (toggle active)
  fastify.put(
    '/api/projects/:projectId/preferences/:id',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as Record<string, string>;
      const { active } = request.body as Record<string, unknown>;

      if (typeof active !== 'boolean') {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'active must be a boolean',
          },
        });
      }

      try {
        const result = await preferenceService.update(id, active);
        return reply.send({ data: result });
      } catch (error) {
        return reply.status(500).send({
          error: {
            code: 'UPDATE_ERROR',
            message: 'Failed to update preference',
          },
        });
      }
    }
  );

  // Delete preference
  fastify.delete(
    '/api/projects/:projectId/preferences/:id',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as Record<string, string>;

      try {
        await preferenceService.delete(id);
        return reply.status(204).send();
      } catch (error) {
        return reply.status(500).send({
          error: {
            code: 'DELETE_ERROR',
            message: 'Failed to delete preference',
          },
        });
      }
    }
  );

  // Extract preferences from feedback
  fastify.post(
    '/api/projects/:projectId/preferences/extract',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { projectId } = request.params as Record<string, string>;

      try {
        const extracted = await preferenceService.extractFromFeedback(projectId);
        return reply.send({
          data: {
            extracted: extracted.length,
            preferences: extracted,
          },
        });
      } catch (error) {
        return reply.status(500).send({
          error: {
            code: 'EXTRACTION_ERROR',
            message: 'Failed to extract preferences',
          },
        });
      }
    }
  );
}
