import { prisma } from '../lib/prisma.js';
import type { HealthLevel } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface HealthComponent {
  name: string;
  weight: number;
  score: number;  // 0-100
  recommendation?: string;
}

export interface HealthResult {
  score: number;
  level: HealthLevel;
  components: HealthComponent[];
  recommendations: string[];
}

interface ComponentScore {
  score: number;
  recommendation?: string;
}

// =============================================================================
// SERVICE INTERFACE
// =============================================================================

export interface HealthScoreService {
  calculateHealth(projectId: string): Promise<HealthResult>;
  getHealth(projectId: string): Promise<HealthResult | null>;
  recalculateHealth(projectId: string): Promise<HealthResult>;
}

// =============================================================================
// SCORING FUNCTIONS
// =============================================================================

async function scoreBrief(projectId: string): Promise<ComponentScore> {
  const knowledge = await prisma.projectKnowledge.findUnique({
    where: { projectId },
  });

  if (!knowledge?.brief) {
    return { score: 0, recommendation: 'Add a project brief to help AI understand your domain' };
  }

  const wordCount = knowledge.brief.split(/\s+/).length;

  if (wordCount < 50) {
    return { score: 30, recommendation: 'Expand your project brief (aim for 100+ words)' };
  }
  if (wordCount < 100) {
    return { score: 60, recommendation: 'Add more detail to your project brief' };
  }
  if (wordCount < 200) {
    return { score: 80 };
  }
  return { score: 100 };
}

async function scoreGlossary(projectId: string): Promise<ComponentScore> {
  const termCount = await prisma.glossaryTerm.count({
    where: { projectId },
  });

  if (termCount === 0) {
    return { score: 0, recommendation: 'Add glossary terms to ensure consistent terminology' };
  }
  if (termCount < 5) {
    return { score: 40, recommendation: `Add more glossary terms (${termCount}/5 minimum)` };
  }
  if (termCount < 10) {
    return { score: 70 };
  }
  if (termCount < 20) {
    return { score: 90 };
  }
  return { score: 100 };
}

async function scorePreferences(projectId: string): Promise<ComponentScore> {
  const prefs = await prisma.teamPreferencesConfig.findUnique({
    where: { projectId },
  });

  if (!prefs) {
    return { score: 0, recommendation: 'Configure team preferences for consistent output' };
  }

  let score = 50; // Base for having prefs

  if (prefs.acFormat && prefs.acFormat !== 'bullets') {
    score += 20; // Explicit format choice
  }
  if (prefs.requiredSections && prefs.requiredSections.length > 0) {
    score += 15;
  }

  const customPrefs = prefs.customPrefs as unknown[];
  if (customPrefs && customPrefs.length > 0) {
    score += 15;
  }

  return { score: Math.min(score, 100) };
}

async function scoreSpecs(projectId: string): Promise<ComponentScore> {
  const specCount = await prisma.spec.count({
    where: { projectId, status: 'translated' },
  });

  if (specCount === 0) {
    return { score: 0, recommendation: 'Translate your first spec to build context' };
  }
  if (specCount < 3) {
    return { score: 50 };
  }
  if (specCount < 5) {
    return { score: 75 };
  }
  return { score: 100 };
}

async function scoreSources(projectId: string): Promise<ComponentScore> {
  const sources = await prisma.contextSource.count({
    where: { projectId, isEnabled: true, sourceType: { not: 'specs' } },
  });

  const docs = await prisma.referenceDocument.count({
    where: { projectId },
  });

  if (sources === 0 && docs === 0) {
    return { score: 0, recommendation: 'Connect Jira or upload reference documents' };
  }
  if (sources + docs < 2) {
    return { score: 50 };
  }
  return { score: 100 };
}

async function scoreLearning(projectId: string): Promise<ComponentScore> {
  const appliedPatterns = await prisma.learnedPattern.count({
    where: { projectId, status: 'applied' },
  });

  if (appliedPatterns === 0) {
    // Only recommend if there are pending patterns
    const pendingPatterns = await prisma.learnedPattern.count({
      where: { projectId, status: { in: ['pending', 'suggested'] } },
    });
    if (pendingPatterns > 0) {
      return { score: 0, recommendation: 'Review learning suggestions to improve translations' };
    }
    return { score: 50 }; // No patterns yet, neutral
  }
  return { score: 100 };
}

function getLevel(score: number): HealthLevel {
  if (score >= 76) return 'excellent';
  if (score >= 51) return 'good';
  if (score >= 26) return 'basic';
  return 'minimal';
}

// =============================================================================
// IMPLEMENTATION
// =============================================================================

