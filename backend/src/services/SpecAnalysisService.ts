import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();
const anthropic = new Anthropic();

export interface SpecMetrics {
  wordCount: number;
  sectionCount: number;
  estimatedStories: number;
  estimatedEpics: number;
  complexityScore: number; // 1-10
  readabilityScore: number; // 1-10
}

export interface SpecIssue {
  type: 'warning' | 'error' | 'info';
  category: 'ambiguity' | 'missing_info' | 'scope' | 'technical' | 'structure';
  location?: string; // section reference
  message: string;
  suggestion?: string;
}

export interface SpecRecommendation {
  priority: 'high' | 'medium' | 'low';
  type: 'clarify' | 'split' | 'merge' | 'add_detail' | 'remove';
  section?: string;
  message: string;
  impact: string;
}

export interface TranslationReadiness {
  score: number; // 0-100
  status: 'ready' | 'needs_review' | 'not_ready';
  blockers: string[];
  warnings: string[];
}

export interface PreTranslationAnalysis {
  specId: string;
  analyzedAt: Date;
  metrics: SpecMetrics;
  issues: SpecIssue[];
  recommendations: SpecRecommendation[];
  readiness: TranslationReadiness;
  estimatedTranslationTime: string; // e.g., "2-3 minutes"
  suggestedQuestions: string[];
}

export class SpecAnalysisService {
  async analyzeSpec(specId: string): Promise<PreTranslationAnalysis> {
    const spec = await prisma.spec.findUnique({
      where: { id: specId },
      include: {
        sections: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!spec) {
      throw new Error('Spec not found');
    }

    // Calculate basic metrics
    const allContent = spec.sections.map((s) => s.content).join('\n');
    const wordCount = allContent.split(/\s+/).filter((w) => w.length > 0).length;
    const sectionCount = spec.sections.length;

    // Estimate stories based on section count and content
    const estimatedStories = Math.ceil(sectionCount * 2.5);
    const estimatedEpics = Math.max(1, Math.ceil(sectionCount / 4));

    // Analyze with AI for deeper insights
    let aiAnalysis: {
      issues: SpecIssue[];
      recommendations: SpecRecommendation[];
      complexityScore: number;
      readabilityScore: number;
      suggestedQuestions: string[];
    } = {
      issues: [],
      recommendations: [],
      complexityScore: 5,
      readabilityScore: 7,
      suggestedQuestions: [],
    };

    if (wordCount > 100) {
      try {
        aiAnalysis = await this.analyzeWithAI(spec.name, spec.sections);
      } catch (error) {
        console.error('AI analysis failed:', error);
      }
    }

    // Calculate readiness
    const readiness = this.calculateReadiness(aiAnalysis.issues, wordCount, sectionCount);

    // Estimate translation time based on content size
    const estimatedMinutes = Math.ceil(wordCount / 500) + aiAnalysis.complexityScore;
    const estimatedTranslationTime = estimatedMinutes <= 1
      ? 'Under 1 minute'
      : estimatedMinutes <= 3
      ? '1-2 minutes'
      : estimatedMinutes <= 5
      ? '2-3 minutes'
      : '3-5 minutes';

    const analysis: PreTranslationAnalysis = {
      specId,
      analyzedAt: new Date(),
      metrics: {
        wordCount,
        sectionCount,
        estimatedStories,
        estimatedEpics,
        complexityScore: aiAnalysis.complexityScore,
        readabilityScore: aiAnalysis.readabilityScore,
      },
      issues: aiAnalysis.issues,
      recommendations: aiAnalysis.recommendations,
      readiness,
      estimatedTranslationTime,
      suggestedQuestions: aiAnalysis.suggestedQuestions,
    };

    // Cache the analysis
    await prisma.specAnalysis.upsert({
      where: {
        specId_type: {
          specId,
          type: 'pre_translation',
        },
      },
      update: {
        data: analysis as any,
        updatedAt: new Date(),
      },
      create: {
        specId,
        type: 'pre_translation',
        data: analysis as any,
      },
    });

    return analysis;
  }

  private async analyzeWithAI(
    specName: string,
    sections: Array<{ heading: string; content: string }>
  ): Promise<{
    issues: SpecIssue[];
    recommendations: SpecRecommendation[];
    complexityScore: number;
    readabilityScore: number;
    suggestedQuestions: string[];
  }> {
    const sectionSummary = sections
      .map((s, i) => `Section ${i + 1}: ${s.heading}\n${s.content.substring(0, 500)}...`)
      .join('\n\n');

    const prompt = `Analyze this specification document for translation into work items (user stories/tasks):

Document: ${specName}

Sections:
${sectionSummary.substring(0, 6000)}

Analyze for:
1. Ambiguities or unclear requirements
2. Missing information needed for implementation
3. Scope concerns (too broad, overlapping areas)
4. Technical gaps
5. Structure issues

Also provide:
- Complexity score (1-10)
- Readability score (1-10)
- 3-5 clarifying questions to ask before translation

Return JSON:
{
  "issues": [
    {"type": "warning|error|info", "category": "ambiguity|missing_info|scope|technical|structure", "location": "section reference", "message": "issue description", "suggestion": "how to fix"}
  ],
  "recommendations": [
    {"priority": "high|medium|low", "type": "clarify|split|merge|add_detail|remove", "section": "optional section", "message": "what to do", "impact": "why it matters"}
  ],
  "complexityScore": 5,
  "readabilityScore": 7,
  "suggestedQuestions": ["Question 1?", "Question 2?"]
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Invalid AI response');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response');
    }

    return JSON.parse(jsonMatch[0]);
  }

  private calculateReadiness(
    issues: SpecIssue[],
    wordCount: number,
    sectionCount: number
  ): TranslationReadiness {
    const errors = issues.filter((i) => i.type === 'error');
    const warnings = issues.filter((i) => i.type === 'warning');

    const blockers: string[] = [];
    const warningMessages: string[] = [];

    // Check for blockers
    if (wordCount < 50) {
      blockers.push('Document is too short for meaningful translation');
    }
    if (sectionCount === 0) {
      blockers.push('No sections detected in document');
    }
    errors.forEach((e) => blockers.push(e.message));

    // Check for warnings
    if (wordCount < 200) {
      warningMessages.push('Document may lack sufficient detail');
    }
    warnings.forEach((w) => warningMessages.push(w.message));

    // Calculate score
    let score = 100;
    score -= blockers.length * 25;
    score -= warnings.length * 10;
    score = Math.max(0, Math.min(100, score));

    let status: TranslationReadiness['status'] = 'ready';
    if (blockers.length > 0) {
      status = 'not_ready';
    } else if (warningMessages.length >= 3 || score < 70) {
      status = 'needs_review';
    }

    return {
      score,
      status,
      blockers,
      warnings: warningMessages,
    };
  }

  async getCachedAnalysis(specId: string): Promise<PreTranslationAnalysis | null> {
    const cached = await prisma.specAnalysis.findUnique({
      where: {
        specId_type: {
          specId,
          type: 'pre_translation',
        },
      },
    });

    if (!cached) return null;

    // Check if cache is recent (within 1 hour)
    const cacheAge = Date.now() - cached.updatedAt.getTime();
    const maxAge = 60 * 60 * 1000; // 1 hour

    if (cacheAge > maxAge) return null;

    return cached.data as unknown as PreTranslationAnalysis;
  }
}

export const specAnalysisService = new SpecAnalysisService();
