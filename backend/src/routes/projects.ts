import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';

interface CreateProjectBody {
  name: string;
  jiraProjectKey?: string;
}

interface ProjectIdParams {
  id: string;
}

export async function projectsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/projects
   * Create a new project
   */
  app.post<{ Body: CreateProjectBody }>(
    '/api/projects',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { name, jiraProjectKey } = request.body;

      if (!name || typeof name !== 'string') {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'name is required',
          },
        });
      }

      const project = await prisma.project.create({
        data: {
          name,
          jiraProjectKey: jiraProjectKey ?? null,
        },
      });

      return reply.status(201).send({ data: project });
    }
  );

  /**
   * GET /api/projects
   * List all projects
   */
  app.get(
    '/api/projects',
    {
      onRequest: [app.authenticate],
    },
    async (_request, _reply) => {
      const projects = await prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return { data: projects };
    }
  );

  /**
   * GET /api/projects/:id
   * Get a specific project
   */
  app.get<{ Params: ProjectIdParams }>(
    '/api/projects/:id',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;

      const project = await prisma.project.findUnique({
        where: { id },
      });

      if (!project) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Project not found',
          },
        });
      }

      return { data: project };
    }
  );
}
