import { prisma } from '../lib/prisma.js';
import { getClaudeService } from './ClaudeService.js';
import type { SizeEstimate, WorkItemStatus } from '@prisma/client';

interface BulkUpdatePayload {
  sizeEstimate?: SizeEstimate;
  status?: WorkItemStatus;
}

interface BulkUpdateResult {
  updated: number;
  failed: number;
  failures: Array<{ itemId: string; error: string }>;
  undoToken: string;
  undoExpiresAt: Date;
}

interface EnhancementResult {
  itemId: string;
  addedContent: string;
}

interface BulkEnhanceResult {
  enhanced: number;
  failed: number;
  failures: Array<{ itemId: string; error: string }>;
  enhancements: EnhancementResult[];
  undoToken: string;
  undoExpiresAt: Date;
}

interface UndoResult {
  reverted: number;
  operation: string;
}

interface PreviousFieldValue {
  itemId: string;
  fields: Record<string, unknown>;
}

interface PreviousTechnicalNotes {
  itemId: string;
  technicalNotes: string | null;
}

const UNDO_EXPIRY_HOURS = 1;
const MAX_ITEMS = 100;

export interface BulkOperationService {
  updateFields(
    itemIds: string[],
    updates: BulkUpdatePayload,
    userId: string,
    specId: string
  ): Promise<BulkUpdateResult>;
  aiEnhance(
    itemIds: string[],
    enhancement: string,
    context: string,
    userId: string,
    specId: string
  ): Promise<BulkEnhanceResult>;
  undo(undoToken: string): Promise<UndoResult>;
}

