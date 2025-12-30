import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCoverageService } from './CoverageService.js';

// Mock Prisma
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    specSection: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '../lib/prisma.js';

describe('CoverageService', () => {
  let coverageService: ReturnType<typeof createCoverageService>;

  beforeEach(() => {
    vi.clearAllMocks();
    coverageService = createCoverageService();
  });

  describe('calculateCoverage', () => {
    it('should calculate coverage for all sections', async () => {
      // The real service uses findMany with include for workItemSources
      const mockSections = [
        {
          id: 'sec-1',
          sectionRef: '1.1',
          heading: 'Introduction',
          content: 'Intro text...',
          orderIndex: 0,
          intentionallyUncovered: false,
          workItemSources: [
            { relevanceScore: 0.9, workItem: { id: 'story-1', title: 'Story 1' } },
            { relevanceScore: 0.7, workItem: { id: 'story-2', title: 'Story 2' } },
          ],
        },
        {
          id: 'sec-2',
          sectionRef: '1.2',
          heading: 'Requirements',
          content: 'Req text...',
          orderIndex: 1,
          intentionallyUncovered: false,
          workItemSources: [],
        },
        {
          id: 'sec-3',
          sectionRef: '1.3',
          heading: 'Appendix',
          content: 'Appendix...',
          orderIndex: 2,
          intentionallyUncovered: true,
          workItemSources: [],
        },
      ];

      vi.mocked(prisma.specSection.findMany).mockResolvedValue(mockSections as any);

      const result = await coverageService.calculateCoverage('spec-1');

      expect(result.totalSections).toBe(3);
      expect(result.coveredSections).toBe(2); // sec-1 has stories, sec-3 is intentionally uncovered
      expect(result.uncoveredCount).toBe(1); // sec-2 is uncovered
      expect(result.coveragePercent).toBe(67); // 2 covered out of 3
    });

    it('should include story details for each section', async () => {
      const mockSections = [
        {
          id: 'sec-1',
          sectionRef: '1.1',
          heading: 'Feature',
          content: 'Feature description...',
          orderIndex: 0,
          intentionallyUncovered: false,
          workItemSources: [
            { relevanceScore: 0.95, workItem: { id: 'story-1', title: 'Implement Feature' } },
          ],
        },
      ];

      vi.mocked(prisma.specSection.findMany).mockResolvedValue(mockSections as any);

      const result = await coverageService.calculateCoverage('spec-1');

      expect(result.sections[0].stories).toHaveLength(1);
      expect(result.sections[0].stories[0].title).toBe('Implement Feature');
      expect(result.sections[0].stories[0].relevance).toBe(0.95);
    });

    it('should handle spec with no sections', async () => {
      vi.mocked(prisma.specSection.findMany).mockResolvedValue([]);

      const result = await coverageService.calculateCoverage('spec-1');

      expect(result.totalSections).toBe(0);
      expect(result.coveredSections).toBe(0);
      expect(result.coveragePercent).toBe(100); // Empty spec is 100% covered
    });

    it('should handle fully covered spec', async () => {
      const mockSections = [
        {
          id: 'sec-1',
          sectionRef: '1.1',
          heading: 'Section 1',
          content: 'Content...',
          orderIndex: 0,
          intentionallyUncovered: false,
          workItemSources: [
            { relevanceScore: 0.9, workItem: { id: 'story-1', title: 'Story 1' } },
          ],
        },
        {
          id: 'sec-2',
          sectionRef: '1.2',
          heading: 'Section 2',
          content: 'Content...',
          orderIndex: 1,
          intentionallyUncovered: false,
          workItemSources: [
            { relevanceScore: 0.8, workItem: { id: 'story-2', title: 'Story 2' } },
          ],
        },
      ];

      vi.mocked(prisma.specSection.findMany).mockResolvedValue(mockSections as any);

      const result = await coverageService.calculateCoverage('spec-1');

      expect(result.coveragePercent).toBe(100);
      expect(result.uncoveredCount).toBe(0);
    });
  });

  describe('markSectionCovered', () => {
    it('should mark section as intentionally uncovered', async () => {
      const mockSection = {
        id: 'sec-1',
        intentionallyUncovered: false,
      };

      vi.mocked(prisma.specSection.findUnique).mockResolvedValue(mockSection as any);
      vi.mocked(prisma.specSection.update).mockResolvedValue({ ...mockSection, intentionallyUncovered: true } as any);

      await coverageService.markSectionCovered('sec-1', true);

      expect(prisma.specSection.update).toHaveBeenCalledWith({
        where: { id: 'sec-1' },
        data: { intentionallyUncovered: true },
      });
    });

    it('should mark section as needing coverage', async () => {
      const mockSection = {
        id: 'sec-1',
        intentionallyUncovered: true,
      };

      vi.mocked(prisma.specSection.findUnique).mockResolvedValue(mockSection as any);
      vi.mocked(prisma.specSection.update).mockResolvedValue({ ...mockSection, intentionallyUncovered: false } as any);

      await coverageService.markSectionCovered('sec-1', false);

      expect(prisma.specSection.update).toHaveBeenCalledWith({
        where: { id: 'sec-1' },
        data: { intentionallyUncovered: false },
      });
    });

    it('should throw error if section not found', async () => {
      vi.mocked(prisma.specSection.findUnique).mockResolvedValue(null);

      await expect(
        coverageService.markSectionCovered('nonexistent', true)
      ).rejects.toThrow('Section not found');
    });
  });
});
