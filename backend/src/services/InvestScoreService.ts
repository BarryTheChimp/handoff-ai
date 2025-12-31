import { prisma } from '../lib/prisma.js';

/**
 * INVEST criteria for user story quality:
 * - Independent: Can be developed separately
 * - Negotiable: Details can be discussed
 * - Valuable: Delivers value to stakeholders
 * - Estimable: Can be sized/estimated
 * - Small: Fits in a sprint
 * - Testable: Has clear acceptance criteria
 */

export interface InvestScore {
  overall: number; // 0-100
  independent: CriterionScore;
  negotiable: CriterionScore;
  valuable: CriterionScore;
  estimable: CriterionScore;
  small: CriterionScore;
  testable: CriterionScore;
  suggestions: string[];
}

export interface CriterionScore {
  score: number; // 0-100
  reason: string;
  tips?: string[];
}

interface WorkItemData {
  id: string;
  type: string;
  title: string;
  description: string | null;
  acceptanceCriteria: string | null;
  technicalNotes: string | null;
  sizeEstimate: string | null;
  parentId: string | null;
  dependsOnIds: string[];
}

/**
 * Calculate INVEST score for a work item (primarily stories)
 */
export function calculateInvestScore(item: WorkItemData, siblings: WorkItemData[] = []): InvestScore {
  const scores: InvestScore = {
    overall: 0,
    independent: scoreIndependent(item, siblings),
    negotiable: scoreNegotiable(item),
    valuable: scoreValuable(item),
    estimable: scoreEstimable(item),
    small: scoreSmall(item),
    testable: scoreTestable(item),
    suggestions: [],
  };

  // Calculate overall as weighted average
  const weights = {
    independent: 0.15,
    negotiable: 0.10,
    valuable: 0.20,
    estimable: 0.15,
    small: 0.15,
    testable: 0.25,
  };

  scores.overall = Math.round(
    scores.independent.score * weights.independent +
    scores.negotiable.score * weights.negotiable +
    scores.valuable.score * weights.valuable +
    scores.estimable.score * weights.estimable +
    scores.small.score * weights.small +
    scores.testable.score * weights.testable
  );

  // Generate top suggestions
  const criteriaScores = [
    { name: 'testable', ...scores.testable },
    { name: 'valuable', ...scores.valuable },
    { name: 'independent', ...scores.independent },
    { name: 'estimable', ...scores.estimable },
    { name: 'small', ...scores.small },
    { name: 'negotiable', ...scores.negotiable },
  ];

  // Sort by score ascending (lowest first)
  criteriaScores.sort((a, b) => a.score - b.score);

  // Add suggestions for lowest scoring criteria
  for (const criterion of criteriaScores.slice(0, 3)) {
    if (criterion.score < 70 && criterion.tips && criterion.tips.length > 0) {
      scores.suggestions.push(criterion.tips[0]!);
    }
  }

  return scores;
}

function scoreIndependent(item: WorkItemData, siblings: WorkItemData[]): CriterionScore {
  let score = 100;
  const tips: string[] = [];

  // Check for dependencies
  if (item.dependsOnIds && item.dependsOnIds.length > 0) {
    score -= 20 * Math.min(item.dependsOnIds.length, 3);
    tips.push('Consider reducing dependencies to make this story more independent');
  }

  // Check title for coupling words
  const couplingWords = ['after', 'before', 'then', 'when', 'once', 'requires'];
  const titleLower = item.title.toLowerCase();
  for (const word of couplingWords) {
    if (titleLower.includes(word)) {
      score -= 10;
      tips.push('Story title suggests dependency on other work');
      break;
    }
  }

  // Check description for shared state references
  const descLower = (item.description || '').toLowerCase();
  const sharedStateWords = ['shared', 'global', 'depends on', 'requires', 'blocked by'];
  for (const word of sharedStateWords) {
    if (descLower.includes(word)) {
      score -= 15;
      tips.push('Description mentions shared state or dependencies');
      break;
    }
  }

  return {
    score: Math.max(0, score),
    reason: score >= 70 ? 'Story appears to be self-contained' : 'Story has dependencies on other work',
    tips: tips.length > 0 ? tips : undefined,
  };
}

