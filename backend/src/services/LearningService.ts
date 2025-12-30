import { prisma } from '../lib/prisma.js';
import type { EditField, EditType, SuggestionType, PatternStatus, StoryEdit, LearnedPattern } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface EditTrackInput {
  workItemId: string;
  field: EditField;
  beforeValue: string;
  afterValue: string;
  userId: string;
}

export interface StoryEditData {
  id: string;
  projectId: string;
  workItemId: string;
  field: EditField;
  beforeValue: string;
  afterValue: string;
  editType: EditType;
  specId: string;
  userId: string;
  createdAt: Date;
}

export interface LearnedPatternData {
  id: string;
  projectId: string;
  pattern: string;
  description: string;
  confidence: number;
  occurrences: number;
  field: EditField;
  context: string | null;
  suggestion: string;
  suggestionType: SuggestionType;
  status: PatternStatus;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  appliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DetectedPattern {
  pattern: string;
  description: string;
  confidence: number;
  suggestion: string;
  suggestionType: SuggestionType;
  occurrences: number;
  field: EditField;
  context?: string;
}

export interface LearningStats {
  totalEdits: number;
  editsThisWeek: number;
  patternsDetected: number;
  patternsApplied: number;
  topEditedFields: Array<{ field: string; count: number }>;
}

// =============================================================================
// SERVICE INTERFACE
// =============================================================================

export interface LearningService {
  // Edit Tracking
  trackEdit(input: EditTrackInput): Promise<StoryEditData>;
  getEditsForWorkItem(workItemId: string): Promise<StoryEditData[]>;
  getEditsForProject(projectId: string, days?: number): Promise<StoryEditData[]>;

  // Pattern Detection
  detectPatterns(projectId: string): Promise<DetectedPattern[]>;
  getPendingPatterns(projectId: string): Promise<LearnedPatternData[]>;
  acceptPattern(patternId: string, userId: string): Promise<LearnedPatternData>;
  dismissPattern(patternId: string, userId: string): Promise<LearnedPatternData>;

  // Stats
  getLearningStats(projectId: string): Promise<LearningStats>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function classifyEdit(before: string, after: string): EditType {
  if (!before.trim()) return 'addition';
  if (!after.trim()) return 'removal';

  // Check if mostly new content
  const beforeWords = new Set(before.toLowerCase().split(/\s+/));
  const afterWords = after.toLowerCase().split(/\s+/);
  const newWords = afterWords.filter(w => !beforeWords.has(w));

  if (newWords.length > afterWords.length * 0.7) return 'complete';
  return 'modification';
}

function getAddedContent(before: string, after: string): string[] {
  const beforeLines = new Set(before.split('\n').map(l => l.trim()));
  const afterLines = after.split('\n').map(l => l.trim());
  return afterLines.filter(l => l && !beforeLines.has(l));
}

function extractPhrases(lines: string[]): string[] {
  // Extract meaningful phrases (3+ words)
  return lines
    .map(l => l.replace(/^[-*•]\s*/, '').trim())
    .filter(l => l.split(/\s+/).length >= 3);
}

function countOccurrences(items: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const normalized = item.toLowerCase();
    counts[normalized] = (counts[normalized] || 0) + 1;
  }
  return counts;
}

function groupBy<T>(items: T[], key: keyof T): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
  }
  return result;
}

function transformEdit(edit: StoryEdit): StoryEditData {
  return { ...edit };
}

function transformPattern(pattern: LearnedPattern): LearnedPatternData {
  return { ...pattern };
}

// =============================================================================
// PATTERN DETECTION FUNCTIONS
// =============================================================================

