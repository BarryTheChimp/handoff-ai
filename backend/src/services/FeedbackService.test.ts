import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFeedbackService, createPreferenceService } from './FeedbackService.js';

// Mock Prisma
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    workItem: {
      findUnique: vi.fn(),
    },
    aIFeedback: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    teamPreference: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    spec: {
      findMany: vi.fn(),
    },
  },
}));

// Mock Anthropic as a class
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: '{"preferences": []}' }],
        }),
      };
    },
  };
});

import { prisma } from '../lib/prisma.js';

describe('FeedbackService', () => {
  let feedbackService: ReturnType<typeof createFeedbackService>;

  beforeEach(() => {
    vi.clearAllMocks();
    feedbackService = createFeedbackService();
  });

  describe('submitFeedback', () => {
    it('should submit feedback with valid rating 5 (thumbs up)', async () => {
      const mockWorkItem = { id: 'work-item-1' };
      const mockFeedback = {
        id: 'feedback-1',
        workItemId: 'work-item-1',
        userId: 'user-1',
        rating: 5,
        feedback: 'Great job!',
        categories: [],
        createdAt: new Date(),
      };

      vi.mocked(prisma.workItem.findUnique).mockResolvedValue(mockWorkItem as any);
      vi.mocked(prisma.aIFeedback.upsert).mockResolvedValue(mockFeedback as any);

      const result = await feedbackService.submitFeedback('work-item-1', 'user-1', {
        rating: 5,
        feedback: 'Great job!',
      });

      expect(result.rating).toBe(5);
      expect(result.feedback).toBe('Great job!');
    });

    it('should submit feedback with valid rating 1 (thumbs down)', async () => {
      const mockWorkItem = { id: 'work-item-1' };
      const mockFeedback = {
        id: 'feedback-1',
        workItemId: 'work-item-1',
        userId: 'user-1',
        rating: 1,
        feedback: 'Needs improvement',
        categories: ['too_vague'],
        createdAt: new Date(),
      };

      vi.mocked(prisma.workItem.findUnique).mockResolvedValue(mockWorkItem as any);
      vi.mocked(prisma.aIFeedback.upsert).mockResolvedValue(mockFeedback as any);

      const result = await feedbackService.submitFeedback('work-item-1', 'user-1', {
        rating: 1,
        feedback: 'Needs improvement',
        categories: ['too_vague'],
      });

      expect(result.rating).toBe(1);
      expect(result.categories).toContain('too_vague');
    });

    it('should throw error for invalid rating', async () => {
      await expect(
        feedbackService.submitFeedback('work-item-1', 'user-1', { rating: 3 })
      ).rejects.toThrow('Rating must be 1 (thumbs down) or 5 (thumbs up)');
    });

    it('should throw error if work item not found', async () => {
      vi.mocked(prisma.workItem.findUnique).mockResolvedValue(null);

      await expect(
        feedbackService.submitFeedback('nonexistent', 'user-1', { rating: 5 })
      ).rejects.toThrow('Work item not found');
    });
  });

  describe('getFeedback', () => {
    it('should return all feedback for a work item', async () => {
      const mockFeedbacks = [
        { id: '1', workItemId: 'wi-1', userId: 'u-1', rating: 5, feedback: null, categories: [], createdAt: new Date() },
        { id: '2', workItemId: 'wi-1', userId: 'u-2', rating: 1, feedback: 'Bad', categories: [], createdAt: new Date() },
      ];

      vi.mocked(prisma.aIFeedback.findMany).mockResolvedValue(mockFeedbacks as any);

      const result = await feedbackService.getFeedback('wi-1');

      expect(result).toHaveLength(2);
      expect(result[0].rating).toBe(5);
      expect(result[1].rating).toBe(1);
    });
  });

  describe('getFeedbackByUser', () => {
    it('should return user feedback if exists', async () => {
      const mockFeedback = {
        id: '1',
        workItemId: 'wi-1',
        userId: 'u-1',
        rating: 5,
        feedback: 'Good',
        categories: [],
        createdAt: new Date(),
      };

      vi.mocked(prisma.aIFeedback.findUnique).mockResolvedValue(mockFeedback as any);

      const result = await feedbackService.getFeedbackByUser('wi-1', 'u-1');

      expect(result).not.toBeNull();
      expect(result?.rating).toBe(5);
    });

    it('should return null if no feedback exists', async () => {
      vi.mocked(prisma.aIFeedback.findUnique).mockResolvedValue(null);

      const result = await feedbackService.getFeedbackByUser('wi-1', 'u-1');

      expect(result).toBeNull();
    });
  });
});

