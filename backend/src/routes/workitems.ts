import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { WorkItemStatus, SizeEstimate } from '@prisma/client';

interface WorkItemIdParams {
  id: string;
}

interface UpdateWorkItemBody {
  title?: string;
  description?: string;
  acceptanceCriteria?: string;
  technicalNotes?: string;
  status?: WorkItemStatus;
  sizeEstimate?: SizeEstimate;
}

interface MoveWorkItemBody {
  newParentId: string | null;
  newOrderIndex: number;
}

export async function workitemsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/workitems
   * List work items with optional filters
   */
  app.get<{ Querystring: { specId?: string; type?: string; status?: string } }>(
    '/api/workitems',
    {
      onRequest: [app.authenticate],
    },
    async (request, _reply) => {
      const { specId, type, status } = request.query;

      const whereClause: Record<string, unknown> = {};
      if (specId) whereClause.specId = specId;
      if (type) whereClause.type = type;
      if (status) whereClause.status = status;

      const workItems = await prisma.workItem.findMany({
        where: whereClause,
        include: {
          sources: {
            include: {
              section: {
                select: {
                  sectionRef: true,
                  heading: true,
                },
              },
            },
          },
        },
        orderBy: [{ type: 'asc' }, { orderIndex: 'asc' }],
      });

      return { data: workItems };
    }
  );

  /**
   * GET /api/workitems/:id
   * Get a specific work item
   */
  app.get<{ Params: WorkItemIdParams }>(
    '/api/workitems/:id',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;

      const workItem = await prisma.workItem.findUnique({
        where: { id },
        include: {
          sources: {
            include: {
              section: {
                select: {
                  sectionRef: true,
                  heading: true,
                },
              },
            },
          },
          parent: {
            select: { id: true, title: true, type: true },
          },
          children: {
            select: { id: true, title: true, type: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
      });

      if (!workItem) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Work item not found',
          },
        });
      }

      return { data: workItem };
    }
  );

  /**
   * PATCH /api/workitems/:id
   * Update a work item
   */
  app.patch<{ Params: WorkItemIdParams; Body: UpdateWorkItemBody }>(
    '/api/workitems/:id',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;
      const updates = request.body;

      // Check if work item exists
      const existing = await prisma.workItem.findUnique({
        where: { id },
      });

      if (!existing) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Work item not found',
          },
        });
      }

      // Record history for each changed field
      const historyRecords = [];
      for (const [field, newValue] of Object.entries(updates)) {
        const oldValue = existing[field as keyof typeof existing];
        if (oldValue !== newValue) {
          historyRecords.push({
            workItemId: id,
            fieldChanged: field,
            oldValue: oldValue ? String(oldValue) : null,
            newValue: newValue ? String(newValue) : null,
            changedBy: request.user.id,
          });
        }
      }

      // Update work item and create history records in a transaction
      const [updatedItem] = await prisma.$transaction([
        prisma.workItem.update({
          where: { id },
          data: updates,
          include: {
            sources: {
              include: {
                section: {
                  select: {
                    sectionRef: true,
                    heading: true,
                  },
                },
              },
            },
          },
        }),
        ...(historyRecords.length > 0
          ? [prisma.workItemHistory.createMany({ data: historyRecords })]
          : []),
      ]);

      return { data: updatedItem };
    }
  );

  /**
   * POST /api/workitems/:id/move
   * Move a work item to a new parent or reorder
   */
  app.post<{ Params: WorkItemIdParams; Body: MoveWorkItemBody }>(
    '/api/workitems/:id/move',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { newParentId, newOrderIndex } = request.body;

      // Check if work item exists
      const existing = await prisma.workItem.findUnique({
        where: { id },
        select: { id: true, type: true, parentId: true, specId: true },
      });

      if (!existing) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Work item not found',
          },
        });
      }

      // Validate parent if provided
      if (newParentId) {
        const newParent = await prisma.workItem.findUnique({
          where: { id: newParentId },
          select: { id: true, type: true, specId: true },
        });

        if (!newParent) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_PARENT',
              message: 'New parent not found',
            },
          });
        }

        // Validate hierarchy rules
        if (existing.type === 'story' && newParent.type !== 'feature') {
          return reply.status(400).send({
            error: {
              code: 'INVALID_HIERARCHY',
              message: 'Stories can only be children of features',
            },
          });
        }

        if (existing.type === 'feature' && newParent.type !== 'epic') {
          return reply.status(400).send({
            error: {
              code: 'INVALID_HIERARCHY',
              message: 'Features can only be children of epics',
            },
          });
        }

        if (existing.type === 'epic') {
          return reply.status(400).send({
            error: {
              code: 'INVALID_HIERARCHY',
              message: 'Epics cannot have a parent',
            },
          });
        }
      }

      // Update the work item
      const updatedItem = await prisma.workItem.update({
        where: { id },
        data: {
          parentId: newParentId,
          orderIndex: newOrderIndex,
        },
        include: {
          sources: {
            include: {
              section: {
                select: {
                  sectionRef: true,
                  heading: true,
                },
              },
            },
          },
        },
      });

      // Record history
      await prisma.workItemHistory.create({
        data: {
          workItemId: id,
          fieldChanged: 'move',
          oldValue: existing.parentId,
          newValue: newParentId,
          changedBy: request.user.id,
        },
      });

      return { data: updatedItem };
    }
  );

  /**
   * DELETE /api/workitems/:id
   * Delete a work item
   */
  app.delete<{ Params: WorkItemIdParams }>(
    '/api/workitems/:id',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;

      // Check if work item exists
      const existing = await prisma.workItem.findUnique({
        where: { id },
      });

      if (!existing) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Work item not found',
          },
        });
      }

      // Delete the work item (cascade will handle sources and history)
      await prisma.workItem.delete({
        where: { id },
      });

      return reply.status(204).send();
    }
  );

  /**
   * POST /api/workitems/:id/split
   * Split a story into multiple stories
   */
  app.post<{
    Params: WorkItemIdParams;
    Body: { count: number; titles: string[] };
  }>(
    '/api/workitems/:id/split',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { count, titles } = request.body;

      // Validate input
      if (count < 2 || count > 5) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Split count must be between 2 and 5',
          },
        });
      }

      if (titles.length !== count) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Number of titles must match split count',
          },
        });
      }

      // Check if work item exists and is a story
      const existing = await prisma.workItem.findUnique({
        where: { id },
        include: {
          sources: true,
        },
      });

      if (!existing) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Work item not found',
          },
        });
      }

      if (existing.type !== 'story') {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Only stories can be split',
          },
        });
      }

      // Split the acceptance criteria into parts
      const acParts = existing.acceptanceCriteria
        ? splitAcceptanceCriteria(existing.acceptanceCriteria, count)
        : Array(count).fill(null);

      // Create new stories in a transaction
      const newStories = await prisma.$transaction(async (tx) => {
        // Create new stories
        const stories = [];
        for (let i = 0; i < count; i++) {
          const storyTitle = titles[i] ?? `${existing.title} - Part ${i + 1}`;
          const story = await tx.workItem.create({
            data: {
              specId: existing.specId,
              parentId: existing.parentId,
              type: 'story',
              title: storyTitle,
              description: existing.description
                ? `Split from: ${existing.title}\n\n${existing.description}`
                : `Split from: ${existing.title}`,
              acceptanceCriteria: acParts[i],
              technicalNotes: existing.technicalNotes,
              sizeEstimate: 'S', // Split stories start as S
              status: 'draft',
              orderIndex: existing.orderIndex + i,
            },
          });

          // Copy source references
          for (const source of existing.sources) {
            await tx.workItemSource.create({
              data: {
                workItemId: story.id,
                sectionId: source.sectionId,
                relevanceScore: source.relevanceScore,
              },
            });
          }

          stories.push(story);
        }

        // Delete the original story
        await tx.workItem.delete({
          where: { id },
        });

        return stories;
      });

      return {
        data: {
          originalId: id,
          newStories: newStories,
        },
      };
    }
  );

  /**
   * POST /api/workitems/merge
   * Merge multiple stories into one
   */
  app.post<{
    Body: { itemIds: string[]; mergedTitle: string; mergedDescription: string };
  }>(
    '/api/workitems/merge',
    {
      onRequest: [app.authenticate],
    },
    async (request, reply) => {
      const { itemIds, mergedTitle, mergedDescription } = request.body;

      // Validate input
      if (itemIds.length < 2) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'At least 2 items are required to merge',
          },
        });
      }

      // Fetch all items
      const items = await prisma.workItem.findMany({
        where: { id: { in: itemIds } },
        include: { sources: true },
      });

      if (items.length !== itemIds.length) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'One or more work items not found',
          },
        });
      }

      // Validate all items are stories with same parent
      const parentIds = new Set(items.map((item) => item.parentId));
      if (parentIds.size > 1) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'All items must have the same parent to merge',
          },
        });
      }

      const types = new Set(items.map((item) => item.type));
      if (types.size > 1 || !types.has('story')) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Only stories can be merged',
          },
        });
      }

      // Combine acceptance criteria
      const combinedAC = items
        .map((item) => item.acceptanceCriteria)
        .filter(Boolean)
        .join('\n\n---\n\n');

      // Combine technical notes
      const combinedNotes = items
        .map((item) => item.technicalNotes)
        .filter(Boolean)
        .join('\n\n---\n\n');

      // Collect all source references (deduplicated)
      const sourceSet = new Map<string, number>();
      for (const item of items) {
        for (const source of item.sources) {
          const existing = sourceSet.get(source.sectionId);
          if (!existing || source.relevanceScore > existing) {
            sourceSet.set(source.sectionId, source.relevanceScore);
          }
        }
      }

      // Determine size estimate (use largest from merged items)
      const sizeOrder = ['S', 'M', 'L', 'XL'];
      const largestSize = items.reduce((max, item) => {
        if (!item.sizeEstimate) return max;
        const currentIndex = sizeOrder.indexOf(item.sizeEstimate);
        const maxIndex = sizeOrder.indexOf(max);
        return currentIndex > maxIndex ? item.sizeEstimate : max;
      }, 'M' as SizeEstimate);

      // Create merged story in a transaction
      const firstItem = items[0];
      if (!firstItem) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No items to merge',
          },
        });
      }

      const mergedStory = await prisma.$transaction(async (tx) => {
        // Create the merged story
        const story = await tx.workItem.create({
          data: {
            specId: firstItem.specId,
            parentId: firstItem.parentId,
            type: 'story',
            title: mergedTitle,
            description: mergedDescription,
            acceptanceCriteria: combinedAC || null,
            technicalNotes: combinedNotes || null,
            sizeEstimate: largestSize,
            status: 'draft',
            orderIndex: Math.min(...items.map((item) => item.orderIndex)),
          },
        });

        // Create source references
        for (const [sectionId, relevanceScore] of sourceSet) {
          await tx.workItemSource.create({
            data: {
              workItemId: story.id,
              sectionId,
              relevanceScore,
            },
          });
        }

        // Delete the original stories
        await tx.workItem.deleteMany({
          where: { id: { in: itemIds } },
        });

        return story;
      });

      return {
        data: {
          originalIds: itemIds,
          mergedStory,
        },
      };
    }
  );
}

// Helper function to split acceptance criteria
function splitAcceptanceCriteria(ac: string, count: number): (string | null)[] {
  // Try to split by Given/When/Then blocks or bullet points
  const lines = ac.split('\n').filter((line) => line.trim());

  if (lines.length <= count) {
    // Not enough lines to split meaningfully
    const result = lines.map((line) => line);
    while (result.length < count) {
      result.push(null as unknown as string);
    }
    return result;
  }

  // Distribute lines evenly
  const linesPerPart = Math.ceil(lines.length / count);
  const result: (string | null)[] = [];

  for (let i = 0; i < count; i++) {
    const start = i * linesPerPart;
    const end = Math.min(start + linesPerPart, lines.length);
    const partLines = lines.slice(start, end);
    result.push(partLines.length > 0 ? partLines.join('\n') : null);
  }

  return result;
}