function detectACPatterns(edits: StoryEdit[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  // Find common phrases added
  const additions = edits
    .filter(e => e.editType === 'addition' || e.editType === 'modification')
    .map(e => getAddedContent(e.beforeValue, e.afterValue));

  // Look for recurring phrases
  const phrases = extractPhrases(additions.flat());
  const phraseCounts = countOccurrences(phrases);

  for (const [phrase, count] of Object.entries(phraseCounts)) {
    if (count >= 3 && phrase.length > 10) {
      patterns.push({
        pattern: phrase,
        description: `Users frequently add "${phrase.slice(0, 50)}..." to acceptance criteria`,
        confidence: Math.min(count / 10, 0.9),
        suggestion: `Always include: "${phrase}"`,
        suggestionType: 'addToPreferences',
        occurrences: count,
        field: 'acceptanceCriteria',
      });
    }
  }

  // Detect error handling additions
  const errorHandlingEdits = additions.filter(adds =>
    adds.some(a => /error|exception|fail|invalid|catch/i.test(a))
  );
  if (errorHandlingEdits.length >= 3) {
    patterns.push({
      pattern: 'error_handling',
      description: `Users add error handling to ${errorHandlingEdits.length} stories`,
      confidence: errorHandlingEdits.length / Math.max(additions.length, 1),
      suggestion: 'Always include error handling acceptance criteria',
      suggestionType: 'addRequiredSection',
      occurrences: errorHandlingEdits.length,
      field: 'acceptanceCriteria',
      context: 'Error Handling',
    });
  }

  // Detect validation additions
  const validationEdits = additions.filter(adds =>
    adds.some(a => /validate|validation|required|must be|should be/i.test(a))
  );
  if (validationEdits.length >= 3) {
    patterns.push({
      pattern: 'validation_requirements',
      description: `Users add validation requirements to ${validationEdits.length} stories`,
      confidence: validationEdits.length / Math.max(additions.length, 1),
      suggestion: 'Include validation acceptance criteria for input fields',
      suggestionType: 'addRequiredSection',
      occurrences: validationEdits.length,
      field: 'acceptanceCriteria',
      context: 'Validation',
    });
  }

  return patterns;
}

function detectDescriptionPatterns(edits: StoryEdit[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  // Look for common additions to descriptions
  const additions = edits
    .filter(e => e.editType === 'addition' || e.editType === 'modification')
    .map(e => getAddedContent(e.beforeValue, e.afterValue));

  // Detect "As a user" format additions
  const userStoryFormat = additions.filter(adds =>
    adds.some(a => /as a|so that|i want/i.test(a))
  );
  if (userStoryFormat.length >= 3) {
    patterns.push({
      pattern: 'user_story_format',
      description: `Users often rewrite descriptions in "As a user" format (${userStoryFormat.length} times)`,
      confidence: userStoryFormat.length / Math.max(additions.length, 1),
      suggestion: 'Use "As a [user], I want [goal], so that [benefit]" format',
      suggestionType: 'addToPreferences',
      occurrences: userStoryFormat.length,
      field: 'description',
      context: 'User Story Format',
    });
  }

  return patterns;
}

function detectTechNotesPatterns(edits: StoryEdit[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  // Look for common technical additions
  const additions = edits
    .filter(e => e.editType === 'addition' || e.editType === 'modification')
    .map(e => getAddedContent(e.beforeValue, e.afterValue));

  // Detect security considerations
  const securityEdits = additions.filter(adds =>
    adds.some(a => /security|authentication|authorization|encrypt|sanitize/i.test(a))
  );
  if (securityEdits.length >= 3) {
    patterns.push({
      pattern: 'security_considerations',
      description: `Users add security considerations to ${securityEdits.length} stories`,
      confidence: securityEdits.length / Math.max(additions.length, 1),
      suggestion: 'Include security considerations in technical notes',
      suggestionType: 'addRequiredSection',
      occurrences: securityEdits.length,
      field: 'technicalNotes',
      context: 'Security',
    });
  }

  // Detect performance considerations
  const performanceEdits = additions.filter(adds =>
    adds.some(a => /performance|cache|optimize|index|pagination/i.test(a))
  );
  if (performanceEdits.length >= 3) {
    patterns.push({
      pattern: 'performance_considerations',
      description: `Users add performance considerations to ${performanceEdits.length} stories`,
      confidence: performanceEdits.length / Math.max(additions.length, 1),
      suggestion: 'Include performance considerations in technical notes',
      suggestionType: 'addRequiredSection',
      occurrences: performanceEdits.length,
      field: 'technicalNotes',
      context: 'Performance',
    });
  }

  return patterns;
}

// =============================================================================
// IMPLEMENTATION
// =============================================================================

export function createLearningService(): LearningService {
  return {
    // =========================================================================
    // EDIT TRACKING
    // =========================================================================

    async trackEdit(input: EditTrackInput): Promise<StoryEditData> {
      // Skip if no actual change
      if (input.beforeValue.trim() === input.afterValue.trim()) {
        throw new Error('No actual change detected');
      }

      const workItem = await prisma.workItem.findUnique({
        where: { id: input.workItemId },
        include: { spec: true },
      });

      if (!workItem) {
        throw new Error('Work item not found');
      }

      // Determine edit type
      const editType = classifyEdit(input.beforeValue, input.afterValue);

      // Store edit
      const edit = await prisma.storyEdit.create({
        data: {
          projectId: workItem.spec.projectId,
          workItemId: input.workItemId,
          specId: workItem.specId,
          userId: input.userId,
          field: input.field,
          beforeValue: input.beforeValue,
          afterValue: input.afterValue,
          editType,
        },
      });

      // Trigger pattern detection (async, don't block)
      this.detectPatterns(workItem.spec.projectId).catch(err => {
        console.error('Pattern detection failed:', err);
      });

      return transformEdit(edit);
    },

    async getEditsForWorkItem(workItemId: string): Promise<StoryEditData[]> {
      const edits = await prisma.storyEdit.findMany({
        where: { workItemId },
        orderBy: { createdAt: 'desc' },
      });
      return edits.map(transformEdit);
    },

    async getEditsForProject(projectId: string, days = 7): Promise<StoryEditData[]> {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const edits = await prisma.storyEdit.findMany({
        where: {
          projectId,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
      });
      return edits.map(transformEdit);
    },

    // =========================================================================
    // PATTERN DETECTION
    // =========================================================================

    async detectPatterns(projectId: string): Promise<DetectedPattern[]> {
      const patterns: DetectedPattern[] = [];

      // Get recent edits
      const recentEdits = await prisma.storyEdit.findMany({
        where: {
          projectId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
        },
      });

      if (recentEdits.length < 3) {
        return patterns; // Not enough data
      }

      // Group by field
      const byField = groupBy(recentEdits, 'field');

      // Detect AC addition patterns
      if (byField.acceptanceCriteria) {
        const acPatterns = detectACPatterns(byField.acceptanceCriteria);
        patterns.push(...acPatterns);
      }

      // Detect description patterns
      if (byField.description) {
        const descPatterns = detectDescriptionPatterns(byField.description);
        patterns.push(...descPatterns);
      }

      // Detect technical notes patterns
      if (byField.technicalNotes) {
        const techPatterns = detectTechNotesPatterns(byField.technicalNotes);
        patterns.push(...techPatterns);
      }

      // Store significant patterns
      for (const pattern of patterns) {
        if (pattern.confidence >= 0.3 && pattern.occurrences >= 3) {
          // Check if similar pattern exists
          const existing = await prisma.learnedPattern.findFirst({
            where: {
              projectId,
              pattern: pattern.pattern,
              status: { in: ['pending', 'suggested'] },
            },
          });

          if (existing) {
            // Update occurrence count
            await prisma.learnedPattern.update({
              where: { id: existing.id },
              data: {
                occurrences: existing.occurrences + pattern.occurrences,
                confidence: Math.max(existing.confidence, pattern.confidence),
              },
            });
          } else {
            // Create new pattern
            await prisma.learnedPattern.create({
              data: {
                projectId,
                pattern: pattern.pattern,
                description: pattern.description,
                confidence: pattern.confidence,
                suggestion: pattern.suggestion,
                suggestionType: pattern.suggestionType,
                occurrences: pattern.occurrences,
                field: pattern.field,
                context: pattern.context,
              },
            });
          }
        }
      }

      return patterns;
    },

    async getPendingPatterns(projectId: string): Promise<LearnedPatternData[]> {
      const patterns = await prisma.learnedPattern.findMany({
        where: {
          projectId,
          status: { in: ['pending', 'suggested'] },
        },
        orderBy: [
          { confidence: 'desc' },
          { occurrences: 'desc' },
        ],
        take: 10,
      });

      // Mark as suggested if pending
      const pendingIds = patterns.filter(p => p.status === 'pending').map(p => p.id);
      if (pendingIds.length > 0) {
        await prisma.learnedPattern.updateMany({
          where: { id: { in: pendingIds } },
          data: { status: 'suggested' },
        });
      }

      return patterns.map(transformPattern);
    },

    async acceptPattern(patternId: string, userId: string): Promise<LearnedPatternData> {
      const pattern = await prisma.learnedPattern.findUnique({
        where: { id: patternId },
      });

      if (!pattern) {
        throw new Error('Pattern not found');
      }

      // Apply the pattern based on type
      if (pattern.suggestionType === 'addToPreferences') {
        // Add to team preferences
        await prisma.teamPreference.create({
          data: {
            projectId: pattern.projectId,
            preference: pattern.suggestion,
            description: pattern.description,
            category: pattern.context,
            learnedFrom: [patternId],
            active: true,
          },
        });
      } else if (pattern.suggestionType === 'addRequiredSection') {
        // Add to preferences config required sections
        const config = await prisma.teamPreferencesConfig.findUnique({
          where: { projectId: pattern.projectId },
        });

        if (config) {
          const currentSections = config.requiredSections || [];
          const newSection = pattern.context || pattern.pattern;
          if (!currentSections.includes(newSection)) {
            await prisma.teamPreferencesConfig.update({
              where: { projectId: pattern.projectId },
              data: {
                requiredSections: [...currentSections, newSection],
              },
            });
          }
        }
      }

      // Update pattern status
      const updated = await prisma.learnedPattern.update({
        where: { id: patternId },
        data: {
          status: 'applied',
          reviewedAt: new Date(),
          reviewedBy: userId,
          appliedAt: new Date(),
        },
      });

      return transformPattern(updated);
    },

    async dismissPattern(patternId: string, userId: string): Promise<LearnedPatternData> {
      const updated = await prisma.learnedPattern.update({
        where: { id: patternId },
        data: {
          status: 'dismissed',
          reviewedAt: new Date(),
          reviewedBy: userId,
        },
      });

      return transformPattern(updated);
    },

    // =========================================================================
    // STATS
    // =========================================================================

    async getLearningStats(projectId: string): Promise<LearningStats> {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [totalEdits, editsThisWeek, patternsDetected, patternsApplied, fieldCounts] = await Promise.all([
        prisma.storyEdit.count({ where: { projectId } }),
        prisma.storyEdit.count({
          where: { projectId, createdAt: { gte: weekAgo } },
        }),
        prisma.learnedPattern.count({ where: { projectId } }),
        prisma.learnedPattern.count({
          where: { projectId, status: 'applied' },
        }),
        prisma.storyEdit.groupBy({
          by: ['field'],
          where: { projectId },
          _count: { field: true },
          orderBy: { _count: { field: 'desc' } },
          take: 5,
        }),
      ]);

      return {
        totalEdits,
        editsThisWeek,
        patternsDetected,
        patternsApplied,
        topEditedFields: fieldCounts.map(fc => ({
          field: fc.field,
          count: fc._count.field,
        })),
      };
    },
  };
}

// Singleton instance
let _learningService: LearningService | null = null;

export function getLearningService(): LearningService {
  if (!_learningService) {
    _learningService = createLearningService();
  }
  return _learningService;
}