describe('PreferenceService', () => {
  let preferenceService: ReturnType<typeof createPreferenceService>;

  beforeEach(() => {
    vi.clearAllMocks();
    preferenceService = createPreferenceService();
  });

  describe('list', () => {
    it('should return all preferences for a project', async () => {
      const mockPreferences = [
        { id: '1', projectId: 'p-1', preference: 'Keep AC short', description: null, category: 'ac_format', learnedFrom: [], active: true, createdAt: new Date() },
        { id: '2', projectId: 'p-1', preference: 'Use Gherkin', description: null, category: 'ac_format', learnedFrom: [], active: false, createdAt: new Date() },
      ];

      vi.mocked(prisma.teamPreference.findMany).mockResolvedValue(mockPreferences as any);

      const result = await preferenceService.list('p-1');

      expect(result).toHaveLength(2);
    });
  });

  describe('create', () => {
    it('should create a new preference', async () => {
      const mockPreference = {
        id: '1',
        projectId: 'p-1',
        preference: 'Keep AC to 5 items max',
        description: 'Team prefers concise ACs',
        category: 'ac_format',
        learnedFrom: [],
        active: true,
        createdAt: new Date(),
      };

      vi.mocked(prisma.teamPreference.create).mockResolvedValue(mockPreference as any);

      const result = await preferenceService.create(
        'p-1',
        'Keep AC to 5 items max',
        'Team prefers concise ACs',
        'ac_format'
      );

      expect(result.preference).toBe('Keep AC to 5 items max');
      expect(result.active).toBe(true);
    });
  });

  describe('update', () => {
    it('should toggle preference active status', async () => {
      const mockPreference = {
        id: '1',
        projectId: 'p-1',
        preference: 'Use Gherkin',
        description: null,
        category: 'ac_format',
        learnedFrom: [],
        active: true,
        createdAt: new Date(),
      };

      vi.mocked(prisma.teamPreference.update).mockResolvedValue(mockPreference as any);

      const result = await preferenceService.update('1', true);

      expect(result.active).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete a preference', async () => {
      vi.mocked(prisma.teamPreference.delete).mockResolvedValue({} as any);

      await expect(preferenceService.delete('1')).resolves.not.toThrow();
    });
  });

  describe('getActivePreferences', () => {
    it('should return only active preferences', async () => {
      const mockPreferences = [
        { id: '1', projectId: 'p-1', preference: 'Active pref', description: null, category: 'style', learnedFrom: [], active: true, createdAt: new Date() },
      ];

      vi.mocked(prisma.teamPreference.findMany).mockResolvedValue(mockPreferences as any);

      const result = await preferenceService.getActivePreferences('p-1');

      expect(result).toHaveLength(1);
      expect(result[0].active).toBe(true);
    });
  });

  describe('buildPromptAdditions', () => {
    it('should build prompt additions from active preferences', async () => {
      const mockPreferences = [
        { id: '1', projectId: 'p-1', preference: 'Keep AC short', description: null, category: 'ac_format', learnedFrom: [], active: true, createdAt: new Date() },
        { id: '2', projectId: 'p-1', preference: 'Use technical terms', description: null, category: 'terminology', learnedFrom: [], active: true, createdAt: new Date() },
      ];

      vi.mocked(prisma.teamPreference.findMany).mockResolvedValue(mockPreferences as any);

      const result = await preferenceService.buildPromptAdditions('p-1');

      expect(result).toContain('## Team Preferences');
      expect(result).toContain('Keep AC short');
      expect(result).toContain('Use technical terms');
    });

    it('should return empty string if no active preferences', async () => {
      vi.mocked(prisma.teamPreference.findMany).mockResolvedValue([]);

      const result = await preferenceService.buildPromptAdditions('p-1');

      expect(result).toBe('');
    });
  });
});
