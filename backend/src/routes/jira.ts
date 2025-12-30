import { FastifyInstance } from 'fastify';
import { jiraService } from '../services/JiraService.js';
import { jiraExportService } from '../services/JiraExportService.js';
import crypto from 'crypto';

// Store OAuth state tokens temporarily (in production, use Redis or DB)
const oauthStates = new Map<string, { userId: string; createdAt: Date }>();

// Clean up old states periodically
setInterval(() => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  for (const [state, data] of oauthStates.entries()) {
    if (data.createdAt < fiveMinutesAgo) {
      oauthStates.delete(state);
    }
  }
}, 60 * 1000);

export async function jiraRoutes(app: FastifyInstance): Promise<void> {
  // ==========================================================================
  // OAuth Routes
  // ==========================================================================

  /**
   * GET /api/jira/auth
   * Returns the Jira OAuth authorization URL.
   * User should be redirected to this URL to start OAuth flow.
   */
  app.get(
    '/api/jira/auth',
    {
      onRequest: [app.authenticate],
    },
    async (request, _reply) => {
      const state = crypto.randomBytes(32).toString('hex');

      // Store state for verification
      oauthStates.set(state, {
        userId: request.user.id,
        createdAt: new Date(),
      });

      const authUrl = jiraService.getAuthUrl(state);

      return {
        data: {
          authUrl,
          state,
        },
      };
    }
  );

  /**
   * GET /api/jira/callback
   * OAuth callback handler. Exchanges code for tokens.
   */
  app.get<{
    Querystring: { code?: string; state?: string; error?: string; mock?: string };
  }>(
    '/api/jira/callback',
    async (request, reply) => {
      const { code, state, error, mock } = request.query;

      if (error) {
        // Redirect to frontend with error
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return reply.redirect(`${frontendUrl}/settings/jira?error=${encodeURIComponent(error)}`);
      }

      if (!state) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_STATE',
            message: 'Missing OAuth state parameter',
          },
        });
      }

      // Verify state
      const stateData = oauthStates.get(state);
      if (!stateData) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_STATE',
            message: 'Invalid or expired OAuth state',
          },
        });
      }

      oauthStates.delete(state);

      try {
        // Handle mock callback
        if (mock === 'true') {
          await jiraService.handleOAuthCallback('mock-code', stateData.userId);
        } else if (code) {
          await jiraService.handleOAuthCallback(code, stateData.userId);
        } else {
          throw new Error('Missing authorization code');
        }

        // Redirect to frontend success page
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return reply.redirect(`${frontendUrl}/settings/jira?success=true`);
      } catch (err) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const message = err instanceof Error ? err.message : 'Unknown error';
        return reply.redirect(`${frontendUrl}/settings/jira?error=${encodeURIComponent(message)}`);
      }
    }
  );

  /**
   * GET /api/jira/status
   * Returns the current Jira connection status for the user.
   */
  app.get(
    '/api/jira/status',
    {
      onRequest: [app.authenticate],
    },
    async (request, _reply) => {
      const status = await jiraService.getConnectionStatus(request.user.id);
      return { data: status };
    }
  );

  /**
   * DELETE /api/jira/disconnect
   * Disconnects the user from Jira.
   */
  app.delete(
    '/api/jira/disconnect',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      await jiraService.disconnect(request.user.id);
      return reply.status(204).send();
    }
  );

  // ==========================================================================
  // Jira Data Routes
  // ==========================================================================

  /**
   * GET /api/jira/projects
   * Lists available Jira projects.
   */
  app.get(
    '/api/jira/projects',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      try {
        const projects = await jiraService.getProjects(request.user.id);
        return { data: projects };
      } catch (err) {
        if (err instanceof Error && err.message.includes('Not connected')) {
          return reply.status(401).send({
            error: {
              code: 'NOT_CONNECTED',
              message: 'Not connected to Jira. Please connect first.',
            },
          });
        }
        throw err;
      }
    }
  );

  /**
   * GET /api/jira/projects/:key/issue-types
   * Lists issue types for a project.
   */
  app.get<{ Params: { key: string } }>(
    '/api/jira/projects/:key/issue-types',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      try {
        const issueTypes = await jiraService.getIssueTypes(request.user.id, request.params.key);
        return { data: issueTypes };
      } catch (err) {
        if (err instanceof Error && err.message.includes('Not connected')) {
          return reply.status(401).send({
            error: {
              code: 'NOT_CONNECTED',
              message: 'Not connected to Jira. Please connect first.',
            },
          });
        }
        throw err;
      }
    }
  );

  // ==========================================================================
  // Export Routes
  // ==========================================================================

  /**
   * POST /api/specs/:specId/export
   * Starts an export to Jira.
   */
  app.post<{
    Params: { specId: string };
    Body: { jiraProjectKey: string; dryRun?: boolean };
  }>(
    '/api/specs/:specId/export',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { specId } = request.params;
      const { jiraProjectKey, dryRun = false } = request.body;

      if (!jiraProjectKey) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'jiraProjectKey is required',
          },
        });
      }

      // Check Jira connection (unless dry run)
      if (!dryRun) {
        const status = await jiraService.getConnectionStatus(request.user.id);
        if (!status.connected) {
          return reply.status(401).send({
            error: {
              code: 'NOT_CONNECTED',
              message: 'Not connected to Jira. Please connect first.',
            },
          });
        }
      }

      const exportId = await jiraExportService.createExport({
        specId,
        userId: request.user.id,
        jiraProjectKey,
        isDryRun: dryRun,
      });

      return reply.status(202).send({
        data: {
          exportId,
          message: dryRun ? 'Dry run started' : 'Export started',
        },
      });
    }
  );

  /**
   * GET /api/specs/:specId/export/preview
   * Preview what would be exported without actually exporting.
   */
  app.get<{
    Params: { specId: string };
    Querystring: { jiraProjectKey: string };
  }>(
    '/api/specs/:specId/export/preview',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { specId } = request.params;
      const { jiraProjectKey } = request.query;

      if (!jiraProjectKey) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'jiraProjectKey query parameter is required',
          },
        });
      }

      const preview = await jiraExportService.previewExport(specId, jiraProjectKey);
      return { data: preview };
    }
  );

  /**
   * GET /api/exports/:exportId
   * Gets the status and progress of an export.
   */
  app.get<{ Params: { exportId: string } }>(
    '/api/exports/:exportId',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const progress = await jiraExportService.getExportProgress(request.params.exportId);

      if (!progress) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Export not found',
          },
        });
      }

      return { data: progress };
    }
  );

  /**
   * POST /api/exports/:exportId/cancel
   * Cancels an in-progress export.
   */
  app.post<{ Params: { exportId: string } }>(
    '/api/exports/:exportId/cancel',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const success = await jiraExportService.cancelExport(request.params.exportId);

      if (!success) {
        return reply.status(400).send({
          error: {
            code: 'CANNOT_CANCEL',
            message: 'Export cannot be cancelled (not in progress or not found)',
          },
        });
      }

      return { data: { cancelled: true } };
    }
  );
}