export function createHealthScoreService(): HealthScoreService {
  return {
    async calculateHealth(projectId: string): Promise<HealthResult> {
      const components: HealthComponent[] = [];
      const recommendations: string[] = [];

      // 1. Project Brief (25%)
      const briefResult = await scoreBrief(projectId);
      components.push({
        name: 'Project Brief',
        weight: 25,
        score: briefResult.score,
        recommendation: briefResult.recommendation,
      });
      if (briefResult.recommendation) recommendations.push(briefResult.recommendation);

      // 2. Glossary (20%)
      const glossaryResult = await scoreGlossary(projectId);
      components.push({
        name: 'Glossary',
        weight: 20,
        score: glossaryResult.score,
        recommendation: glossaryResult.recommendation,
      });
      if (glossaryResult.recommendation) recommendations.push(glossaryResult.recommendation);

      // 3. Team Preferences (15%)
      const prefsResult = await scorePreferences(projectId);
      components.push({
        name: 'Team Preferences',
        weight: 15,
        score: prefsResult.score,
        recommendation: prefsResult.recommendation,
      });
      if (prefsResult.recommendation) recommendations.push(prefsResult.recommendation);

      // 4. Translated Specs (20%)
      const specsResult = await scoreSpecs(projectId);
      components.push({
        name: 'Translated Specs',
        weight: 20,
        score: specsResult.score,
        recommendation: specsResult.recommendation,
      });
      if (specsResult.recommendation) recommendations.push(specsResult.recommendation);

      // 5. Connected Sources (10%)
      const sourcesResult = await scoreSources(projectId);
      components.push({
        name: 'Connected Sources',
        weight: 10,
        score: sourcesResult.score,
        recommendation: sourcesResult.recommendation,
      });
      if (sourcesResult.recommendation) recommendations.push(sourcesResult.recommendation);

      // 6. Learning Applied (10%)
      const learningResult = await scoreLearning(projectId);
      components.push({
        name: 'Learning Applied',
        weight: 10,
        score: learningResult.score,
        recommendation: learningResult.recommendation,
      });
      if (learningResult.recommendation) recommendations.push(learningResult.recommendation);

      // Calculate overall score
      const totalScore = Math.round(
        components.reduce((sum, c) => sum + (c.score * c.weight / 100), 0)
      );

      const level = getLevel(totalScore);

      // Cache result
      await prisma.projectHealth.upsert({
        where: { projectId },
        create: {
          projectId,
          score: totalScore,
          level,
          briefScore: components.find(c => c.name === 'Project Brief')?.score || 0,
          glossaryScore: components.find(c => c.name === 'Glossary')?.score || 0,
          prefsScore: components.find(c => c.name === 'Team Preferences')?.score || 0,
          specsScore: components.find(c => c.name === 'Translated Specs')?.score || 0,
          sourcesScore: components.find(c => c.name === 'Connected Sources')?.score || 0,
          learningScore: components.find(c => c.name === 'Learning Applied')?.score || 0,
          recommendations: recommendations.slice(0, 5),
          calculatedAt: new Date(),
        },
        update: {
          score: totalScore,
          level,
          briefScore: components.find(c => c.name === 'Project Brief')?.score || 0,
          glossaryScore: components.find(c => c.name === 'Glossary')?.score || 0,
          prefsScore: components.find(c => c.name === 'Team Preferences')?.score || 0,
          specsScore: components.find(c => c.name === 'Translated Specs')?.score || 0,
          sourcesScore: components.find(c => c.name === 'Connected Sources')?.score || 0,
          learningScore: components.find(c => c.name === 'Learning Applied')?.score || 0,
          recommendations: recommendations.slice(0, 5),
          calculatedAt: new Date(),
        },
      });

      return {
        score: totalScore,
        level,
        components,
        recommendations: recommendations.slice(0, 3), // Top 3
      };
    },

    async getHealth(projectId: string): Promise<HealthResult | null> {
      const cached = await prisma.projectHealth.findUnique({
        where: { projectId },
      });

      if (!cached) {
        return null;
      }

      // Check if cache is stale (older than 5 minutes)
      const cacheAge = Date.now() - cached.calculatedAt.getTime();
      if (cacheAge > 5 * 60 * 1000) {
        // Recalculate
        return this.calculateHealth(projectId);
      }

      // Reconstruct components from cached data
      const components: HealthComponent[] = [
        { name: 'Project Brief', weight: 25, score: cached.briefScore },
        { name: 'Glossary', weight: 20, score: cached.glossaryScore },
        { name: 'Team Preferences', weight: 15, score: cached.prefsScore },
        { name: 'Translated Specs', weight: 20, score: cached.specsScore },
        { name: 'Connected Sources', weight: 10, score: cached.sourcesScore },
        { name: 'Learning Applied', weight: 10, score: cached.learningScore },
      ];

      return {
        score: cached.score,
        level: cached.level,
        components,
        recommendations: cached.recommendations as string[],
      };
    },

    async recalculateHealth(projectId: string): Promise<HealthResult> {
      return this.calculateHealth(projectId);
    },
  };
}

// Singleton instance
let _healthService: HealthScoreService | null = null;

export function getHealthScoreService(): HealthScoreService {
  if (!_healthService) {
    _healthService = createHealthScoreService();
  }
  return _healthService;
}
