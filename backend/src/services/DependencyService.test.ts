import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDependencyService } from './DependencyService.js';

// Mock Prisma
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    workItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '../lib/prisma.js';

describe('DependencyService', () => {
  let dependencyService: ReturnType<typeof createDependencyService>;

  beforeEach(() => {
    vi.clearAllMocks();
    dependencyService = createDependencyService();
  });

  describe('getGraph', () => {
    it('should return nodes and edges for a spec', async () => {
      const mockWorkItems = [
        { id: 'story-1', title: 'Story 1', type: 'story', sizeEstimate: 'M', status: 'draft', dependsOnIds: [] },
        { id: 'story-2', title: 'Story 2', type: 'story', sizeEstimate: 'S', status: 'draft', dependsOnIds: ['story-1'] },
        { id: 'story-3', title: 'Story 3', type: 'story', sizeEstimate: 'L', status: 'draft', dependsOnIds: ['story-2'] },
      ];

      vi.mocked(prisma.workItem.findMany).mockResolvedValue(mockWorkItems as any);

      const result = await dependencyService.getGraph('spec-1');

      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(2);
      expect(result.edges[0]).toEqual({ from: 'story-2', to: 'story-1', isCritical: expect.any(Boolean) });
    });

    it('should identify critical path', async () => {
      const mockWorkItems = [
        { id: 's1', title: 'Start', type: 'story', sizeEstimate: 'S', status: 'draft', dependsOnIds: [] },
        { id: 's2', title: 'Middle', type: 'story', sizeEstimate: 'L', status: 'draft', dependsOnIds: ['s1'] },
        { id: 's3', title: 'End', type: 'story', sizeEstimate: 'M', status: 'draft', dependsOnIds: ['s2'] },
      ];

      vi.mocked(prisma.workItem.findMany).mockResolvedValue(mockWorkItems as any);

      const result = await dependencyService.getGraph('spec-1');

      // Critical path should include the longest dependency chain
      expect(result.criticalPath.length).toBeGreaterThan(0);
    });

    it('should detect cycles', async () => {
      const mockWorkItems = [
        { id: 's1', title: 'A', type: 'story', sizeEstimate: 'S', status: 'draft', dependsOnIds: ['s3'] },
        { id: 's2', title: 'B', type: 'story', sizeEstimate: 'S', status: 'draft', dependsOnIds: ['s1'] },
        { id: 's3', title: 'C', type: 'story', sizeEstimate: 'S', status: 'draft', dependsOnIds: ['s2'] },
      ];

      vi.mocked(prisma.workItem.findMany).mockResolvedValue(mockWorkItems as any);

      const result = await dependencyService.getGraph('spec-1');

      expect(result.cycles.length).toBeGreaterThan(0);
    });

    it('should return empty graph for spec with no work items', async () => {
      vi.mocked(prisma.workItem.findMany).mockResolvedValue([]);

      const result = await dependencyService.getGraph('spec-1');

      expect(result.nodes).toHaveLength(0);
      expect(result.edges).toHaveLength(0);
      expect(result.criticalPath).toHaveLength(0);
      expect(result.cycles).toHaveLength(0);
    });
  });

  describe('addDependency', () => {
    it('should add a dependency between two work items', async () => {
      const mockWorkItem = {
        id: 'story-1',
        specId: 'spec-1',
        dependsOnIds: [],
      };
      const mockDependsOn = {
        id: 'story-2',
        specId: 'spec-1',
        dependsOnIds: [],
      };

      // Mock both findUnique calls (Promise.all)
      vi.mocked(prisma.workItem.findUnique)
        .mockResolvedValueOnce(mockWorkItem as any)
        .mockResolvedValueOnce(mockDependsOn as any);

      // Mock findMany for cycle detection
      vi.mocked(prisma.workItem.findMany).mockResolvedValue([mockWorkItem, mockDependsOn] as any);
      vi.mocked(prisma.workItem.update).mockResolvedValue({ ...mockWorkItem, dependsOnIds: ['story-2'] } as any);

      await dependencyService.addDependency('story-1', 'story-2');

      expect(prisma.workItem.update).toHaveBeenCalledWith({
        where: { id: 'story-1' },
        data: { dependsOnIds: ['story-2'] },
      });
    });

    it('should throw error for duplicate dependencies', async () => {
      const mockWorkItem = {
        id: 'story-1',
        specId: 'spec-1',
        dependsOnIds: ['story-2'],
      };
      const mockDependsOn = {
        id: 'story-2',
        specId: 'spec-1',
        dependsOnIds: [],
      };

      vi.mocked(prisma.workItem.findUnique)
        .mockResolvedValueOnce(mockWorkItem as any)
        .mockResolvedValueOnce(mockDependsOn as any);

      await expect(
        dependencyService.addDependency('story-1', 'story-2')
      ).rejects.toThrow('Dependency already exists');
    });

    it('should throw error if work item not found', async () => {
      vi.mocked(prisma.workItem.findUnique)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'story-2' } as any);

      await expect(
        dependencyService.addDependency('nonexistent', 'story-2')
      ).rejects.toThrow('Work item not found');
    });

    it('should throw error if dependency target not found', async () => {
      vi.mocked(prisma.workItem.findUnique)
        .mockResolvedValueOnce({ id: 'story-1', specId: 'spec-1', dependsOnIds: [] } as any)
        .mockResolvedValueOnce(null);

      await expect(
        dependencyService.addDependency('story-1', 'nonexistent')
      ).rejects.toThrow('Dependency target not found');
    });
  });

  describe('removeDependency', () => {
    it('should remove a dependency', async () => {
      const mockWorkItem = {
        id: 'story-1',
        dependsOnIds: ['story-2', 'story-3'],
      };

      vi.mocked(prisma.workItem.findUnique).mockResolvedValue(mockWorkItem as any);
      vi.mocked(prisma.workItem.update).mockResolvedValue({ ...mockWorkItem, dependsOnIds: ['story-3'] } as any);

      await dependencyService.removeDependency('story-1', 'story-2');

      expect(prisma.workItem.update).toHaveBeenCalledWith({
        where: { id: 'story-1' },
        data: { dependsOnIds: ['story-3'] },
      });
    });
  });

  describe('wouldCreateCycle', () => {
    it('should return true if adding dependency would create cycle', () => {
      // Existing edges: s1 -> s2 (s1 depends on s2)
      const edges = [
        { from: 's1', to: 's2' },
      ];

      // If we add s2 -> s1 (s2 depends on s1), it creates a cycle
      const result = dependencyService.wouldCreateCycle('s2', 's1', edges);

      expect(result).toBe(true);
    });

    it('should return false if adding dependency would not create cycle', () => {
      // No existing edges
      const edges: { from: string; to: string }[] = [];

      // Adding s1 -> s2 doesn't create a cycle
      const result = dependencyService.wouldCreateCycle('s1', 's2', edges);

      expect(result).toBe(false);
    });

    it('should detect transitive cycles', () => {
      // Existing: s1 -> s2 -> s3
      const edges = [
        { from: 's1', to: 's2' },
        { from: 's2', to: 's3' },
      ];

      // If we add s3 -> s1, it creates cycle: s1 -> s2 -> s3 -> s1
      const result = dependencyService.wouldCreateCycle('s3', 's1', edges);

      expect(result).toBe(true);
    });
  });
});
