import { prisma } from '../lib/prisma.js';
import type { WorkItemType, WorkItemStatus, SizeEstimate } from '@prisma/client';

export type ExportFormat = 'csv' | 'json' | 'markdown';

export interface ExportFilters {
  types?: WorkItemType[];
  statuses?: WorkItemStatus[];
  includeChildren?: boolean;
}

export interface ExportOptions {
  format: ExportFormat;
  filters?: ExportFilters;
  includeMetadata?: boolean;
  flattenHierarchy?: boolean;
}

interface ExportedWorkItem {
  id: string;
  title: string;
  type: WorkItemType;
  status: WorkItemStatus;
  description: string | null;
  acceptanceCriteria: string | null;
  technicalNotes: string | null;
  sizeEstimate: SizeEstimate | null;
  parentId: string | null;
  parentTitle?: string | null;
  orderIndex: number;
  jiraKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportResult {
  content: string;
  filename: string;
  mimeType: string;
  itemCount: number;
}

class LocalExportService {
  async exportSpec(specId: string, options: ExportOptions): Promise<ExportResult> {
    // Fetch spec with work items
    const spec = await prisma.spec.findUnique({
      where: { id: specId },
      include: {
        workItems: {
          orderBy: [
            { type: 'asc' },
            { orderIndex: 'asc' },
          ],
        },
      },
    });

    if (!spec) {
      throw new Error('Spec not found');
    }

    // Apply filters
    let items = spec.workItems;

    if (options.filters?.types && options.filters.types.length > 0) {
      items = items.filter(item => options.filters!.types!.includes(item.type));
    }

    if (options.filters?.statuses && options.filters.statuses.length > 0) {
      items = items.filter(item => options.filters!.statuses!.includes(item.status));
    }

    // Build parent lookup for hierarchy
    const itemMap = new Map(items.map(i => [i.id, i]));
    const exportItems: ExportedWorkItem[] = items.map(item => ({
      ...item,
      parentTitle: item.parentId ? itemMap.get(item.parentId)?.title || null : null,
    }));

    // Generate export based on format
    switch (options.format) {
      case 'csv':
        return this.exportToCSV(exportItems, spec.name, options);
      case 'json':
        return this.exportToJSON(exportItems, spec, options);
      case 'markdown':
        return this.exportToMarkdown(exportItems, spec.name, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  private exportToCSV(
    items: ExportedWorkItem[],
    specName: string,
    options: ExportOptions
  ): ExportResult {
    const headers = [
      'ID',
      'Type',
      'Title',
      'Status',
      'Size Estimate',
      'Parent',
      'Description',
      'Acceptance Criteria',
      'Technical Notes',
      'Jira Key',
    ];

    if (options.includeMetadata) {
      headers.push('Created At', 'Updated At');
    }

    const escapeCSV = (value: string | null | undefined): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = items.map(item => {
      const row = [
        item.id,
        item.type,
        escapeCSV(item.title),
        item.status,
        item.sizeEstimate || '',
        escapeCSV(item.parentTitle),
        escapeCSV(item.description),
        escapeCSV(item.acceptanceCriteria),
        escapeCSV(item.technicalNotes),
        item.jiraKey || '',
      ];

      if (options.includeMetadata) {
        row.push(item.createdAt.toISOString(), item.updatedAt.toISOString());
      }

      return row.join(',');
    });

    const content = [headers.join(','), ...rows].join('\n');
    const filename = `${this.sanitizeFilename(specName)}_export_${this.getDateStamp()}.csv`;

    return {
      content,
      filename,
      mimeType: 'text/csv',
      itemCount: items.length,
    };
  }

  private exportToJSON(
    items: ExportedWorkItem[],
    spec: { id: string; name: string },
    options: ExportOptions
  ): ExportResult {
    const exportData = {
      exportedAt: new Date().toISOString(),
      spec: {
        id: spec.id,
        name: spec.name,
      },
      filters: options.filters || {},
      itemCount: items.length,
      items: options.flattenHierarchy
        ? items.map(item => this.flattenItem(item, options))
        : this.buildHierarchy(items, options),
    };

    const content = JSON.stringify(exportData, null, 2);
    const filename = `${this.sanitizeFilename(spec.name)}_export_${this.getDateStamp()}.json`;

    return {
      content,
      filename,
      mimeType: 'application/json',
      itemCount: items.length,
    };
  }

  private flattenItem(item: ExportedWorkItem, options: ExportOptions) {
    const result: Record<string, unknown> = {
      id: item.id,
      type: item.type,
      title: item.title,
      status: item.status,
      sizeEstimate: item.sizeEstimate,
      parentId: item.parentId,
      description: item.description,
      acceptanceCriteria: item.acceptanceCriteria,
      technicalNotes: item.technicalNotes,
      jiraKey: item.jiraKey,
    };

    if (options.includeMetadata) {
      result.createdAt = item.createdAt.toISOString();
      result.updatedAt = item.updatedAt.toISOString();
    }

    return result;
  }

  private buildHierarchy(items: ExportedWorkItem[], options: ExportOptions) {
    // Group by type for hierarchical structure
    const epics = items.filter(i => i.type === 'epic');
    const features = items.filter(i => i.type === 'feature');
    const stories = items.filter(i => i.type === 'story');

    const mapItem = (item: ExportedWorkItem) => {
      const mapped: Record<string, unknown> = {
        id: item.id,
        title: item.title,
        status: item.status,
        description: item.description,
      };

      if (item.type === 'story') {
        mapped.sizeEstimate = item.sizeEstimate;
        mapped.acceptanceCriteria = item.acceptanceCriteria;
        mapped.technicalNotes = item.technicalNotes;
      }

      if (item.jiraKey) {
        mapped.jiraKey = item.jiraKey;
      }

      if (options.includeMetadata) {
        mapped.createdAt = item.createdAt.toISOString();
        mapped.updatedAt = item.updatedAt.toISOString();
      }

      return mapped;
    };

    return epics.map(epic => ({
      ...mapItem(epic),
      type: 'epic',
      features: features
        .filter(f => f.parentId === epic.id)
        .map(feature => ({
          ...mapItem(feature),
          type: 'feature',
          stories: stories
            .filter(s => s.parentId === feature.id)
            .map(story => ({
              ...mapItem(story),
              type: 'story',
            })),
        })),
    }));
  }

  private exportToMarkdown(
    items: ExportedWorkItem[],
    specName: string,
    options: ExportOptions
  ): ExportResult {
    const lines: string[] = [];

    lines.push(`# ${specName} - Work Items Export`);
    lines.push('');
    lines.push(`*Exported on ${new Date().toLocaleString()}*`);
    lines.push('');
    lines.push(`**Total Items:** ${items.length}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Group by type
    const epics = items.filter(i => i.type === 'epic');
    const features = items.filter(i => i.type === 'feature');
    const stories = items.filter(i => i.type === 'story');

    // Render epics
    for (const epic of epics) {
      lines.push(`## ${epic.title}`);
      lines.push('');
      lines.push(`**Type:** Epic | **Status:** ${this.formatStatus(epic.status)}${epic.jiraKey ? ` | **Jira:** ${epic.jiraKey}` : ''}`);
      lines.push('');

      if (epic.description) {
        lines.push(epic.description);
        lines.push('');
      }

      // Features under this epic
      const epicFeatures = features.filter(f => f.parentId === epic.id);
      for (const feature of epicFeatures) {
        lines.push(`### ${feature.title}`);
        lines.push('');
        lines.push(`**Type:** Feature | **Status:** ${this.formatStatus(feature.status)}${feature.jiraKey ? ` | **Jira:** ${feature.jiraKey}` : ''}`);
        lines.push('');

        if (feature.description) {
          lines.push(feature.description);
          lines.push('');
        }

        // Stories under this feature
        const featureStories = stories.filter(s => s.parentId === feature.id);
        for (const story of featureStories) {
          lines.push(`#### ${story.title}`);
          lines.push('');
          lines.push(`**Type:** Story | **Status:** ${this.formatStatus(story.status)}${story.sizeEstimate ? ` | **Size:** ${story.sizeEstimate}` : ''}${story.jiraKey ? ` | **Jira:** ${story.jiraKey}` : ''}`);
          lines.push('');

          if (story.description) {
            lines.push('**Description:**');
            lines.push('');
            lines.push(story.description);
            lines.push('');
          }

          if (story.acceptanceCriteria) {
            lines.push('**Acceptance Criteria:**');
            lines.push('');
            lines.push(story.acceptanceCriteria);
            lines.push('');
          }

          if (story.technicalNotes) {
            lines.push('**Technical Notes:**');
            lines.push('');
            lines.push(story.technicalNotes);
            lines.push('');
          }

          lines.push('---');
          lines.push('');
        }
      }

      // Stories directly under epic (no feature)
      const directStories = stories.filter(s => s.parentId === epic.id);
      if (directStories.length > 0) {
        lines.push('### Direct Stories');
        lines.push('');
        for (const story of directStories) {
          this.renderStoryMarkdown(story, lines);
        }
      }
    }

    // Orphan features (no epic parent)
    const orphanFeatures = features.filter(f => !f.parentId || !epics.find(e => e.id === f.parentId));
    if (orphanFeatures.length > 0) {
      lines.push('## Standalone Features');
      lines.push('');
      for (const feature of orphanFeatures) {
        lines.push(`### ${feature.title}`);
        lines.push('');
        lines.push(`**Status:** ${this.formatStatus(feature.status)}${feature.jiraKey ? ` | **Jira:** ${feature.jiraKey}` : ''}`);
        lines.push('');
        if (feature.description) {
          lines.push(feature.description);
          lines.push('');
        }

        const featureStories = stories.filter(s => s.parentId === feature.id);
        for (const story of featureStories) {
          this.renderStoryMarkdown(story, lines);
        }
      }
    }

    // Orphan stories
    const orphanStories = stories.filter(s => !s.parentId || (!features.find(f => f.id === s.parentId) && !epics.find(e => e.id === s.parentId)));
    if (orphanStories.length > 0) {
      lines.push('## Standalone Stories');
      lines.push('');
      for (const story of orphanStories) {
        this.renderStoryMarkdown(story, lines);
      }
    }

    const content = lines.join('\n');
    const filename = `${this.sanitizeFilename(specName)}_export_${this.getDateStamp()}.md`;

    return {
      content,
      filename,
      mimeType: 'text/markdown',
      itemCount: items.length,
    };
  }

  private renderStoryMarkdown(story: ExportedWorkItem, lines: string[]): void {
    lines.push(`#### ${story.title}`);
    lines.push('');
    lines.push(`**Status:** ${this.formatStatus(story.status)}${story.sizeEstimate ? ` | **Size:** ${story.sizeEstimate}` : ''}${story.jiraKey ? ` | **Jira:** ${story.jiraKey}` : ''}`);
    lines.push('');

    if (story.description) {
      lines.push('**Description:**');
      lines.push('');
      lines.push(story.description);
      lines.push('');
    }

    if (story.acceptanceCriteria) {
      lines.push('**Acceptance Criteria:**');
      lines.push('');
      lines.push(story.acceptanceCriteria);
      lines.push('');
    }

    if (story.technicalNotes) {
      lines.push('**Technical Notes:**');
      lines.push('');
      lines.push(story.technicalNotes);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  private formatStatus(status: WorkItemStatus): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  private sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50);
  }

  private getDateStamp(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }
}

export const localExportService = new LocalExportService();
