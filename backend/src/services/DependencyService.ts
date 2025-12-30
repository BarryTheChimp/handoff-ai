import { prisma } from '../lib/prisma.js';

export interface DependencyNode {
  id: string;
  title: string;
  type: 'epic' | 'feature' | 'story';
  sizeEstimate: string | null;
  status: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  isCritical: boolean;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  criticalPath: string[];
  cycles: string[][];
}

export interface DependencyService {
  getGraph(specId: string): Promise<DependencyGraph>;
  addDependency(workItemId: string, dependsOnId: string): Promise<void>;
  removeDependency(workItemId: string, dependsOnId: string): Promise<void>;
  wouldCreateCycle(fromId: string, toId: string, edges: { from: string; to: string }[]): boolean;
}

/**
 * Detects if adding an edge from `fromId` to `toId` would create a cycle.
 * Uses BFS to check if `fromId` is reachable from `toId`.
 */
function wouldCreateCycle(
  fromId: string,
  toId: string,
  adjacency: Map<string, string[]>
): boolean {
  // If we add fromId -> toId, we need to check if toId can reach fromId
  // (which would create a cycle: fromId -> toId -> ... -> fromId)
  const visited = new Set<string>();
  const queue = [toId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === fromId) {
      return true; // Cycle detected
    }
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  return false;
}

/**
 * Detects all cycles in the graph using DFS.
 * Returns array of cycles, each cycle is an array of node IDs.
 */
function detectCycles(adjacency: Map<string, string[]>, nodeIds: string[]): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const parent = new Map<string, string>();

  function dfs(nodeId: string, path: string[]): void {
    visited.add(nodeId);
    recStack.add(nodeId);

    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        parent.set(neighbor, nodeId);
        dfs(neighbor, [...path, nodeId]);
      } else if (recStack.has(neighbor)) {
        // Found cycle - extract it
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          const cycle = path.slice(cycleStart);
          cycle.push(neighbor);
          cycles.push(cycle);
        } else {
          // Cycle starts from neighbor
          const cycle = [...path.slice(path.indexOf(nodeId)), nodeId, neighbor];
          cycles.push([neighbor, nodeId]);
        }
      }
    }

    recStack.delete(nodeId);
  }

  for (const nodeId of nodeIds) {
    if (!visited.has(nodeId)) {
      dfs(nodeId, []);
    }
  }

  return cycles;
}

/**
 * Calculates the critical path (longest path) in a DAG.
 * Uses topological sort + dynamic programming.
 */
function calculateCriticalPath(
  nodes: DependencyNode[],
  edges: DependencyEdge[]
): string[] {
  if (nodes.length === 0) return [];

  // Build adjacency list (reversed for "blocked by" semantics)
  // In our model: if A depends on B, then B must complete before A
  // So B -> A in dependency graph
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const node of nodes) {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  for (const edge of edges) {
    // edge.from depends on edge.to, so edge.to -> edge.from
    const neighbors = adjacency.get(edge.to) || [];
    neighbors.push(edge.from);
    adjacency.set(edge.to, neighbors);
    inDegree.set(edge.from, (inDegree.get(edge.from) || 0) + 1);
  }

  // Topological sort (Kahn's algorithm)
  const queue: string[] = [];
  const topoOrder: string[] = [];

  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(nodeId);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    topoOrder.push(current);

    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // If topo sort doesn't include all nodes, there's a cycle
  if (topoOrder.length !== nodes.length) {
    return []; // Has cycle, no valid critical path
  }

  // DP for longest path
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();

  for (const nodeId of topoOrder) {
    dist.set(nodeId, 0);
    prev.set(nodeId, null);
  }

  for (const nodeId of topoOrder) {
    const currentDist = dist.get(nodeId) || 0;
    const neighbors = adjacency.get(nodeId) || [];

    for (const neighbor of neighbors) {
      const newDist = currentDist + 1;
      if (newDist > (dist.get(neighbor) || 0)) {
        dist.set(neighbor, newDist);
        prev.set(neighbor, nodeId);
      }
    }
  }

  // Find the node with maximum distance
  let maxDist = 0;
  let endNode: string | null = null;
  for (const [nodeId, d] of dist.entries()) {
    if (d >= maxDist) {
      maxDist = d;
      endNode = nodeId;
    }
  }

  if (!endNode || maxDist === 0) {
    return []; // No dependencies, no critical path
  }

  // Backtrack to get critical path
  const criticalPath: string[] = [];
  let current: string | null = endNode;
  while (current !== null) {
    criticalPath.unshift(current);
    current = prev.get(current) || null;
  }

  return criticalPath;
}

