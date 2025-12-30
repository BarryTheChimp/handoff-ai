import { prisma } from '../lib/prisma.js';

export interface StoryReference {
  id: string;
  title: string;
  relevance: number;
}

export interface SectionCoverage {
  id: string;
  sectionRef: string;
  heading: string;
  contentPreview: string;
  storyCount: number;
  stories: StoryReference[];
  intentionallyUncovered: boolean;
}

export interface CoverageData {
  totalSections: number;
  coveredSections: number;
  coveragePercent: number;
  uncoveredCount: number;
  sections: SectionCoverage[];
}

export interface CoverageService {
  calculateCoverage(specId: string): Promise<CoverageData>;
  markSectionCovered(sectionId: string, intentionallyUncovered: boolean, reason?: string): Promise<void>;
}

function compareSectionRefs(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aNum = aParts[i] || 0;
    const bNum = bParts[i] || 0;
    if (aNum !== bNum) {
      return aNum - bNum;
    }
  }

  return 0;
}

export function createCoverageService(): CoverageService {
  return {
    async calculateCoverage(specId: string): Promise<CoverageData> {
      const sections = await prisma.specSection.findMany({
        where: { specId },
        include: {
          workItemSources: {
            include: {
              workItem: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
        orderBy: { orderIndex: 'asc' },
      });

      const sectionCoverages: SectionCoverage[] = sections.map((section) => ({
        id: section.id,
        sectionRef: section.sectionRef,
        heading: section.heading,
        contentPreview: section.content.substring(0, 200) + (section.content.length > 200 ? '...' : ''),
        storyCount: section.workItemSources.length,
        stories: section.workItemSources.map((source) => ({
          id: source.workItem.id,
          title: source.workItem.title,
          relevance: source.relevanceScore,
        })),
        intentionallyUncovered: section.intentionallyUncovered,
      }));

      // Sort by section reference
      sectionCoverages.sort((a, b) => compareSectionRefs(a.sectionRef, b.sectionRef));

      const totalSections = sectionCoverages.length;
      const coveredSections = sectionCoverages.filter(
        (s) => s.storyCount > 0 || s.intentionallyUncovered
      ).length;
      const uncoveredCount = sectionCoverages.filter(
        (s) => s.storyCount === 0 && !s.intentionallyUncovered
      ).length;

      const coveragePercent = totalSections > 0
        ? Math.round((coveredSections / totalSections) * 100)
        : 100;

      return {
        totalSections,
        coveredSections,
        coveragePercent,
        uncoveredCount,
        sections: sectionCoverages,
      };
    },

    async markSectionCovered(sectionId: string, intentionallyUncovered: boolean): Promise<void> {
      const section = await prisma.specSection.findUnique({
        where: { id: sectionId },
      });

      if (!section) {
        throw new Error('Section not found');
      }

      await prisma.specSection.update({
        where: { id: sectionId },
        data: { intentionallyUncovered },
      });
    },
  };
}

// Singleton instance
let _coverageService: CoverageService | null = null;

export function getCoverageService(): CoverageService {
  if (!_coverageService) {
    _coverageService = createCoverageService();
  }
  return _coverageService;
}