export function createBulkOperationService(): BulkOperationService {
  const claude = getClaudeService();

  return {
    async updateFields(
      itemIds: string[],
      updates: BulkUpdatePayload,
      userId: string,
      specId: string
    ): Promise<BulkUpdateResult> {
      if (itemIds.length === 0 || itemIds.length > MAX_ITEMS) {
        throw new Error(`itemIds must have 1-${MAX_ITEMS} items`);
      }

      const failures: Array<{ itemId: string; error: string }> = [];
      const previousValues: PreviousFieldValue[] = [];

      // Fetch current values for undo
      const items = await prisma.workItem.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, sizeEstimate: true, status: true },
      });

      const foundIds = new Set(items.map(i => i.id));

      // Track not found items
      for (const id of itemIds) {
        if (!foundIds.has(id)) {
          failures.push({ itemId: id, error: 'Item not found' });
        }
      }

      // Store previous values
      for (const item of items) {
        const fields: Record<string, unknown> = {};
        if (updates.sizeEstimate !== undefined) {
          fields.sizeEstimate = item.sizeEstimate;
        }
        if (updates.status !== undefined) {
          fields.status = item.status;
        }
        previousValues.push({ itemId: item.id, fields });
      }

      // Update items
      const validIds = items.map(i => i.id);
      if (validIds.length > 0) {
        await prisma.workItem.updateMany({
          where: { id: { in: validIds } },
          data: updates,
        });

        // Create history records
        const historyRecords = [];
        for (const item of items) {
          if (updates.sizeEstimate !== undefined) {
            historyRecords.push({
              workItemId: item.id,
              fieldChanged: 'sizeEstimate',
              oldValue: item.sizeEstimate,
              newValue: updates.sizeEstimate,
              changedBy: userId,
            });
          }
          if (updates.status !== undefined) {
            historyRecords.push({
              workItemId: item.id,
              fieldChanged: 'status',
              oldValue: item.status,
              newValue: updates.status,
              changedBy: userId,
            });
          }
        }
        if (historyRecords.length > 0) {
          await prisma.workItemHistory.createMany({ data: historyRecords });
        }
      }

      // Create bulk operation record for undo
      const expiresAt = new Date(Date.now() + UNDO_EXPIRY_HOURS * 60 * 60 * 1000);
      const bulkOp = await prisma.bulkOperation.create({
        data: {
          userId,
          specId,
          operation: 'update_fields',
          itemIds: validIds,
          payload: updates,
          previousValues: previousValues,
          expiresAt,
        },
      });

      return {
        updated: validIds.length,
        failed: failures.length,
        failures,
        undoToken: bulkOp.id,
        undoExpiresAt: expiresAt,
      };
    },

    async aiEnhance(
      itemIds: string[],
      enhancement: string,
      context: string,
      userId: string,
      specId: string
    ): Promise<BulkEnhanceResult> {
      if (itemIds.length === 0 || itemIds.length > MAX_ITEMS) {
        throw new Error(`itemIds must have 1-${MAX_ITEMS} items`);
      }

      if (!enhancement || enhancement.length < 10) {
        throw new Error('Enhancement prompt must be at least 10 characters');
      }

      const failures: Array<{ itemId: string; error: string }> = [];
      const enhancements: EnhancementResult[] = [];
      const previousValues: PreviousTechnicalNotes[] = [];

      // Fetch items
      const items = await prisma.workItem.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, title: true, type: true, description: true, technicalNotes: true },
      });

      const foundIds = new Set(items.map(i => i.id));

      // Track not found items
      for (const id of itemIds) {
        if (!foundIds.has(id)) {
          failures.push({ itemId: id, error: 'Item not found' });
        }
      }

      // Process each item sequentially to avoid rate limits
      for (const item of items) {
        try {
          // Store previous value
          previousValues.push({
            itemId: item.id,
            technicalNotes: item.technicalNotes,
          });

          // Build AI prompt
          const prompt = `You are enhancing a software development work item with additional technical notes.

## Work Item
- **Title**: ${item.title}
- **Type**: ${item.type}
- **Description**: ${item.description || 'No description'}
- **Current Technical Notes**: ${item.technicalNotes || 'None'}

## Project Context
${context || 'No additional context provided'}

## Enhancement Request
${enhancement}

## Instructions
Generate a concise addition (2-4 sentences, max 150 words) that:
1. Is specific to THIS work item (not generic boilerplate)
2. Adds actionable technical guidance
3. Relates to the enhancement request
4. Complements (not duplicates) existing technical notes

## Output Format
Return JSON only:
{
  "addition": "Your generated content here..."
}`;

          const result = await claude.completeJSON<{ addition: string }>(prompt, {
            model: 'haiku',
            temperature: 0.3,
            maxTokens: 500,
          });

          // Append to technical notes
          const separator = item.technicalNotes ? '\n\n---\n\n' : '';
          const newNotes = (item.technicalNotes || '') + separator + result.addition;

          await prisma.workItem.update({
            where: { id: item.id },
            data: { technicalNotes: newNotes },
          });

          // Create history record
          await prisma.workItemHistory.create({
            data: {
              workItemId: item.id,
              fieldChanged: 'technicalNotes',
              oldValue: item.technicalNotes,
              newValue: newNotes,
              changedBy: userId,
            },
          });

          enhancements.push({
            itemId: item.id,
            addedContent: result.addition,
          });
        } catch (error) {
          failures.push({
            itemId: item.id,
            error: error instanceof Error ? error.message : 'AI enhancement failed',
          });
        }
      }

      // Only create bulk op if we had some success
      if (enhancements.length === 0) {
        throw new Error('All items failed to enhance');
      }

      const expiresAt = new Date(Date.now() + UNDO_EXPIRY_HOURS * 60 * 60 * 1000);
      const bulkOp = await prisma.bulkOperation.create({
        data: {
          userId,
          specId,
          operation: 'ai_enhance',
          itemIds: enhancements.map(e => e.itemId),
          payload: { enhancement, context },
          previousValues: previousValues.filter(pv =>
            enhancements.some(e => e.itemId === pv.itemId)
          ),
          expiresAt,
        },
      });

      return {
        enhanced: enhancements.length,
        failed: failures.length,
        failures,
        enhancements,
        undoToken: bulkOp.id,
        undoExpiresAt: expiresAt,
      };
    },

    async undo(undoToken: string): Promise<UndoResult> {
      const bulkOp = await prisma.bulkOperation.findUnique({
        where: { id: undoToken },
      });

      if (!bulkOp) {
        throw new Error('Undo token not found or expired');
      }

      if (bulkOp.expiresAt < new Date()) {
        // Clean up expired token
        await prisma.bulkOperation.delete({ where: { id: undoToken } });
        throw new Error('Undo token not found or expired');
      }

      const previousValues = bulkOp.previousValues as unknown;

      if (bulkOp.operation === 'update_fields') {
        const values = previousValues as PreviousFieldValue[];

        // Revert each item
        for (const pv of values) {
          await prisma.workItem.update({
            where: { id: pv.itemId },
            data: pv.fields as Record<string, unknown>,
          });
        }
      } else if (bulkOp.operation === 'ai_enhance') {
        const values = previousValues as PreviousTechnicalNotes[];

        // Revert technical notes
        for (const pv of values) {
          await prisma.workItem.update({
            where: { id: pv.itemId },
            data: { technicalNotes: pv.technicalNotes },
          });
        }
      }

      // Delete the bulk operation record
      await prisma.bulkOperation.delete({ where: { id: undoToken } });

      return {
        reverted: (previousValues as unknown[]).length,
        operation: bulkOp.operation,
      };
    },
  };
}

// Export singleton instance
let _bulkOperationService: BulkOperationService | null = null;

export function getBulkOperationService(): BulkOperationService {
  if (!_bulkOperationService) {
    _bulkOperationService = createBulkOperationService();
  }
  return _bulkOperationService;
}
