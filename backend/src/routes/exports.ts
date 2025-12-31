import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { localExportService, ExportFormat, ExportFilters } from '../services/LocalExportService.js';
import type { WorkItemType, WorkItemStatus } from '@prisma/client';

interface ExportParams {
  specId: string;
}

interface ExportQuery {
  format: ExportFormat;
  types?: string;
  statuses?: string;
  includeMetadata?: string;
  flattenHierarchy?: string;
}

export async function exportRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/specs/:specId/export/local
   * Export work items to a local file (CSV, JSON, or Markdown)
   */
  fastify.get<{
    Params: ExportParams;
    Querystring: ExportQuery;
  }>(
    '/api/specs/:specId/export/local',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: ExportParams; Querystring: ExportQuery }>, reply: FastifyReply) => {
      const { specId } = request.params;
      const {
        format = 'json',
        types,
        statuses,
        includeMetadata,
        flattenHierarchy,
      } = request.query;

      // Validate format
      const validFormats: ExportFormat[] = ['csv', 'json', 'markdown'];
      if (!validFormats.includes(format)) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_FORMAT',
            message: `Invalid export format. Valid formats: ${validFormats.join(', ')}`,
          },
        });
      }

      // Parse filters
      const filters: ExportFilters = {};

      if (types) {
        const typeList = types.split(',') as WorkItemType[];
        const validTypes: WorkItemType[] = ['epic', 'feature', 'story'];
        const invalidTypes = typeList.filter(t => !validTypes.includes(t));
        if (invalidTypes.length > 0) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_TYPE',
              message: `Invalid types: ${invalidTypes.join(', ')}. Valid types: ${validTypes.join(', ')}`,
            },
          });
        }
        filters.types = typeList;
      }

      if (statuses) {
        const statusList = statuses.split(',') as WorkItemStatus[];
        const validStatuses: WorkItemStatus[] = ['draft', 'ready_for_review', 'approved', 'exported'];
        const invalidStatuses = statusList.filter(s => !validStatuses.includes(s));
        if (invalidStatuses.length > 0) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_STATUS',
              message: `Invalid statuses: ${invalidStatuses.join(', ')}. Valid statuses: ${validStatuses.join(', ')}`,
            },
          });
        }
        filters.statuses = statusList;
      }

      try {
        const result = await localExportService.exportSpec(specId, {
          format,
          filters,
          includeMetadata: includeMetadata === 'true',
          flattenHierarchy: flattenHierarchy === 'true',
        });

        // Set appropriate headers for file download
        reply
          .header('Content-Type', result.mimeType)
          .header('Content-Disposition', `attachment; filename="${result.filename}"`)
          .header('X-Item-Count', result.itemCount.toString());

        return reply.send(result.content);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Export failed';
        if (message === 'Spec not found') {
          return reply.status(404).send({
            error: {
              code: 'NOT_FOUND',
              message: 'Specification not found',
            },
          });
        }
        return reply.status(500).send({
          error: {
            code: 'EXPORT_FAILED',
            message,
          },
        });
      }
    }
  );

  /**
   * GET /api/specs/:specId/export/formats
   * Get available export formats and their descriptions
   */
  fastify.get<{ Params: ExportParams }>(
    '/api/specs/:specId/export/formats',
    { preHandler: [fastify.authenticate] },
    async (_request: FastifyRequest<{ Params: ExportParams }>, reply: FastifyReply) => {
      return reply.send({
        data: {
          formats: [
            {
              id: 'csv',
              name: 'CSV',
              description: 'Comma-separated values, ideal for spreadsheets',
              extension: '.csv',
              mimeType: 'text/csv',
            },
            {
              id: 'json',
              name: 'JSON',
              description: 'Structured data format, ideal for integrations',
              extension: '.json',
              mimeType: 'application/json',
            },
            {
              id: 'markdown',
              name: 'Markdown',
              description: 'Formatted document, ideal for documentation',
              extension: '.md',
              mimeType: 'text/markdown',
            },
            {
              id: 'jira',
              name: 'Jira',
              description: 'Direct export to Jira project',
              extension: null,
              mimeType: null,
            },
          ],
          filters: {
            types: ['epic', 'feature', 'story'],
            statuses: ['draft', 'ready_for_review', 'approved', 'exported'],
          },
        },
      });
    }
  );
}
