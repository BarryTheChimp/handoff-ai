import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getTemplateService, type CreateTemplateInput, type UpdateTemplateInput, type ACFormat, type CustomFieldDefinition } from '../services/TemplateService.js';

interface CreateBody {
  name: string;
  acFormat?: ACFormat;
  requiredSections?: string[];
  customFields?: CustomFieldDefinition[];
  isDefault?: boolean;
}

interface UpdateBody {
  name?: string;
  acFormat?: ACFormat;
  requiredSections?: string[];
  customFields?: CustomFieldDefinition[];
}

export async function templateRoutes(fastify: FastifyInstance): Promise<void> {
  const templateService = getTemplateService();

  // List templates for a project
  fastify.get(
    '/api/projects/:projectId/templates',
    { preHandler: [fastify.authenticate] },
    async (
      request: FastifyRequest<{ Params: { projectId: string } }>,
      reply: FastifyReply
    ) => {
      const { projectId } = request.params;

      const templates = await templateService.list(projectId);

      return reply.send({ data: templates });
    }
  );

  // Get default template for a project
  fastify.get(
    '/api/projects/:projectId/templates/default',
    { preHandler: [fastify.authenticate] },
    async (
      request: FastifyRequest<{ Params: { projectId: string } }>,
      reply: FastifyReply
    ) => {
      const { projectId } = request.params;

      const template = await templateService.getDefault(projectId);

      if (!template) {
        return reply.status(404).send({
          error: {
            code: 'NO_DEFAULT_TEMPLATE',
            message: 'No default template set for this project',
          },
        });
      }

      return reply.send({ data: template });
    }
  );

  // Create template
  fastify.post(
    '/api/projects/:projectId/templates',
    { preHandler: [fastify.authenticate] },
    async (
      request: FastifyRequest<{ Params: { projectId: string }; Body: CreateBody }>,
      reply: FastifyReply
    ) => {
      const { projectId } = request.params;
      const body = request.body;

      // Validation
      if (!body.name || body.name.trim() === '') {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Template name is required',
          },
        });
      }

      if (body.name.length > 100) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Template name must be 100 characters or less',
          },
        });
      }

      if (body.acFormat && !['gherkin', 'bullets', 'checklist'].includes(body.acFormat)) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid AC format. Must be: gherkin, bullets, or checklist',
          },
        });
      }

      try {
        const input: CreateTemplateInput = {
          name: body.name.trim(),
          acFormat: body.acFormat,
          requiredSections: body.requiredSections,
          customFields: body.customFields,
          isDefault: body.isDefault,
        };

        const template = await templateService.create(projectId, input);

        return reply.status(201).send({ data: template });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create template';

        if (message.includes('Unique constraint')) {
          return reply.status(400).send({
            error: {
              code: 'DUPLICATE_NAME',
              message: 'A template with this name already exists in this project',
            },
          });
        }

        return reply.status(400).send({
          error: {
            code: 'CREATE_FAILED',
            message,
          },
        });
      }
    }
  );

  // Get template by ID
  fastify.get(
    '/api/projects/:projectId/templates/:id',
    { preHandler: [fastify.authenticate] },
    async (
      request: FastifyRequest<{ Params: { projectId: string; id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;

      const template = await templateService.getById(id);

      if (!template) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Template not found',
          },
        });
      }

      return reply.send({ data: template });
    }
  );

  // Update template
  fastify.put(
    '/api/projects/:projectId/templates/:id',
    { preHandler: [fastify.authenticate] },
    async (
      request: FastifyRequest<{ Params: { projectId: string; id: string }; Body: UpdateBody }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;
      const body = request.body;

      if (body.name !== undefined && body.name.length > 100) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Template name must be 100 characters or less',
          },
        });
      }

      if (body.acFormat && !['gherkin', 'bullets', 'checklist'].includes(body.acFormat)) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid AC format. Must be: gherkin, bullets, or checklist',
          },
        });
      }

      try {
        const input: UpdateTemplateInput = {};
        if (body.name !== undefined) input.name = body.name.trim();
        if (body.acFormat !== undefined) input.acFormat = body.acFormat;
        if (body.requiredSections !== undefined) input.requiredSections = body.requiredSections;
        if (body.customFields !== undefined) input.customFields = body.customFields;

        const template = await templateService.update(id, input);

        return reply.send({ data: template });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update template';

        if (message.includes('Unique constraint')) {
          return reply.status(400).send({
            error: {
              code: 'DUPLICATE_NAME',
              message: 'A template with this name already exists in this project',
            },
          });
        }

        return reply.status(400).send({
          error: {
            code: 'UPDATE_FAILED',
            message,
          },
        });
      }
    }
  );

  // Delete template
  fastify.delete(
    '/api/projects/:projectId/templates/:id',
    { preHandler: [fastify.authenticate] },
    async (
      request: FastifyRequest<{ Params: { projectId: string; id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;

      try {
        await templateService.delete(id);
        return reply.status(204).send();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete template';

        if (message.includes('in use')) {
          return reply.status(400).send({
            error: {
              code: 'TEMPLATE_IN_USE',
              message,
            },
          });
        }

        return reply.status(500).send({
          error: {
            code: 'DELETE_FAILED',
            message,
          },
        });
      }
    }
  );

  // Set template as default
  fastify.post(
    '/api/projects/:projectId/templates/:id/default',
    { preHandler: [fastify.authenticate] },
    async (
      request: FastifyRequest<{ Params: { projectId: string; id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;

      try {
        const template = await templateService.setDefault(id);
        return reply.send({ data: template });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to set default';

        if (message.includes('not found')) {
          return reply.status(404).send({
            error: {
              code: 'NOT_FOUND',
              message: 'Template not found',
            },
          });
        }

        return reply.status(500).send({
          error: {
            code: 'SET_DEFAULT_FAILED',
            message,
          },
        });
      }
    }
  );
}
