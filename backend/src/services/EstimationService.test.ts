import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEstimationService } from './EstimationService.js';

// Mock Prisma
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    workItem: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    workItemHistory: {
      create: vi.fn(),
    },
    bulkOperation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation((arr) => Promise.all(arr)),
  },
}));

// Mock Anthropic as a class
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn().mockResolvedValue({
          content: [{
            type: 'text',
            text: JSON.stringify({
              size: 'M',
              confidence: 'high',
              rationale: 'Medium complexity based on acceptance criteria',
              factors: {
                acCount: 3,
                complexitySignals: ['API integration'],
                dependencies: 1,
                unknowns: 0,
              },
            }),
          }],
        }),
      };
    },
  };
});

import { prisma } from '../lib/prisma.js';

describe('EstimationService', () => {
  let estimationService: ReturnType<typeof createEstimationService>;

  beforeEach(() => {
    vi.clearAllMocks();
    estimationService = createEstimationService();
  });

  describe('estimateSingle', () => {
    it('should estimate a work item and return suggestion', async () => {
      const mockWorkItem = {
        id: 'story-1',
        title: 'Implement user login',
        description: 'Add login functionality',
        acceptanceCriteria: '- User can enter credentials\n- System validates input\n- User is redirected on success',
        technicalNotes: 'Use JWT tokens',
        type: 'story',
        sizeEstimate: null,
        dependsOnIds: [],
        _count: { sources: 0 },
      };

      vi.mocked(prisma.workItem.findUnique).mockResolvedValue(mockWorkItem as any);
      vi.mocked(prisma.workItem.update).mockResolvedValue({ ...mockWorkItem, sizeEstimate: 'M' } as any);
      vi.mocked(prisma.workItemHistory.create).mockResolvedValue({} as any);

      // Service signature: estimateSingle(workItemId: string, apply?: boolean)
      const result = await estimationService.estimateSingle('story-1', true);

      expect(result.suggestedSize).toBe('M');
      expect(result.confidence).toBe('high');
      expect(result.rationale).toBeDefined();
      expect(result.factors).toBeDefined();
    });

    it('should throw error if work item not found', async () => {
      vi.mocked(prisma.workItem.findUnique).mockResolvedValue(null);

      await expect(
        estimationService.estimateSingle('nonexistent', true)
      ).rejects.toThrow('Work item not found');
    });

    it('should return result without applying when apply is false', async () => {
      const mockWorkItem = {
        id: 'story-1',
        title: 'Implement user login',
        description: 'Add login functionality',
        acceptanceCriteria: '- User can enter credentials',
        technicalNotes: '',
        type: 'story',
        sizeEstimate: 'S',
        dependsOnIds: [],
        _count: { sources: 0 },
      };

      vi.mocked(prisma.workItem.findUnique).mockResolvedValue(mockWorkItem as any);

      // When apply is false, should not update the work item
      const result = await estimationService.estimateSingle('story-1', false);

      expect(result.suggestedSize).toBe('M');
      expect(result.applied).toBe(false);
      expect(prisma.workItem.update).not.toHaveBeenCalled();
    });
  });

  describe('estimateBatch', () => {
    it('should estimate multiple stories', async () => {
      const mockStories = [
        {
          id: 's1',
          title: 'Story 1',
          type: 'story',
          sizeEstimate: null,
          description: 'Desc 1',
          acceptanceCriteria: '- AC 1',
          technicalNotes: '',
          dependsOnIds: [],
        },
        {
          id: 's2',
          title: 'Story 2',
          type: 'story',
          sizeEstimate: null,
          description: 'Desc 2',
          acceptanceCriteria: '- AC 2',
          technicalNotes: '',
          dependsOnIds: [],
        },
      ];

      vi.mocked(prisma.workItem.findMany).mockResolvedValue(mockStories as any);
      vi.mocked(prisma.workItem.update).mockResolvedValue({} as any);
      vi.mocked(prisma.bulkOperation.create).mockResolvedValue({ id: 'bulk-1' } as any);

      // Service signature: estimateBatch(specId: string, options?: {...})
      const result = await estimationService.estimateBatch('spec-1', {});

      expect(result.estimated).toBe(2);
      expect(result.summary).toBeDefined();
      expect(result.undoToken).toBeDefined();
    });

    it('should skip stories with existing estimates by default', async () => {
      const mockStories = [
        {
          id: 's1',
          title: 'Story 1',
          type: 'story',
          sizeEstimate: 'S',
          description: 'Desc',
          acceptanceCriteria: '- AC',
          technicalNotes: '',
          dependsOnIds: [],
        },
        {
          id: 's2',
          title: 'Story 2',
          type: 'story',
          sizeEstimate: null,
          description: 'Desc',
          acceptanceCriteria: '- AC',
          technicalNotes: '',
          dependsOnIds: [],
        },
      ];

      vi.mocked(prisma.workItem.findMany).mockResolvedValue(mockStories as any);
      vi.mocked(prisma.workItem.update).mockResolvedValue({} as any);
      vi.mocked(prisma.bulkOperation.create).mockResolvedValue({ id: 'bulk-1' } as any);

      const result = await estimationService.estimateBatch('spec-1', {
        overwriteExisting: false,
      });

      expect(result.skipped).toBe(1);
      expect(result.estimated).toBe(1);
    });

    it('should overwrite existing estimates when option is set', async () => {
      const mockStories = [
        {
          id: 's1',
          title: 'Story 1',
          type: 'story',
          sizeEstimate: 'S',
          description: 'Desc',
          acceptanceCriteria: '- AC',
          technicalNotes: '',
          dependsOnIds: [],
        },
      ];

      vi.mocked(prisma.workItem.findMany).mockResolvedValue(mockStories as any);
      vi.mocked(prisma.workItem.update).mockResolvedValue({} as any);
      vi.mocked(prisma.bulkOperation.create).mockResolvedValue({ id: 'bulk-1' } as any);

      const result = await estimationService.estimateBatch('spec-1', {
        overwriteExisting: true,
      });

      expect(result.estimated).toBe(1);
      expect(result.skipped).toBe(0);
    });
  });

  describe('undoBatch', () => {
    it('should revert batch estimation', async () => {
      const mockBulkOp = {
        id: 'bulk-1',
        operation: 'batch_estimate',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        previousValues: {
          's1': null,
          's2': 'S',
        },
      };

      // Service signature: undoBatch(undoToken: string)
      vi.mocked(prisma.bulkOperation.findUnique).mockResolvedValue(mockBulkOp as any);
      vi.mocked(prisma.workItem.update).mockResolvedValue({} as any);
      vi.mocked(prisma.bulkOperation.delete).mockResolvedValue({} as any);

      const result = await estimationService.undoBatch('bulk-1');

      expect(result.reverted).toBe(2);
    });

    it('should throw error if undo token not found', async () => {
      vi.mocked(prisma.bulkOperation.findUnique).mockResolvedValue(null);

      await expect(
        estimationService.undoBatch('invalid-token')
      ).rejects.toThrow('Undo token not found or expired');
    });
  });
});
