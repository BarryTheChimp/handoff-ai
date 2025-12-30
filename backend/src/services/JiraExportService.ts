import { prisma } from '../lib/prisma.js';
import { jiraService, JiraCreateIssueInput, JiraIssue } from './JiraService.js';
import { WorkItem, WorkItemType, SizeEstimate, ExportStatus } from '@prisma/client';

// =============================================================================
// Types
// =============================================================================

export interface ExportOptions {
  specId: string;
  userId: string;
  jiraProjectKey: string;
  isDryRun?: boolean;
}

export interface ExportResult {
  workItemId: string;
  workItemTitle: string;
  workItemType: WorkItemType;
  jiraKey?: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
}

export interface ExportProgress {
  exportId: string;
  status: ExportStatus;
  totalItems: number;
  processedItems: number;
  failedItems: number;
  results: ExportResult[];
  errorMessage?: string | undefined;
  startedAt?: Date | undefined;
  completedAt?: Date | undefined;
}

// Atlassian Document Format (ADF) types
interface ADFDocument {
  version: 1;
  type: 'doc';
  content: ADFNode[];
}

interface ADFNode {
  type: string;
  content?: ADFNode[] | undefined;
  text?: string | undefined;
  marks?: { type: string }[] | undefined;
  attrs?: Record<string, unknown> | undefined;
}

// =============================================================================
// ADF Helpers
// =============================================================================

/**
 * Converts markdown-ish text to Atlassian Document Format (ADF).
 * This is a simplified converter - handles common patterns.
 */
function textToADF(text: string | null | undefined): string {
  if (!text) {
    return JSON.stringify(createEmptyADF());
  }

  const doc: ADFDocument = {
    version: 1,
    type: 'doc',
    content: [],
  };

  const lines = text.split('\n');
  let currentParagraph: ADFNode | null = null;
  let inCodeBlock = false;
  let codeBlockContent = '';

  for (const line of lines) {
    // Code block handling
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        doc.content.push({
          type: 'codeBlock',
          content: [{ type: 'text', text: codeBlockContent.trim() }],
        });
        codeBlockContent = '';
        inCodeBlock = false;
      } else {
        // Start code block
        if (currentParagraph) {
          doc.content.push(currentParagraph);
          currentParagraph = null;
        }
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent += line + '\n';
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch && headerMatch[1] && headerMatch[2]) {
      if (currentParagraph) {
        doc.content.push(currentParagraph);
        currentParagraph = null;
      }
      doc.content.push({
        type: 'heading',
        attrs: { level: headerMatch[1].length },
        content: [{ type: 'text', text: headerMatch[2] }],
      });
      continue;
    }

    // Bullet points
    if (line.match(/^\s*[-*]\s+/)) {
      if (currentParagraph) {
        doc.content.push(currentParagraph);
        currentParagraph = null;
      }
      const bulletText = line.replace(/^\s*[-*]\s+/, '');
      doc.content.push({
        type: 'bulletList',
        content: [{
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: bulletText }],
          }],
        }],
      });
      continue;
    }

    // Given/When/Then formatting (bold)
    const gwtMatch = line.match(/^(Given|When|Then|And)\s+(.+)$/i);
    if (gwtMatch && gwtMatch[1] && gwtMatch[2]) {
      if (currentParagraph) {
        doc.content.push(currentParagraph);
        currentParagraph = null;
      }
      doc.content.push({
        type: 'paragraph',
        content: [
          { type: 'text', text: gwtMatch[1] + ' ', marks: [{ type: 'strong' }] },
          { type: 'text', text: gwtMatch[2] },
        ],
      });
      continue;
    }

    // Empty line = new paragraph
    if (line.trim() === '') {
      if (currentParagraph) {
        doc.content.push(currentParagraph);
        currentParagraph = null;
      }
      continue;
    }

    // Regular text - add to current paragraph
    if (!currentParagraph) {
      currentParagraph = { type: 'paragraph', content: [] };
    } else {
      currentParagraph.content!.push({ type: 'text', text: ' ' });
    }
    currentParagraph.content!.push({ type: 'text', text: line });
  }

  // Flush remaining paragraph
  if (currentParagraph) {
    doc.content.push(currentParagraph);
  }

  // Ensure we have at least one paragraph
  if (doc.content.length === 0) {
    doc.content.push({ type: 'paragraph', content: [] });
  }

  return JSON.stringify(doc);
}

