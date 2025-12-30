import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getBulkOperationService } from '../services/BulkOperationService.js';
import type { SizeEstimate, WorkItemStatus } from '@prisma/client';

interface BulkUpdateBody {
  itemIds: string[];
  updates: {
    sizeEstimate?: SizeEstimate;
    status?: WorkItemStatus;
  };
}

interface BulkEnhanceBody {
  itemIds: string[];
  enhancement: string;
  context?: string;
}

interface BulkUndoBody {
  undoToken: string;
}

const MAX_ITEMS = 100;

export async function bulkRoutes(fastify: FastifyInstance): Promise<void> {
  const bulkService = getBulkOperationService();

  // Bulk update fields
  fastify.post(
    '/api/workitems/bulk',
    { preHandler: [fastify.authenticate] },
    async (
      request: FastifyRequest<{ Body: BulkUpdateBody }>,
      reply: FastifyReply
    ) => {
      const { itemIds, updates } = request.body;
      const user = request.user as { id: string };

      // Validation
      if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'itemIds array required with at least 1 item',
          },
        });
      }

      if (itemIds.length > MAX_ITEMS) {
        return reply.status(400).send({
          error: {
            code: 'TOO_MANY_ITEMS',
            message: `Maximum ${MAX_ITEMS} items allowed per bulk operation`,
          },
        });
      }

      if (!updates || Object.keys(updates).length === 0) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'updates object required with at least one field',
          },
        });
      }

      // Validate update fields
      const validFields = ['sizeEstimate', 'status'];
      const invalidFields = Object.keys(updates).filter(k => !validFields.includes(k));
      if (invalidFields.length > 0) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid update fields: ${invalidFields.join(', ')}`,
          },
        });
      }

      try {
        // Get specId from first item (they should all be from same spec)
        const { prisma } = await import('../lib/prisma.js');
        const firstItem = await prisma.workItem.findUnique({
          where: { id: itemIds[0] },
          select: { specId: true },
        });

        if (!firstItem) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid item ID',
            },
          });
        }

        const result = await bulkService.updateFields(
          itemIds,
          updates,
          user.id,
          firstItem.specId
        );

        return reply.send({ data: result });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Bulk update failed';
        return reply.status(500).send({
          error: {
            code: 'BULK_UPDATE_FAILED',
            message,
          },
        });
      }
    }
  );

  // Bulk AI enhancement
  fastify.post(
    '/api/workitems/bulk/ai-enhance',
    { preHandler: [fastify.authenticate] },
    async (
      request: FastifyRequest<{ Body: BulkEnhanceBody }>,
      reply: FastifyReply
    ) => {
      const { itemIds, enhancement, context } = request.body;
      const user = request.user as { id: string };

      // Validation
      if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'itemIds array required with at least 1 item',
          },
        });
      }

      if (itemIds.length > MAX_ITEMS) {
        return reply.status(400).send({
          error: {
            code: 'TOO_MANY_ITEMS',
            message: `Maximum ${MAX_ITEMS} items allowed per bulk operation`,
          },
        });
      }

      if (!enhancement || enhancement.length < 10) {
        return reply.status(400).send({
          error: {
            code: 'ENHANCEMENT_REQUIRED',
            message: 'Enhancement prompt required (minimum 10 characters)',
          },
        });
      }

      try {
        // Get specId from first item
        const { prisma } = await import('../lib/prisma.js');
        const firstItem = await prisma.workItem.findUnique({
          where: { id: itemIds[0] },
          select: { specId: true },
        });

        if (!firstItem) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid item ID',
            },
          });
        }

        const result = await bulkService.aiEnhance(
          itemIds,
          enhancement,
          context || '',
          user.id,
          firstItem.specId
        );

        return reply.send({ data: result });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'AI enhancement failed';
        return reply.status(500).send({
          error: {
            code: 'AI_ENHANCE_FAILED',
            message,
          },
        });
      }
    }
  );

  // Undo bulk operation
  fastify.post(
    '/api/workitems/bulk/undo',
    { preHandler: [fastify.authenticate] },
    async (
      request: FastifyRequest<{ Body: BulkUndoBody }>,
      reply: FastifyReply
    ) => {
      const { undoToken } = request.body;

      if (!undoToken) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'undoToken required',
          },
        });
      }

      try {
        const result = await bulkService.undo(undoToken);
        return reply.send({ data: result });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Undo failed';
        if (message.includes('not found') || message.includes('expired')) {
          return reply.status(404).send({
            error: {
              code: 'NOT_FOUND',
              message: 'Undo token not found or expired',
            },
          });
        }
        return reply.status(500).send({
          error: {
            code: 'UNDO_FAILED',
            message,
          },
        });
      }
    }
  );
}
