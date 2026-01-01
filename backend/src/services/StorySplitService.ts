import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();
const anthropic = new Anthropic();

export interface SplitSuggestion {
  title: string;
  description: string;
  acceptanceCriteria: string[];
  sizeEstimate: 'S' | 'M' | 'L' | 'XL';
  rationale: string;
}

export interface SplitAnalysis {
  originalId: string;
  shouldSplit: boolean;
  reason: string;
  complexity: 'low' | 'medium' | 'high';
  suggestions: SplitSuggestion[];
  splitStrategy: 'by_feature' | 'by_layer' | 'by_workflow' | 'by_data' | 'by_user';
}

export class StorySplitService {
  async analyzeSplit(workItemId: string): Promise<SplitAnalysis> {
    const workItem = await prisma.workItem.findUnique({
      where: { id: workItemId },
      include: {
        parent: true,
        children: true,
      },
    });

    if (!workItem) {
      throw new Error('Work item not found');
    }

    // Build prompt for analysis
    const prompt = `Analyze this user story and determine if it should be split into smaller stories.

Title: ${workItem.title}
Type: ${workItem.type}
Size: ${workItem.sizeEstimate || 'Not estimated'}
Description: ${workItem.description || 'None'}
Acceptance Criteria: ${JSON.stringify(workItem.acceptanceCriteria || [])}

Consider the INVEST criteria:
- Stories should be small enough to complete in one sprint
- XL stories should almost always be split
- L stories often benefit from splitting
- Look for multiple distinct features, layers, or user workflows

If splitting is recommended, suggest 2-4 smaller stories that:
1. Each deliver independent value
2. Can be developed and tested separately
3. Follow the same format as the original
4. Together cover all requirements of the original

Return JSON:
{
  "shouldSplit": true/false,
  "reason": "explanation",
  "complexity": "low/medium/high",
  "splitStrategy": "by_feature/by_layer/by_workflow/by_data/by_user",
  "suggestions": [
    {
      "title": "Story title",
      "description": "Story description",
      "acceptanceCriteria": ["AC 1", "AC 2"],
      "sizeEstimate": "XS/S/M/L",
      "rationale": "Why this split makes sense"
    }
  ]
}`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Invalid response from AI');
      }