function createEmptyADF(): ADFDocument {
  return {
    version: 1,
    type: 'doc',
    content: [{ type: 'paragraph', content: [] }],
  };
}

/**
 * Builds a rich description for Jira from work item fields.
 */
function buildJiraDescription(item: WorkItem): string {
  const sections: string[] = [];

  if (item.description) {
    sections.push(item.description);
  }

  if (item.acceptanceCriteria) {
    sections.push('## Acceptance Criteria\n\n' + item.acceptanceCriteria);
  }

  if (item.technicalNotes) {
    sections.push('## Technical Notes\n\n' + item.technicalNotes);
  }

  return textToADF(sections.join('\n\n---\n\n'));
}

/**
 * Maps size estimate to Jira labels.
 */
function sizeToLabels(size: SizeEstimate | null): string[] {
  if (!size) return [];
  return [`size:${size}`];
}

/**
 * Maps work item type to Jira issue type.
 */
function typeToIssueType(type: WorkItemType): 'Epic' | 'Story' | 'Task' {
  switch (type) {
    case 'epic':
      return 'Epic';
    case 'feature':
      return 'Story'; // Features become Stories in Jira
    case 'story':
      return 'Story';
    default:
      return 'Task';
  }
}

// =============================================================================
// Export Service
// =============================================================================

class JiraExportServiceImpl {
  /**
   * Creates an export job and returns immediately.
   * The actual export runs asynchronously.
   */
  async createExport(options: ExportOptions): Promise<string> {
    const { specId, userId, jiraProjectKey, isDryRun = false } = options;

    // Count work items
    const itemCount = await prisma.workItem.count({
      where: { specId },
    });

    // Create export record
    const exportRecord = await prisma.export.create({
      data: {
        specId,
        userId,
        jiraProjectKey,
        isDryRun,
        status: 'pending',
        totalItems: itemCount,
      },
    });

    // Start async export (fire and forget)
    void this.runExport(exportRecord.id);

    return exportRecord.id;
  }

  /**
   * Gets the current progress of an export.
   */
  async getExportProgress(exportId: string): Promise<ExportProgress | null> {
    const record = await prisma.export.findUnique({
      where: { id: exportId },
    });

    if (!record) return null;

    return {
      exportId: record.id,
      status: record.status,
      totalItems: record.totalItems,
      processedItems: record.processedItems,
      failedItems: record.failedItems,
      results: (record.results as unknown as ExportResult[]) ?? [],
      errorMessage: record.errorMessage ?? undefined,
      startedAt: record.startedAt ?? undefined,
      completedAt: record.completedAt ?? undefined,
    };
  }

  /**
   * Cancels an in-progress export.
   */
  async cancelExport(exportId: string): Promise<boolean> {
    const record = await prisma.export.findUnique({
      where: { id: exportId },
    });

    if (!record || record.status !== 'in_progress') {
      return false;
    }

    await prisma.export.update({
      where: { id: exportId },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
      },
    });