function scoreNegotiable(item: WorkItemData): CriterionScore {
  let score = 70; // Start at 70 - negotiability is hard to measure
  const tips: string[] = [];

  // Check if description is too prescriptive
  const descLower = (item.description || '').toLowerCase();
  const prescriptiveWords = ['must use', 'only way', 'exactly', 'precisely', 'mandatory'];
  for (const word of prescriptiveWords) {
    if (descLower.includes(word)) {
      score -= 10;
      tips.push('Description is very prescriptive - leave room for implementation discussion');
    }
  }

  // Good if it has "As a... I want... So that..." format (focuses on need, not solution)
  if (descLower.includes('as a') && descLower.includes('i want') && descLower.includes('so that')) {
    score += 20;
  } else if (descLower.includes('as a') || descLower.includes('i want')) {
    score += 10;
    tips.push('Consider using full user story format: "As a... I want... So that..."');
  }

  // Check if description focuses on what not how
  const implementationWords = ['implement', 'code', 'database', 'api call', 'function'];
  let implementationCount = 0;
  for (const word of implementationWords) {
    if (descLower.includes(word)) {
      implementationCount++;
    }
  }
  if (implementationCount > 2) {
    score -= 15;
    tips.push('Description focuses too much on implementation details');
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reason: score >= 70 ? 'Story leaves room for discussion' : 'Story is too prescriptive',
    tips: tips.length > 0 ? tips : undefined,
  };
}

function scoreValuable(item: WorkItemData): CriterionScore {
  let score = 50; // Start neutral
  const tips: string[] = [];

  const descLower = (item.description || '').toLowerCase();
  const titleLower = item.title.toLowerCase();
  const combined = `${titleLower} ${descLower}`;

  // Check for value-indicating words
  const valueWords = ['so that', 'benefit', 'value', 'enable', 'allow', 'improve', 'reduce', 'increase', 'save', 'user can', 'customer', 'patient'];
  for (const word of valueWords) {
    if (combined.includes(word)) {
      score += 10;
    }
  }

  // Check for stakeholder mention
  const stakeholders = ['user', 'customer', 'admin', 'patient', 'client', 'developer', 'manager'];
  let hasStakeholder = false;
  for (const stakeholder of stakeholders) {
    if (combined.includes(stakeholder)) {
      hasStakeholder = true;
      score += 10;
      break;
    }
  }
  if (!hasStakeholder) {
    tips.push('Identify who benefits from this story');
  }

  // Penalize technical-only stories
  const technicalOnly = ['refactor', 'cleanup', 'technical debt', 'upgrade', 'migration'];
  for (const word of technicalOnly) {
    if (titleLower.includes(word)) {
      score -= 10;
      tips.push('Connect technical work to business value');
      break;
    }
  }

  // No description is bad for value
  if (!item.description || item.description.trim().length < 20) {
    score -= 20;
    tips.push('Add a description explaining the value this story delivers');
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reason: score >= 70 ? 'Story clearly delivers value' : 'Story value is unclear',
    tips: tips.length > 0 ? tips : undefined,
  };
}

function scoreEstimable(item: WorkItemData): CriterionScore {
  let score = 50;
  const tips: string[] = [];

  // Has size estimate
  if (item.sizeEstimate) {
    score += 30;
  } else {
    tips.push('Add a size estimate (S/M/L/XL)');
  }

  // Has acceptance criteria (helps estimation)
  if (item.acceptanceCriteria && item.acceptanceCriteria.trim().length > 50) {
    score += 20;
  } else {
    tips.push('Clear acceptance criteria help with estimation');
  }

  // Has technical notes (helps estimation)
  if (item.technicalNotes && item.technicalNotes.trim().length > 30) {
    score += 15;
  }

  // Description length (too short = hard to estimate, too long = too complex)
  const descLength = (item.description || '').trim().length;
  if (descLength > 50 && descLength < 500) {
    score += 10;
  } else if (descLength < 20) {
    tips.push('Add more detail to make estimation easier');
  } else if (descLength > 1000) {
    tips.push('Story may be too complex - consider splitting');
  }

  // Vague words make estimation harder
  const vagueWords = ['maybe', 'possibly', 'might', 'could', 'tbd', 'todo', 'etc'];
  const combined = `${item.title} ${item.description || ''}`.toLowerCase();
  for (const word of vagueWords) {
    if (combined.includes(word)) {
      score -= 10;
      tips.push('Remove vague language to improve estimability');
      break;
    }
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reason: score >= 70 ? 'Story can be estimated' : 'Story is difficult to estimate',
    tips: tips.length > 0 ? tips : undefined,
  };
}

