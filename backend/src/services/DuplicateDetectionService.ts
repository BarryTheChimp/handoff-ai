import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();
const anthropic = new Anthropic();

export interface DuplicatePair {
  item1Id: string;
  item1Title: string;
  item2Id: string;
  item2Title: string;
  similarity: number; // 0-1
  duplicateType: 'exact' | 'near' | 'overlapping' | 'related';
  sharedConcepts: string[];
  recommendation: 'merge' | 'keep_both' | 'review';
  explanation: string;
}

export interface DuplicateReport {
  specId: string;
  analyzedCount: number;
  duplicatesFound: number;
  pairs: DuplicatePair[];
  riskLevel: 'low' | 'medium' | 'high';
}

export class DuplicateDetectionService {
  // Simple text similarity using Jaccard index
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3));

    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  async detectDuplicates(specId: string): Promise<DuplicateReport> {
    const workItems = await prisma.workItem.findMany({
      where: { specId },
      select: {
        id: true,
        title: true,
        description: true,
        acceptanceCriteria: true,
        type: true,
      },
    });

    const pairs: DuplicatePair[] = [];
    const threshold = 0.4; // Similarity threshold

    // Compare each pair of work items
    for (let i = 0; i < workItems.length; i++) {
      for (let j = i + 1; j < workItems.length; j++) {
        const item1 = workItems[i];
        const item2 = workItems[j];

        // Combine title, description, and AC for comparison
        const text1 = `${item1.title} ${item1.description || ''} ${JSON.stringify(item1.acceptanceCriteria || [])}`;
        const text2 = `${item2.title} ${item2.description || ''} ${JSON.stringify(item2.acceptanceCriteria || [])}`;

        const similarity = this.calculateSimilarity(text1, text2);

        if (similarity >= threshold) {
          let duplicateType: DuplicatePair['duplicateType'] = 'related';
          let recommendation: DuplicatePair['recommendation'] = 'review';

          if (similarity >= 0.9) {
            duplicateType = 'exact';
            recommendation = 'merge';
          } else if (similarity >= 0.7) {
            duplicateType = 'near';
            recommendation = 'merge';
          } else if (similarity >= 0.5) {
            duplicateType = 'overlapping';
            recommendation = 'review';
          }

          // Find shared concepts (words appearing in both)
          const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 4);
          const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 4));
          const shared = [...new Set(words1.filter(w => words2.has(w)))].slice(0, 5);

          pairs.push({
            item1Id: item1.id,
            item1Title: item1.title,
            item2Id: item2.id,
            item2Title: item2.title,
            similarity,
            duplicateType,
            sharedConcepts: shared,
            recommendation,
            explanation: this.getExplanation(duplicateType, similarity),
          });
        }
      }
    }

    // Sort by similarity descending
    pairs.sort((a, b) => b.similarity - a.similarity);

    // Determine risk level
    let riskLevel: DuplicateReport['riskLevel'] = 'low';
    const exactCount = pairs.filter(p => p.duplicateType === 'exact').length;
    const nearCount = pairs.filter(p => p.duplicateType === 'near').length;

    if (exactCount >= 3 || nearCount >= 5) {
      riskLevel = 'high';
    } else if (exactCount >= 1 || nearCount >= 3) {
      riskLevel = 'medium';
    }

    return {
      specId,
      analyzedCount: workItems.length,
      duplicatesFound: pairs.length,
      pairs,
      riskLevel,
    };
  }

  private getExplanation(type: DuplicatePair['duplicateType'], similarity: number): string {
    const percent = Math.round(similarity * 100);
    switch (type) {
      case 'exact':
        return `These items are ${percent}% similar and appear to describe the same requirement. Consider merging them.`;
      case 'near':
        return `These items share ${percent}% similarity and cover overlapping scope. Review for potential consolidation.`;
      case 'overlapping':
        return `These items have ${percent}% overlap in their requirements. Check for redundant work.`;
      case 'related':
        return `These items are ${percent}% related and may have dependencies. Consider linking them.`;
      default:
        return `Similarity: ${percent}%`;
    }
  }

  async analyzeWithAI(pair: DuplicatePair): Promise<{
    isTrueDuplicate: boolean;
    mergedTitle?: string;
    mergedDescription?: string;
    mergedAC?: string[];
  }> {
    const item1 = await prisma.workItem.findUnique({
      where: { id: pair.item1Id },
      select: { title: true, description: true, acceptanceCriteria: true },
    });

    const item2 = await prisma.workItem.findUnique({
      where: { id: pair.item2Id },
      select: { title: true, description: true, acceptanceCriteria: true },
    });

    if (!item1 || !item2) {
      return { isTrueDuplicate: false };
    }

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Analyze these two work items for duplication:

Item 1:
- Title: ${item1.title}
- Description: ${item1.description || 'None'}
- Acceptance Criteria: ${JSON.stringify(item1.acceptanceCriteria || [])}

Item 2:
- Title: ${item2.title}
- Description: ${item2.description || 'None'}
- Acceptance Criteria: ${JSON.stringify(item2.acceptanceCriteria || [])}

Determine:
1. Are these true duplicates that should be merged?
2. If yes, provide a merged version that combines the best of both.

Return JSON:
{
  "isTrueDuplicate": true/false,
  "mergedTitle": "Combined title if duplicate",
  "mergedDescription": "Combined description if duplicate",
  "mergedAC": ["Combined AC 1", "Combined AC 2"]
}`
          }
        ],
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        return { isTrueDuplicate: false };
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { isTrueDuplicate: false };
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('AI analysis failed:', error);
      return { isTrueDuplicate: pair.similarity >= 0.8 };
    }
  }

  async mergeItems(
    item1Id: string,
    item2Id: string,
    mergedData: { title: string; description: string; acceptanceCriteria: string[] }
  ): Promise<string> {
    const item1 = await prisma.workItem.findUnique({ where: { id: item1Id } });
    const item2 = await prisma.workItem.findUnique({ where: { id: item2Id } });

    if (!item1 || !item2) {
      throw new Error('Work items not found');
    }

    // Update item1 with merged content
    const existingCustomFields = item1.customFields as Record<string, unknown> || {};
    await prisma.workItem.update({
      where: { id: item1Id },
      data: {
        title: mergedData.title,
        description: mergedData.description,
        acceptanceCriteria: Array.isArray(mergedData.acceptanceCriteria)
          ? mergedData.acceptanceCriteria.join('\n')
          : mergedData.acceptanceCriteria,
        customFields: {
          ...existingCustomFields,
          mergedWith: item2Id,
          mergedAt: new Date().toISOString(),
        },
      },
    });

    // Delete item2
    await prisma.workItem.delete({ where: { id: item2Id } });

    return item1Id;
  }
}

export const duplicateDetectionService = new DuplicateDetectionService();
