import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDependencyService } from '../services/DependencyService.js';

interface AddDependencyBody {
  dependsOnId: string;
}

export async function dependencyRoutes(fastify: FastifyInstance): Promise<void> {
  const dependencyService = getDependencyService();

  // Get dependency graph for a spec
  fastify.get(
    '/api/specs/:specId/dependencies',
    { preHandler: [fastify.authenticate] },
    async (
      request: FastifyRequest<{ Params: { specId: string } }>,
      reply: FastifyReply
    ) => {
      const { specId } = request.params;

      try {
        const graph = await dependencyService.getGraph(specId);
        return reply.send({ data: graph });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to get dependency graph';
        return reply.status(500).send({
          error: {
            code: 'DEPENDENCY_GRAPH_ERROR',
            message,
          },
        });
      }
    }
  );

  // Add a dependency to a work item
  fastify.post(
    '/api/workitems/:id/dependencies',
    { preHandler: [fastify.authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: AddDependencyBody }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const { dependsOnId } = request.body;

      if (!dependsOnId) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'dependsOnId is required',
          },
        });
      }

      try {
        await dependencyService.addDependency(id, dependsOnId);
        return reply.status(201).send({ success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add dependency';

        if (message.includes('CYCLE_DETECTED')) {
          return reply.status(400).send({
            error: {
              code: 'CYCLE_DETECTED',
              message: 'Adding this dependency would create a circular dependency',
            },
          });
        }

        if (message.includes('not found')) {
          return reply.status(404).send({
            error: {
              code: 'NOT_FOUND',
              message,
            },
          });
        }

        if (message.includes('already exists') || message.includes('self-dependency') || message.includes('different specs')) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message,
            },
          });
        }

        return reply.status(500).send({
          error: {
            code: 'ADD_DEPENDENCY_ERROR',
            message,
          },
        });
      }
    }
  );

  // Remove a dependency from a work item
  fastify.delete(
    '/api/workitems/:id/dependencies/:dependsOnId',
    { preHandler: [fastify.authenticate] },
    async (
      request: FastifyRequest<{ Params: { id: string; dependsOnId: string } }>,
      reply: FastifyReply
    ) => {
      const { id, dependsOnId } = request.params;

      try {
        await dependencyService.removeDependency(id, dependsOnId);
        return reply.status(204).send();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to remove dependency';

        if (message.includes('not found') || message.includes('does not exist')) {
          return reply.status(404).send({
            error: {
              code: 'NOT_FOUND',
              message,
            },
          });
        }

        return reply.status(500).send({
          error: {
            code: 'REMOVE_DEPENDENCY_ERROR',
            message,
          },
        });
      }
    }
  );
}
