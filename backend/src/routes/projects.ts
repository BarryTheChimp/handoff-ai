import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { storageService } from '../services/StorageService.js';
import { extname } from 'path';

interface CreateProjectBody {
  name: string;
  description?: string;
  jiraProjectKey?: string;
}

// Allowed image types for project logos
const ALLOWED_LOGO_TYPES = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB

interface UpdateProjectBody {
  name?: string;
  description?: string;
  jiraProjectKey?: string;
}

interface ProjectIdParams {
  id: string;
}

export async function projectsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/projects
   * List all projects with counts
   */
  app.get(
    '/api/projects',
    {
      onRequest: [app.authenticate],
    },
    async (_request, _reply) => {
      const projects = await prisma.project.findMany({
        include: {
          _count: { select: { specs: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });

      const projectsWithCounts = await Promise.all(
        projects.map(async (project) => {
          const workItemCount = await prisma.workItem.count({
            where: { spec: { projectId: project.id } },
          });
          return {
            id: project.id,
            name: project.name,
            description: project.description,
            logoUrl: project.logoUrl,
            jiraProjectKey: project.jiraProjectKey,
            specCount: project._count.specs,
            workItemCount,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          };
        })
      );

      return { data: projectsWithCounts };
    }
  );

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
      const { name, description, jiraProjectKey } = request.body;

      if (!name?.trim()) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'name is required',
          },
        });
      }

      if (name.length > 100) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'name must be 100 characters or less',
          },
        });
      }

      if (description && description.length > 1000) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'description must be 1000 characters or less',
          },
        });
      }

      if (jiraProjectKey && !/^[A-Z0-9]{2,10}$/i.test(jiraProjectKey)) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'jiraProjectKey must be 2-10 uppercase letters/numbers',
          },
        });
      }

      const project = await prisma.project.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          jiraProjectKey: jiraProjectKey?.trim().toUpperCase() || null,
        },
      });

      return reply.status(201).send({
        data: {
          ...project,
          specCount: 0,
          workItemCount: 0,
        },
      });
    }
  );

  /**
   * GET /api/projects/:id
   * Get a specific project with details
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
        include: {
          specs: {
            select: { id: true, name: true, status: true, uploadedAt: true },
            orderBy: { uploadedAt: 'desc' },
          },
        },
      });

      if (!project) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Project not found',
          },
        });
      }

      const workItemCount = await prisma.workItem.count({
        where: { spec: { projectId: id } },
      });

      return {
        data: {
          ...project,
          specCount: project.specs.length,
          workItemCount,
        },
      };
    }
  );

  /**
   * PUT /api/projects/:id
   * Update a project
   */
  app.put<{ Params: ProjectIdParams; Body: UpdateProjectBody }>(
    '/api/projects/:id',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { name, description, jiraProjectKey } = request.body;

      const existing = await prisma.project.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Project not found',
          },
        });
      }

      if (name !== undefined && name.length > 100) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'name must be 100 characters or less',
          },
        });
      }

      if (description !== undefined && description.length > 1000) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'description must be 1000 characters or less',
          },
        });
      }

      if (jiraProjectKey !== undefined && jiraProjectKey && !/^[A-Z0-9]{2,10}$/i.test(jiraProjectKey)) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'jiraProjectKey must be 2-10 uppercase letters/numbers',
          },
        });
      }

      const project = await prisma.project.update({
        where: { id },
        data: {
          name: name?.trim() || existing.name,
          description: description !== undefined ? (description?.trim() || null) : existing.description,
          jiraProjectKey: jiraProjectKey !== undefined
            ? (jiraProjectKey?.trim().toUpperCase() || null)
            : existing.jiraProjectKey,
        },
      });

      return { data: project };
    }
  );

  /**
   * DELETE /api/projects/:id
   * Delete a project and all related data (cascade)
   */
  app.delete<{ Params: ProjectIdParams }>(
    '/api/projects/:id',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;

      const existing = await prisma.project.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Project not found',
          },
        });
      }

      // Cascade handled by Prisma schema
      await prisma.project.delete({ where: { id } });

      return reply.status(204).send();
    }
  );

  /**
   * POST /api/projects/:id/logo
   * Upload a logo for a project
   */
  app.post<{ Params: ProjectIdParams }>(
    '/api/projects/:id/logo',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;

      const project = await prisma.project.findUnique({ where: { id } });
      if (!project) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Project not found',
          },
        });
      }

      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No file provided',
          },
        });
      }

      const ext = extname(data.filename).toLowerCase();
      if (!ALLOWED_LOGO_TYPES.includes(ext)) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid file type. Allowed: ${ALLOWED_LOGO_TYPES.join(', ')}`,
          },
        });
      }

      const buffer = await data.toBuffer();
      if (buffer.length > MAX_LOGO_SIZE) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'File too large. Maximum size is 2MB.',
          },
        });
      }

      // Delete old logo if exists
      if (project.logoUrl) {
        try {
          await storageService.delete(project.logoUrl);
        } catch {
          // Ignore if old file doesn't exist
        }
      }

      // Save new logo
      const logoPath = await storageService.save(`projects/${id}`, `logo${ext}`, buffer);

      // Update project with logo URL
      const updatedProject = await prisma.project.update({
        where: { id },
        data: { logoUrl: logoPath },
      });

      return { data: { logoUrl: updatedProject.logoUrl } };
    }
  );

  /**
   * DELETE /api/projects/:id/logo
   * Remove the logo from a project
   */
  app.delete<{ Params: ProjectIdParams }>(
    '/api/projects/:id/logo',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;

      const project = await prisma.project.findUnique({ where: { id } });
      if (!project) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Project not found',
          },
        });
      }

      if (project.logoUrl) {
        try {
          await storageService.delete(project.logoUrl);
        } catch {
          // Ignore if file doesn't exist
        }
      }

      await prisma.project.update({
        where: { id },
        data: { logoUrl: null },
      });

      return reply.status(204).send();
    }
  );

  /**
   * GET /api/projects/:id/logo
   * Serve the project logo
   */
  app.get<{ Params: ProjectIdParams }>(
    '/api/projects/:id/logo',
    async (request, reply) => {
      const { id } = request.params;

      const project = await prisma.project.findUnique({
        where: { id },
        select: { id: true, logoUrl: true },
      });

      if (!project || !project.logoUrl) {
        // Return 204 No Content for missing logos (avoids CORS issues)
        return reply.status(204).send();
      }

      try {
        const buffer = await storageService.read(project.logoUrl);
        const ext = extname(project.logoUrl).toLowerCase();

        const mimeTypes: Record<string, string> = {
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.svg': 'image/svg+xml',
          '.webp': 'image/webp',
        };

        return reply
          .header('Content-Type', mimeTypes[ext] || 'application/octet-stream')
          .header('Cache-Control', 'public, max-age=31536000')
          .header('Cross-Origin-Resource-Policy', 'cross-origin')
          .send(buffer);
      } catch {
        // File missing from storage - clear the logoUrl and return 204
        await prisma.project.update({
          where: { id },
          data: { logoUrl: null },
        });
        return reply.status(204).send();
      }
    }
  );
}