      // Extract JSON from response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse AI response');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      return {
        originalId: workItemId,
        shouldSplit: analysis.shouldSplit,
        reason: analysis.reason,
        complexity: analysis.complexity || 'medium',
        splitStrategy: analysis.splitStrategy || 'by_feature',
        suggestions: analysis.suggestions || [],
      };
    } catch (error) {
      console.error('Split analysis failed:', error);

      // Return a basic analysis for XL/L items
      const shouldSplit = workItem.sizeEstimate === 'XL' || workItem.sizeEstimate === 'L';

      return {
        originalId: workItemId,
        shouldSplit,
        reason: shouldSplit
          ? 'Large stories typically benefit from splitting for better estimation and delivery'
          : 'Story appears to be appropriately sized',
        complexity: 'medium',
        splitStrategy: 'by_feature',
        suggestions: [],
      };
    }
  }

  async executeSplit(
    workItemId: string,
    suggestions: SplitSuggestion[]
  ): Promise<Array<{ id: string; title: string }>> {
    const workItem = await prisma.workItem.findUnique({
      where: { id: workItemId },
    });

    if (!workItem) {
      throw new Error('Work item not found');
    }

    // Create new work items for each suggestion
    const created = await Promise.all(
      suggestions.map(async (suggestion, index) => {
        const newItem = await prisma.workItem.create({
          data: {
            id: uuidv4(),
            specId: workItem.specId,
            parentId: workItem.parentId,
            type: 'story',
            title: suggestion.title,
            description: suggestion.description,
            acceptanceCriteria: suggestion.acceptanceCriteria.join('\n'),
            sizeEstimate: suggestion.sizeEstimate,
            status: 'draft',
            orderIndex: workItem.orderIndex + index + 1,
            customFields: {
              splitFrom: workItemId,
              splitRationale: suggestion.rationale,
            },
          },
        });

        return { id: newItem.id, title: newItem.title };
      })
    );

    // Update original work item to mark as split
    const existingCustomFields = workItem.customFields as Record<string, unknown> || {};
    await prisma.workItem.update({
      where: { id: workItemId },
      data: {
        status: 'draft',
        customFields: {
          ...existingCustomFields,
          splitInto: created.map((c) => c.id),
          splitAt: new Date().toISOString(),
        },
      },
    });

    return created;
  }

  async getSplitHistory(workItemId: string): Promise<Array<{
    id: string;
    title: string;
    splitFrom?: string;
    splitInto?: string[];
  }>> {
    const workItem = await prisma.workItem.findUnique({
      where: { id: workItemId },
    });

    if (!workItem) {
      return [];
    }

    const customFields = workItem.customFields as Record<string, unknown> | null;
    const history: Array<{ id: string; title: string; splitFrom?: string; splitInto?: string[] }> = [
      {
        id: workItem.id,
        title: workItem.title,
        splitFrom: customFields?.splitFrom as string | undefined,
        splitInto: customFields?.splitInto as string[] | undefined,
      },
    ];

    // Find items split from this one
    if (customFields?.splitInto) {
      const splitItems = await prisma.workItem.findMany({
        where: { id: { in: customFields.splitInto as string[] } },
        select: { id: true, title: true },
      });
      history.push(...splitItems.map((item) => ({ ...item })));
    }

    return history;
  }

  /**
   * Undo a split operation by deleting the split stories and restoring the original
   */
  async undoSplit(originalWorkItemId: string): Promise<{
    restored: boolean;
    deletedCount: number;
    message: string;
  }> {
    const workItem = await prisma.workItem.findUnique({
      where: { id: originalWorkItemId },
    });

    if (!workItem) {
      throw new Error('Work item not found');
    }

    const customFields = workItem.customFields as Record<string, unknown> | null;
    const splitInto = customFields?.splitInto as string[] | undefined;

    if (!splitInto || splitInto.length === 0) {
      return {
        restored: false,
        deletedCount: 0,
        message: 'This story was not split - no action needed',
      };
    }

    // Check if split stories have been exported or have children
    const splitItems = await prisma.workItem.findMany({
      where: { id: { in: splitInto } },
      include: { children: true },
    });

    const exportedItems = splitItems.filter(
      (item) => item.status === 'exported' || item.jiraKey
    );
    if (exportedItems.length > 0) {
      return {
        restored: false,
        deletedCount: 0,
        message: `Cannot undo split: ${exportedItems.length} stories have been exported to Jira`,
      };
    }

    const itemsWithChildren = splitItems.filter(
      (item) => item.children.length > 0
    );
    if (itemsWithChildren.length > 0) {
      return {
        restored: false,
        deletedCount: 0,
        message: `Cannot undo split: ${itemsWithChildren.length} stories have child items`,
      };
    }

    // Delete split items
    await prisma.workItem.deleteMany({
      where: { id: { in: splitInto } },
    });

    // Restore original work item
    const { splitInto: _, splitAt: __, ...restCustomFields } = customFields || {};
    await prisma.workItem.update({
      where: { id: originalWorkItemId },
      data: {
        status: 'draft',
        customFields: {
          ...restCustomFields,
          undoSplitAt: new Date().toISOString(),
        },
      },
    });

    return {
      restored: true,
      deletedCount: splitInto.length,
      message: `Successfully restored original story and deleted ${splitInto.length} split stories`,
    };
  }

  /**
   * Check if a split can be undone
   */
  async canUndoSplit(workItemId: string): Promise<{
    canUndo: boolean;
    reason?: string;
    splitItemCount: number;
  }> {
    const workItem = await prisma.workItem.findUnique({
      where: { id: workItemId },
    });

    if (!workItem) {
      return { canUndo: false, reason: 'Work item not found', splitItemCount: 0 };
    }

    const customFields = workItem.customFields as Record<string, unknown> | null;
    const splitInto = customFields?.splitInto as string[] | undefined;

    if (!splitInto || splitInto.length === 0) {
      return { canUndo: false, reason: 'Story was not split', splitItemCount: 0 };
    }

    const splitItems = await prisma.workItem.findMany({
      where: { id: { in: splitInto } },
      include: { children: true },
    });

    const exportedItems = splitItems.filter(
      (item) => item.status === 'exported' || item.jiraKey
    );
    if (exportedItems.length > 0) {
      return {
        canUndo: false,
        reason: `${exportedItems.length} stories have been exported to Jira`,
        splitItemCount: splitInto.length,
      };
    }

    const itemsWithChildren = splitItems.filter(
      (item) => item.children.length > 0
    );
    if (itemsWithChildren.length > 0) {
      return {
        canUndo: false,
        reason: `${itemsWithChildren.length} stories have child items`,
        splitItemCount: splitInto.length,
      };
    }

    return { canUndo: true, splitItemCount: splitInto.length };
  }
}

export const storySplitService = new StorySplitService();