function scoreSmall(item: WorkItemData): CriterionScore {
  let score = 70;
  const tips: string[] = [];

  // Check size estimate
  const sizeScores: Record<string, number> = {
    'S': 100,
    'M': 80,
    'L': 50,
    'XL': 20,
  };

  if (item.sizeEstimate && sizeScores[item.sizeEstimate] !== undefined) {
    score = sizeScores[item.sizeEstimate]!;
    if (score < 50) {
      tips.push('Consider breaking this into smaller stories');
    }
  }

  // Check acceptance criteria count (many AC = large story)
  const acCount = (item.acceptanceCriteria || '').split(/\n|given|when|then|and|\*|-|\d\./i).filter(s => s.trim().length > 10).length;
  if (acCount > 8) {
    score -= 20;
    tips.push(`Story has ${acCount} acceptance criteria - consider splitting`);
  } else if (acCount > 5) {
    score -= 10;
  }

  // Check for "and" in title (suggests multiple stories)
  if (item.title.toLowerCase().includes(' and ')) {
    score -= 15;
    tips.push('Title contains "and" - may be multiple stories');
  }

  // Very long description
  const descLength = (item.description || '').length;
  if (descLength > 800) {
    score -= 15;
    tips.push('Long description suggests story may be too large');
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reason: score >= 70 ? 'Story is appropriately sized' : 'Story may be too large',
    tips: tips.length > 0 ? tips : undefined,
  };
}

function scoreTestable(item: WorkItemData): CriterionScore {
  let score = 30; // Start low - need AC to be testable
  const tips: string[] = [];

  const ac = item.acceptanceCriteria || '';
  const acLower = ac.toLowerCase();

  // Has acceptance criteria
  if (ac.trim().length > 20) {
    score += 30;
  } else {
    tips.push('Add acceptance criteria to make the story testable');
    return {
      score: Math.max(0, score),
      reason: 'Story has no acceptance criteria',
      tips,
    };
  }

  // Uses Given/When/Then format
  if (acLower.includes('given') && acLower.includes('when') && acLower.includes('then')) {
    score += 25;
  } else if (acLower.includes('given') || acLower.includes('when') || acLower.includes('then')) {
    score += 10;
    tips.push('Use complete Given/When/Then format for clearer tests');
  }

  // Has specific/measurable criteria
  const measurableWords = ['should', 'must', 'displays', 'shows', 'returns', 'navigates', 'receives', 'sends', 'validates', 'error message', 'success'];
  let measurableCount = 0;
  for (const word of measurableWords) {
    if (acLower.includes(word)) {
      measurableCount++;
    }
  }
  if (measurableCount >= 3) {
    score += 15;
  } else if (measurableCount >= 1) {
    score += 5;
    tips.push('Add more specific, measurable acceptance criteria');
  } else {
    tips.push('Acceptance criteria should be specific and measurable');
  }

  // Check for edge cases mentioned
  const edgeCaseWords = ['error', 'invalid', 'empty', 'maximum', 'minimum', 'timeout', 'failure'];
  let hasEdgeCases = false;
  for (const word of edgeCaseWords) {
    if (acLower.includes(word)) {
      hasEdgeCases = true;
      break;
    }
  }
  if (hasEdgeCases) {
    score += 10;
  } else {
    tips.push('Consider adding edge cases and error scenarios');
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reason: score >= 70 ? 'Story has clear, testable criteria' : 'Story needs clearer acceptance criteria',
    tips: tips.length > 0 ? tips : undefined,
  };
}

export interface InvestScoreService {
  getScore(workItemId: string): Promise<InvestScore>;
  getScoreForItem(item: WorkItemData, siblings?: WorkItemData[]): InvestScore;
}

export function createInvestScoreService(): InvestScoreService {
  return {
    async getScore(workItemId: string): Promise<InvestScore> {
      const item = await prisma.workItem.findUnique({
        where: { id: workItemId },
      });

      if (!item) {
        throw new Error(`Work item not found: ${workItemId}`);
      }

      // Get siblings for independence check
      let siblings: WorkItemData[] = [];
      if (item.parentId) {
        const siblingItems = await prisma.workItem.findMany({
          where: {
            parentId: item.parentId,
            id: { not: workItemId },
          },
        });
        siblings = siblingItems.map(s => ({
          id: s.id,
          type: s.type,
          title: s.title,
          description: s.description,
          acceptanceCriteria: s.acceptanceCriteria,
          technicalNotes: s.technicalNotes,
          sizeEstimate: s.sizeEstimate,
          parentId: s.parentId,
          dependsOnIds: (s.dependsOnIds as string[]) || [],
        }));
      }

      return calculateInvestScore({
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        acceptanceCriteria: item.acceptanceCriteria,
        technicalNotes: item.technicalNotes,
        sizeEstimate: item.sizeEstimate,
        parentId: item.parentId,
        dependsOnIds: (item.dependsOnIds as string[]) || [],
      }, siblings);
    },

    getScoreForItem(item: WorkItemData, siblings: WorkItemData[] = []): InvestScore {
      return calculateInvestScore(item, siblings);
    },
  };
}

export const investScoreService = createInvestScoreService();
