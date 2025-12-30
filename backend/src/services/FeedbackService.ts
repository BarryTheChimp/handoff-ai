import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma.js';

const anthropic = new Anthropic();

export interface FeedbackInput {
  rating: number;
  feedback?: string | undefined;
  categories?: string[] | undefined;
}

export interface FeedbackData {
  id: string;
  workItemId: string;
  userId: string;
  rating: number;
  feedback: string | null;
  categories: string[];
  createdAt: Date;
}

export interface PreferenceData {
  id: string;
  projectId: string;
  preference: string;
  description: string | null;
  category: string | null;
  learnedFrom: string[];
  active: boolean;
  createdAt: Date;
}

export interface ExtractedPreference {
  preference: string;
  description: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface FeedbackService {
  submitFeedback(workItemId: string, userId: string, input: FeedbackInput): Promise<FeedbackData>;
  getFeedback(workItemId: string): Promise<FeedbackData[]>;
  getFeedbackByUser(workItemId: string, userId: string): Promise<FeedbackData | null>;
}

export interface PreferenceService {
  list(projectId: string): Promise<PreferenceData[]>;
  create(projectId: string, preference: string, description?: string, category?: string): Promise<PreferenceData>;
  update(preferenceId: string, active: boolean): Promise<PreferenceData>;
  delete(preferenceId: string): Promise<void>;
  extractFromFeedback(projectId: string): Promise<ExtractedPreference[]>;
  getActivePreferences(projectId: string): Promise<PreferenceData[]>;
  buildPromptAdditions(projectId: string): Promise<string>;
}

const PREFERENCE_EXTRACTION_PROMPT = `Analyze user feedback on AI-generated user stories to extract team preferences.

## Negative Feedback (thumbs down)
{{negativeFeedback}}

## Positive Feedback (thumbs up)
{{positiveFeedback}}

## Instructions
Based on patterns in the feedback, identify actionable preferences the team has for how stories should be written.

Categories:
- ac_format: How acceptance criteria should be structured
- detail_level: How detailed or concise stories should be
- sections: What sections should be included or excluded
- terminology: Specific terms or language preferences
- style: Writing style preferences

## Output Format
Return a JSON array only:
{
  "preferences": [
    {
      "preference": "Concise actionable instruction for AI prompts (e.g., 'Keep acceptance criteria to 3-5 items maximum')",
      "description": "Human-readable explanation of why this preference was identified",
      "category": "ac_format|detail_level|sections|terminology|style",
      "confidence": "high|medium|low"
    }
  ]
}

Only include preferences with clear patterns from multiple feedback entries. Return empty array if no clear patterns.`;

export function createFeedbackService(): FeedbackService {
  return {
    async submitFeedback(
      workItemId: string,
      userId: string,
      input: FeedbackInput
    ): Promise<FeedbackData> {
      // Validate rating
      if (input.rating !== 1 && input.rating !== 5) {
        throw new Error('Rating must be 1 (thumbs down) or 5 (thumbs up)');
      }

      // Check work item exists
      const workItem = await prisma.workItem.findUnique({
        where: { id: workItemId },
      });

      if (!workItem) {
        throw new Error('Work item not found');
      }

      // Upsert feedback (one per user per work item)
      const feedback = await prisma.aIFeedback.upsert({
        where: {
          workItemId_userId: { workItemId, userId },
        },
        create: {
          workItemId,
          userId,
          rating: input.rating,
          feedback: input.feedback || null,
          categories: input.categories || [],
        },
        update: {
          rating: input.rating,
          feedback: input.feedback || null,
          categories: input.categories || [],
        },
      });

      return {
        id: feedback.id,
        workItemId: feedback.workItemId,
        userId: feedback.userId,
        rating: feedback.rating,
        feedback: feedback.feedback,
        categories: feedback.categories,
        createdAt: feedback.createdAt,
      };
    },

    async getFeedback(workItemId: string): Promise<FeedbackData[]> {
      const feedbacks = await prisma.aIFeedback.findMany({
        where: { workItemId },
        orderBy: { createdAt: 'desc' },
      });

      return feedbacks.map((f) => ({
        id: f.id,
        workItemId: f.workItemId,
        userId: f.userId,
        rating: f.rating,
        feedback: f.feedback,
        categories: f.categories,
        createdAt: f.createdAt,
      }));
    },

    async getFeedbackByUser(workItemId: string, userId: string): Promise<FeedbackData | null> {
      const feedback = await prisma.aIFeedback.findUnique({
        where: {
          workItemId_userId: { workItemId, userId },
        },
      });

      if (!feedback) return null;

      return {
        id: feedback.id,
        workItemId: feedback.workItemId,
        userId: feedback.userId,
        rating: feedback.rating,
        feedback: feedback.feedback,
        categories: feedback.categories,
        createdAt: feedback.createdAt,
      };
    },
  };
}

export function createPreferenceService(): PreferenceService {
  return {
    async list(projectId: string): Promise<PreferenceData[]> {
      const preferences = await prisma.teamPreference.findMany({
        where: { projectId },
        orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
      });

      return preferences.map((p) => ({
        id: p.id,
        projectId: p.projectId,
        preference: p.preference,
        description: p.description,
        category: p.category,
        learnedFrom: p.learnedFrom,
        active: p.active,
        createdAt: p.createdAt,
      }));
    },

    async create(
      projectId: string,
      preference: string,
      description?: string,
      category?: string
    ): Promise<PreferenceData> {
      const pref = await prisma.teamPreference.create({
        data: {
          projectId,
          preference,
          description: description || null,
          category: category || null,
          active: true, // Manual preferences are active by default
        },
      });

      return {
        id: pref.id,
        projectId: pref.projectId,
        preference: pref.preference,
        description: pref.description,
        category: pref.category,
        learnedFrom: pref.learnedFrom,
        active: pref.active,
        createdAt: pref.createdAt,
      };
    },

    async update(preferenceId: string, active: boolean): Promise<PreferenceData> {
      const pref = await prisma.teamPreference.update({
        where: { id: preferenceId },
        data: { active },
      });

      return {
        id: pref.id,
        projectId: pref.projectId,
        preference: pref.preference,
        description: pref.description,
        category: pref.category,
        learnedFrom: pref.learnedFrom,
        active: pref.active,
        createdAt: pref.createdAt,
      };
    },

    async delete(preferenceId: string): Promise<void> {
      await prisma.teamPreference.delete({
        where: { id: preferenceId },
      });
    },

    async extractFromFeedback(projectId: string): Promise<ExtractedPreference[]> {
      // Get specs for this project
      const specs = await prisma.spec.findMany({
        where: { projectId },
        select: { id: true },
      });

      const specIds = specs.map((s) => s.id);

      // Get recent feedback for work items in these specs
      const feedbacks = await prisma.aIFeedback.findMany({
        where: {
          workItem: {
            specId: { in: specIds },
          },
        },
        include: {
          workItem: {
            select: {
              title: true,
              description: true,
              acceptanceCriteria: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50, // Limit to recent feedback
      });

      if (feedbacks.length < 3) {
        return []; // Not enough feedback to extract patterns
      }

      // Separate positive and negative feedback
      const negative = feedbacks
        .filter((f) => f.rating === 1)
        .map(
          (f) =>
            `Story: ${f.workItem.title}\nFeedback: ${f.feedback || 'No details'}\nCategories: ${f.categories.join(', ') || 'None'}`
        );

      const positive = feedbacks
        .filter((f) => f.rating === 5)
        .map(
          (f) =>
            `Story: ${f.workItem.title}\nFeedback: ${f.feedback || 'No details'}\nCategories: ${f.categories.join(', ') || 'None'}`
        );

      if (negative.length === 0 && positive.length === 0) {
        return [];
      }

      // Build prompt
      const prompt = PREFERENCE_EXTRACTION_PROMPT
        .replace('{{negativeFeedback}}', negative.join('\n\n') || 'No negative feedback')
        .replace('{{positiveFeedback}}', positive.join('\n\n') || 'No positive feedback');

      // Call AI
      const response = await anthropic.messages.create({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 1000,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0];
      if (!content || content.type !== 'text') {
        return [];
      }

      try {
        const jsonMatch = (content as { type: 'text'; text: string }).text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return [];

        const parsed = JSON.parse(jsonMatch[0]);
        const extracted = parsed.preferences || [];

        // Store extracted preferences (inactive by default for review)
        const feedbackIds = feedbacks.map((f) => f.id);

        for (const pref of extracted) {
          await prisma.teamPreference.create({
            data: {
              projectId,
              preference: pref.preference,
              description: pref.description,
              category: pref.category,
              learnedFrom: feedbackIds,
              active: false, // Inactive until reviewed
            },
          });
        }

        return extracted;
      } catch {
        return [];
      }
    },

    async getActivePreferences(projectId: string): Promise<PreferenceData[]> {
      const preferences = await prisma.teamPreference.findMany({
        where: { projectId, active: true },
      });

      return preferences.map((p) => ({
        id: p.id,
        projectId: p.projectId,
        preference: p.preference,
        description: p.description,
        category: p.category,
        learnedFrom: p.learnedFrom,
        active: p.active,
        createdAt: p.createdAt,
      }));
    },

    async buildPromptAdditions(projectId: string): Promise<string> {
      const activePrefs = await this.getActivePreferences(projectId);

      if (activePrefs.length === 0) {
        return '';
      }

      const lines = ['## Team Preferences', ''];
      for (const pref of activePrefs) {
        lines.push(`- ${pref.preference}`);
      }
      lines.push('');

      return lines.join('\n');
    },
  };
}

// Singleton instances
let _feedbackService: FeedbackService | null = null;
let _preferenceService: PreferenceService | null = null;

export function getFeedbackService(): FeedbackService {
  if (!_feedbackService) {
    _feedbackService = createFeedbackService();
  }
  return _feedbackService;
}

export function getPreferenceService(): PreferenceService {
  if (!_preferenceService) {
    _preferenceService = createPreferenceService();
  }
  return _preferenceService;
}
