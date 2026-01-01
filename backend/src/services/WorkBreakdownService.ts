import { PrismaClient, WorkItemType, WorkItemStatus } from '@prisma/client';

const prisma = new PrismaClient();

export interface TreeNode {
  id: string;
  name: string;
  type: WorkItemType;
  status: WorkItemStatus;
  value: number; // Story count for sizing
  effort?: number; // Optional effort estimate
  children: TreeNode[];
}

export interface WorkBreakdownData {
  projectId: string;
  root: TreeNode;
  summary: {
    totalEpics: number;
    totalFeatures: number;
    totalStories: number;
    statusCounts: Record<WorkItemStatus, number>;
    sizeDistribution: Record<string, number>;
  };
}

export class WorkBreakdownService {
  /**
   * Get hierarchical work breakdown for a project
   */
  async getWorkBreakdown(projectId: string): Promise<WorkBreakdownData> {
    // Get all work items for all specs in the project
    const specs = await prisma.spec.findMany({
      where: { projectId },
      select: { id: true, name: true },
    });

    const specIds = specs.map((s) => s.id);

    // Get all work items
    const workItems = await prisma.workItem.findMany({
      where: { specId: { in: specIds } },
      orderBy: [{ type: 'asc' }, { orderIndex: 'asc' }],
    });

    // Build summary stats
    const summary = {
      totalEpics: workItems.filter((w) => w.type === 'epic').length,
      totalFeatures: workItems.filter((w) => w.type === 'feature').length,
      totalStories: workItems.filter((w) => w.type === 'story').length,
      statusCounts: {
        draft: 0,
        ready_for_review: 0,
        approved: 0,
        exported: 0,
      } as Record<WorkItemStatus, number>,
      sizeDistribution: {} as Record<string, number>,
    };

    // Count statuses
    for (const item of workItems) {
      summary.statusCounts[item.status]++;
      if (item.sizeEstimate) {
        summary.sizeDistribution[item.sizeEstimate] =
          (summary.sizeDistribution[item.sizeEstimate] || 0) + 1;
      }
    }

    // Build tree structure
    const itemMap = new Map<string, TreeNode>();
    const rootChildren: TreeNode[] = [];

    // Create nodes for all items
    for (const item of workItems) {
      itemMap.set(item.id, {
        id: item.id,
        name: item.title,
        type: item.type,
        status: item.status,
        value: item.type === 'story' ? 1 : 0,
        effort: this.sizeToEffort(item.sizeEstimate),
        children: [],
      });
    }

    // Build hierarchy
    for (const item of workItems) {
      const node = itemMap.get(item.id)!;

      if (item.parentId && itemMap.has(item.parentId)) {
        const parent = itemMap.get(item.parentId)!;
        parent.children.push(node);
      } else if (item.type === 'epic') {
        rootChildren.push(node);
      } else if (!item.parentId) {
        // Orphaned feature or story - add to root
        rootChildren.push(node);
      }
    }

    // Calculate values (story counts) recursively
    const calculateValue = (node: TreeNode): number => {
      if (node.children.length === 0) {
        return node.value;
      }
      node.value = node.children.reduce((sum, child) => sum + calculateValue(child), 0);
      return node.value;
    };

    for (const node of rootChildren) {
      calculateValue(node);
    }

    // Create root node
    const root: TreeNode = {
      id: 'root',
      name: 'Work Breakdown',
      type: 'epic' as WorkItemType,
      status: 'draft' as WorkItemStatus,
      value: rootChildren.reduce((sum, child) => sum + child.value, 0),
      children: rootChildren,
    };

    return {
      projectId,
      root,
      summary,
    };
  }

  /**
   * Get work breakdown for a specific spec
   */
  async getSpecWorkBreakdown(specId: string): Promise<WorkBreakdownData> {
    const spec = await prisma.spec.findUnique({
      where: { id: specId },
      select: { projectId: true },
    });

    if (!spec) {
      throw new Error('Spec not found');
    }

    const workItems = await prisma.workItem.findMany({
      where: { specId },
      orderBy: [{ type: 'asc' }, { orderIndex: 'asc' }],
    });

    // Build summary stats
    const summary = {
      totalEpics: workItems.filter((w) => w.type === 'epic').length,
      totalFeatures: workItems.filter((w) => w.type === 'feature').length,
      totalStories: workItems.filter((w) => w.type === 'story').length,
      statusCounts: {
        draft: 0,
        ready_for_review: 0,
        approved: 0,
        exported: 0,
      } as Record<WorkItemStatus, number>,
      sizeDistribution: {} as Record<string, number>,
    };

    for (const item of workItems) {
      summary.statusCounts[item.status]++;
      if (item.sizeEstimate) {
        summary.sizeDistribution[item.sizeEstimate] =
          (summary.sizeDistribution[item.sizeEstimate] || 0) + 1;
      }
    }

    // Build tree structure
    const itemMap = new Map<string, TreeNode>();
    const rootChildren: TreeNode[] = [];

    for (const item of workItems) {
      itemMap.set(item.id, {
        id: item.id,
        name: item.title,
        type: item.type,
        status: item.status,
        value: item.type === 'story' ? 1 : 0,
        effort: this.sizeToEffort(item.sizeEstimate),
        children: [],
      });
    }

    for (const item of workItems) {
      const node = itemMap.get(item.id)!;

      if (item.parentId && itemMap.has(item.parentId)) {
        const parent = itemMap.get(item.parentId)!;
        parent.children.push(node);
      } else if (item.type === 'epic') {
        rootChildren.push(node);
      } else if (!item.parentId) {
        rootChildren.push(node);
      }
    }

    const calculateValue = (node: TreeNode): number => {
      if (node.children.length === 0) {
        return node.value;
      }
      node.value = node.children.reduce((sum, child) => sum + calculateValue(child), 0);
      return node.value;
    };

    for (const node of rootChildren) {
      calculateValue(node);
    }

    const root: TreeNode = {
      id: 'root',
      name: 'Spec Work Breakdown',
      type: 'epic' as WorkItemType,
      status: 'draft' as WorkItemStatus,
      value: rootChildren.reduce((sum, child) => sum + child.value, 0),
      children: rootChildren,
    };

    return {
      projectId: spec.projectId,
      root,
      summary,
    };
  }

  private sizeToEffort(size: string | null): number {
    switch (size) {
      case 'S':
        return 1;
      case 'M':
        return 2;
      case 'L':
        return 5;
      case 'XL':
        return 8;
      default:
        return 1;
    }
  }
}

export const workBreakdownService = new WorkBreakdownService();