export function createDependencyService(): DependencyService {
  return {
    async getGraph(specId: string): Promise<DependencyGraph> {
      const workItems = await prisma.workItem.findMany({
        where: { specId },
        select: {
          id: true,
          title: true,
          type: true,
          sizeEstimate: true,
          status: true,
          dependsOnIds: true,
        },
      });

      // Build nodes
      const nodes: DependencyNode[] = workItems.map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type as 'epic' | 'feature' | 'story',
        sizeEstimate: item.sizeEstimate,
        status: item.status,
      }));

      // Build edges
      const nodeIdSet = new Set(workItems.map((w) => w.id));
      const edges: DependencyEdge[] = [];
      const adjacency = new Map<string, string[]>();

      for (const node of nodes) {
        adjacency.set(node.id, []);
      }

      for (const item of workItems) {
        for (const depId of item.dependsOnIds) {
          if (nodeIdSet.has(depId)) {
            edges.push({ from: item.id, to: depId, isCritical: false });
            const neighbors = adjacency.get(item.id) || [];
            neighbors.push(depId);
            adjacency.set(item.id, neighbors);
          }
        }
      }

      // Calculate critical path
      const criticalPath = calculateCriticalPath(nodes, edges);

      // Mark critical edges
      const criticalSet = new Set(criticalPath);
      for (let i = 0; i < criticalPath.length - 1; i++) {
        const from = criticalPath[i + 1]; // The dependent item
        const to = criticalPath[i]; // The item it depends on
        for (const edge of edges) {
          if (edge.from === from && edge.to === to) {
            edge.isCritical = true;
          }
        }
      }

      // Detect cycles
      const cycles = detectCycles(adjacency, nodes.map((n) => n.id));

      return {
        nodes,
        edges,
        criticalPath,
        cycles,
      };
    },

    async addDependency(workItemId: string, dependsOnId: string): Promise<void> {
      // Validate both items exist and are in the same spec
      const [item, dependsOn] = await Promise.all([
        prisma.workItem.findUnique({ where: { id: workItemId } }),
        prisma.workItem.findUnique({ where: { id: dependsOnId } }),
      ]);

      if (!item) {
        throw new Error('Work item not found');
      }

      if (!dependsOn) {
        throw new Error('Dependency target not found');
      }

      if (item.specId !== dependsOn.specId) {
        throw new Error('Cannot add dependency across different specs');
      }

      if (workItemId === dependsOnId) {
        throw new Error('Cannot add self-dependency');
      }

      // Check if dependency already exists
      if (item.dependsOnIds.includes(dependsOnId)) {
        throw new Error('Dependency already exists');
      }

      // Get all work items in this spec to check for cycles
      const allItems = await prisma.workItem.findMany({
        where: { specId: item.specId },
        select: { id: true, dependsOnIds: true },
      });

      // Build adjacency for cycle check
      const adjacency = new Map<string, string[]>();
      for (const wi of allItems) {
        adjacency.set(wi.id, [...wi.dependsOnIds]);
      }

      // Temporarily add the new dependency
      const currentDeps = adjacency.get(workItemId) || [];
      currentDeps.push(dependsOnId);
      adjacency.set(workItemId, currentDeps);

      // Check for cycle
      if (wouldCreateCycle(workItemId, dependsOnId, adjacency)) {
        throw new Error('CYCLE_DETECTED: Adding this dependency would create a circular dependency');
      }

      // Add the dependency
      await prisma.workItem.update({
        where: { id: workItemId },
        data: {
          dependsOnIds: [...item.dependsOnIds, dependsOnId],
        },
      });
    },

    async removeDependency(workItemId: string, dependsOnId: string): Promise<void> {
      const item = await prisma.workItem.findUnique({ where: { id: workItemId } });

      if (!item) {
        throw new Error('Work item not found');
      }

      if (!item.dependsOnIds.includes(dependsOnId)) {
        throw new Error('Dependency does not exist');
      }

      await prisma.workItem.update({
        where: { id: workItemId },
        data: {
          dependsOnIds: item.dependsOnIds.filter((id) => id !== dependsOnId),
        },
      });
    },

    wouldCreateCycle(
      fromId: string,
      toId: string,
      edges: { from: string; to: string }[]
    ): boolean {
      const adjacency = new Map<string, string[]>();

      for (const edge of edges) {
        const neighbors = adjacency.get(edge.from) || [];
        neighbors.push(edge.to);
        adjacency.set(edge.from, neighbors);
      }

      return wouldCreateCycle(fromId, toId, adjacency);
    },
  };
}

// Singleton instance
let _dependencyService: DependencyService | null = null;

export function getDependencyService(): DependencyService {
  if (!_dependencyService) {
    _dependencyService = createDependencyService();
  }
  return _dependencyService;
}