    return true;
  }

  /**
   * Runs the export process.
   */
  private async runExport(exportId: string): Promise<void> {
    const record = await prisma.export.findUnique({
      where: { id: exportId },
    });

    if (!record) return;

    // Update status to in_progress
    await prisma.export.update({
      where: { id: exportId },
      data: {
        status: 'in_progress',
        startedAt: new Date(),
      },
    });

    const results: ExportResult[] = [];
    let failedCount = 0;

    try {
      // Load all work items for the spec, ordered for hierarchy
      const workItems = await prisma.workItem.findMany({
        where: { specId: record.specId },
        orderBy: [
          { type: 'asc' }, // epics first, then features, then stories
          { orderIndex: 'asc' },
        ],
      });

      // Create a map to track Jira keys for linking
      const jiraKeyMap = new Map<string, string>();

      // Process items in order (epics, then features, then stories)
      for (let i = 0; i < workItems.length; i++) {
        const item = workItems[i];
        if (!item) continue;

        // Check if export was cancelled
        const currentStatus = await prisma.export.findUnique({
          where: { id: exportId },
          select: { status: true },
        });

        if (currentStatus?.status === 'cancelled') {
          break;
        }

        try {
          const result = await this.exportWorkItem(
            item,
            record.userId,
            record.jiraProjectKey,
            record.isDryRun,
            jiraKeyMap
          );

          results.push(result);

          if (result.status === 'success' && result.jiraKey) {
            jiraKeyMap.set(item.id, result.jiraKey);

            // Update work item with Jira key (if not dry run)
            if (!record.isDryRun) {
              await prisma.workItem.update({
                where: { id: item.id },
                data: { jiraKey: result.jiraKey },
              });
            }
          } else if (result.status === 'failed') {
            failedCount++;
          }
        } catch (error) {
          results.push({
            workItemId: item.id,
            workItemTitle: item.title,
            workItemType: item.type,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          failedCount++;
        }

        // Update progress
        await prisma.export.update({
          where: { id: exportId },
          data: {
            processedItems: i + 1,
            failedItems: failedCount,
            results: results as unknown as object[],
          },
        });

        // Rate limiting: pause between items
        if (!record.isDryRun && i < workItems.length - 1) {
          await this.rateLimit();
        }
      }

      // Mark as completed
      await prisma.export.update({
        where: { id: exportId },
        data: {
          status: failedCount === results.length ? 'failed' : 'completed',
          completedAt: new Date(),
          results: results as unknown as object[],
          failedItems: failedCount,
        },
      });
    } catch (error) {
      // Mark as failed
      await prisma.export.update({
        where: { id: exportId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          results: results as unknown as object[],
        },
      });
    }
  }

  /**
   * Exports a single work item to Jira.
   */
  private async exportWorkItem(
    item: WorkItem,
    userId: string,
    projectKey: string,
    isDryRun: boolean,
    jiraKeyMap: Map<string, string>
  ): Promise<ExportResult> {
    // Skip if already exported
    if (item.jiraKey) {
      return {
        workItemId: item.id,
        workItemTitle: item.title,
        workItemType: item.type,
        jiraKey: item.jiraKey,
        status: 'skipped',
      };
    }

    const input: JiraCreateIssueInput = {
      projectKey,
      issueType: typeToIssueType(item.type),
      summary: item.title,
      description: buildJiraDescription(item),
      labels: sizeToLabels(item.sizeEstimate),
    };

    // Link to parent if applicable
    if (item.parentId) {
      const parentKey = jiraKeyMap.get(item.parentId);
      if (parentKey) {
        if (item.type === 'story' || item.type === 'feature') {
          // Stories/features link to parent epic
          input.epicKey = parentKey;
        }
      }
    }

    if (isDryRun) {
      // Simulate successful export
      return {
        workItemId: item.id,
        workItemTitle: item.title,
        workItemType: item.type,
        jiraKey: `${projectKey}-DRY${Math.floor(Math.random() * 1000)}`,
        status: 'success',
      };
    }

    // Create issue in Jira
    const issue = await jiraService.createIssue(userId, input);

    return {
      workItemId: item.id,
      workItemTitle: item.title,
      workItemType: item.type,
      jiraKey: issue.key,
      status: 'success',
    };
  }

  /**
   * Rate limiting to avoid hitting Jira API limits.
   * Jira Cloud allows ~100 requests/minute for most endpoints.
   */
  private async rateLimit(): Promise<void> {
    // Wait 650ms between requests (about 90 requests/minute)
    await new Promise((resolve) => setTimeout(resolve, 650));
  }

  /**
   * Generates a preview of what would be exported without actually exporting.
   */
  async previewExport(specId: string, jiraProjectKey: string): Promise<{
    items: Array<{
      workItemId: string;
      title: string;
      type: WorkItemType;
      parentTitle?: string | undefined;
      jiraIssueType: string;
      alreadyExported: boolean;
    }>;
    totalNew: number;
    totalSkipped: number;
  }> {
    const workItems = await prisma.workItem.findMany({
      where: { specId },
      include: {
        parent: {
          select: { title: true },
        },
      },
      orderBy: [
        { type: 'asc' },
        { orderIndex: 'asc' },
      ],
    });

    const items = workItems.map((item) => ({
      workItemId: item.id,
      title: item.title,
      type: item.type,
      parentTitle: item.parent?.title,
      jiraIssueType: typeToIssueType(item.type),
      alreadyExported: !!item.jiraKey,
    }));

    return {
      items,
      totalNew: items.filter((i) => !i.alreadyExported).length,
      totalSkipped: items.filter((i) => i.alreadyExported).length,
    };
  }
}

export const jiraExportService = new JiraExportServiceImpl();
