import { FastifyInstance } from 'fastify';
import { brandingService, BrandingSettings, JiraSettings, ExportSettings } from '../services/BrandingService.js';

interface AuthenticatedRequest {
  user: { id: string; username: string };
}

export async function settingsRoutes(fastify: FastifyInstance) {
  // Get all settings
  fastify.get(
    '/api/settings',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { user } = request as AuthenticatedRequest;
      const settings = await brandingService.getSettings(user.id);
      return reply.send({ data: settings });
    }
  );

  // Update branding settings
  fastify.patch<{ Body: Partial<BrandingSettings> }>(
    '/api/settings/branding',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { user } = request as AuthenticatedRequest;
      const branding = await brandingService.updateBranding(user.id, request.body);
      return reply.send({ data: branding });
    }
  );

  // Update Jira settings
  fastify.patch<{ Body: Partial<JiraSettings> }>(
    '/api/settings/jira',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { user } = request as AuthenticatedRequest;
      const jira = await brandingService.updateJiraSettings(user.id, request.body);
      return reply.send({ data: jira });
    }
  );

  // Update export settings
  fastify.patch<{ Body: Partial<ExportSettings> }>(
    '/api/settings/export',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { user } = request as AuthenticatedRequest;
      const exportSettings = await brandingService.updateExportSettings(user.id, request.body);
      return reply.send({ data: exportSettings });
    }
  );

  // Upload logo
  fastify.post(
    '/api/settings/logo',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { user } = request as AuthenticatedRequest;

      const data = await request.file();
      if (!data) {
        return reply.status(400).send({
          error: { code: 'NO_FILE', message: 'No file uploaded' },
        });
      }

      const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({
          error: { code: 'INVALID_TYPE', message: 'Only PNG, JPEG, SVG, and WebP images are allowed' },
        });
      }

      const buffer = await data.toBuffer();
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (buffer.length > maxSize) {
        return reply.status(400).send({
          error: { code: 'FILE_TOO_LARGE', message: 'Logo must be less than 2MB' },
        });
      }

      const logoUrl = await brandingService.uploadLogo(user.id, buffer, data.mimetype);
      return reply.send({ data: { logoUrl } });
    }
  );

  // Delete logo
  fastify.delete(
    '/api/settings/logo',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { user } = request as AuthenticatedRequest;
      await brandingService.deleteLogo(user.id);
      return reply.status(204).send();
    }
  );
}
