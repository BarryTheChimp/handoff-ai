import { prisma } from '../lib/prisma.js';
import { WorkItem, WorkItemHistory } from '@prisma/client';

export type HistoryAction =
  | 'update'
  | 'move'
  | 'split'
  | 'merge'
  | 'create'
  | 'delete';

interface HistoryEntry {
  id: string;
  action: HistoryAction;
  workItemId: string;
  specId: string;
  timestamp: Date;
  userId: string;
  snapshot: WorkItemSnapshot;
  previousSnapshot?: WorkItemSnapshot;
}

interface WorkItemSnapshot {
  id: string;
  title: string;
  description: string | null;
  acceptanceCriteria: string | null;
  technicalNotes: string | null;
  status: string;
  sizeEstimate: string | null;
  parentId: string | null;
  orderIndex: number;
  type: string;
}

interface UndoResult {
  success: boolean;
  restoredItem?: WorkItem;
  message?: string;
}

/**
 * Service for tracking work item history and enabling undo/redo operations.
 * Uses the WorkItemHistory table for persistence and provides in-memory
 * stacks for efficient undo/redo within a session.
 */
class HistoryServiceImpl {
  /**
   * Records a change to a work item for history tracking.
   */
  async recordChange(
    workItemId: string,
    action: HistoryAction,
    fieldChanged: string,
    oldValue: string | null,
    newValue: string | null,
    userId: string
  ): Promise<WorkItemHistory> {
    return prisma.workItemHistory.create({
      data: {
        workItemId,
        fieldChanged,
        oldValue,
        newValue,
        changedBy: userId,
      },
    });
  }

  /**
   * Records multiple field changes in a single transaction.
   */
  async recordMultipleChanges(
    workItemId: string,
    changes: Array<{ field: string; oldValue: string | null; newValue: string | null }>,
    userId: string
  ): Promise<void> {
    const records = changes.map((change) => ({
      workItemId,
      fieldChanged: change.field,
      oldValue: change.oldValue,
      newValue: change.newValue,
      changedBy: userId,
    }));

    await prisma.workItemHistory.createMany({
      data: records,
    });
  }

  /**
   * Gets the history for a specific work item.
   */
  async getWorkItemHistory(
    workItemId: string,
    limit = 50
  ): Promise<WorkItemHistory[]> {
    return prisma.workItemHistory.findMany({
      where: { workItemId },
      orderBy: { changedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Gets recent history for a spec (all work items).
   */
  async getSpecHistory(specId: string, limit = 100): Promise<Array<WorkItemHistory & { workItem: { title: string; type: string } }>> {
    return prisma.workItemHistory.findMany({
      where: {
        workItem: {
          specId,
        },
      },
      include: {
        workItem: {
          select: {
            title: true,
            type: true,
          },
        },
      },
      orderBy: { changedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Undoes the last change to a work item field.
   * Returns the previous value that was restored.
   */
  async undoLastChange(workItemId: string): Promise<UndoResult> {
    // Get the most recent history entry
    const lastChange = await prisma.workItemHistory.findFirst({
      where: { workItemId },
      orderBy: { changedAt: 'desc' },
    });

    if (!lastChange) {
      return { success: false, message: 'No history to undo' };
    }

    // Handle special fields
    if (lastChange.fieldChanged === 'move') {
      // Restore previous parent
      const restoredItem = await prisma.workItem.update({
        where: { id: workItemId },
        data: {
          parentId: lastChange.oldValue,
        },
      });

      // Delete the history entry (it's been undone)
      await prisma.workItemHistory.delete({
        where: { id: lastChange.id },
      });

      return { success: true, restoredItem };
    }

    // For regular fields, restore the old value
    const fieldName = lastChange.fieldChanged as keyof WorkItem;
    const updateData: Record<string, unknown> = {};

    // Handle type conversion for specific fields
    if (fieldName === 'orderIndex') {
      updateData[fieldName] = lastChange.oldValue ? parseInt(lastChange.oldValue, 10) : 0;
    } else {
      updateData[fieldName] = lastChange.oldValue;
    }

    try {
      const restoredItem = await prisma.workItem.update({
        where: { id: workItemId },
        data: updateData,
      });

      // Delete the history entry
      await prisma.workItemHistory.delete({
        where: { id: lastChange.id },
      });

      return { success: true, restoredItem };
    } catch (error) {
      return {
        success: false,
        message: `Failed to undo: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Creates a snapshot of a work item for complex operations like split/merge.
   */
  async createSnapshot(workItemId: string): Promise<WorkItemSnapshot | null> {
    const item = await prisma.workItem.findUnique({
      where: { id: workItemId },
    });

    if (!item) return null;

    return {
      id: item.id,
      title: item.title,
      description: item.description,
      acceptanceCriteria: item.acceptanceCriteria,
      technicalNotes: item.technicalNotes,
      status: item.status,
      sizeEstimate: item.sizeEstimate,
      parentId: item.parentId,
      orderIndex: item.orderIndex,
      type: item.type,
    };
  }

  /**
   * Restores a work item from a snapshot.
   */
  async restoreFromSnapshot(
    snapshot: WorkItemSnapshot,
    specId: string
  ): Promise<WorkItem> {
    return prisma.workItem.create({
      data: {
        id: snapshot.id,
        specId,
        title: snapshot.title,
        description: snapshot.description,
        acceptanceCriteria: snapshot.acceptanceCriteria,
        technicalNotes: snapshot.technicalNotes,
        status: snapshot.status as 'draft' | 'ready_for_review' | 'approved' | 'exported',
        sizeEstimate: snapshot.sizeEstimate as 'S' | 'M' | 'L' | 'XL' | null,
        parentId: snapshot.parentId,
        orderIndex: snapshot.orderIndex,
        type: snapshot.type as 'epic' | 'feature' | 'story',
      },
    });
  }

  /**
   * Clears history older than specified days.
   */
  async clearOldHistory(daysOld = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.workItemHistory.deleteMany({
      where: {
        changedAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}

export const historyService = new HistoryServiceImpl();
