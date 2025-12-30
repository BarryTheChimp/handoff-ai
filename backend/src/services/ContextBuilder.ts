import { prisma } from '../lib/prisma.js';
import type { GlossaryTerm, ContextChunk, TeamPreferencesConfig } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface ContextBuildResult {
  contextString: string;
  tokensUsed: number;
  sourcesUsed: ContextSourceUsed[];
}

export interface ContextSourceUsed {
  type: 'brief' | 'glossary' | 'preferences' | 'spec' | 'jira' | 'document';
  name: string;
  tokensUsed: number;
}

interface SpecAnalysis {
  terms: string[];
  entities: string[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_MAX_TOKENS = 2000;

// Token budget allocation
const TOKEN_BUDGETS = {
  brief: 400,
  preferences: 100,
  glossary: 300,
  specs: 600,
  jira: 400,
  documents: 200,
};

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'have', 'has', 'had',
  'do', 'does', 'will', 'would', 'could', 'should', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'and', 'but', 'or', 'not', 'this',
  'that', 'these', 'those', 'it', 'its', 'they', 'their', 'we', 'our', 'you',
  'your', 'can', 'may', 'must', 'shall', 'if', 'then', 'when', 'while', 'which',
  'what', 'where', 'who', 'how', 'all', 'each', 'any', 'some', 'more', 'other',
]);

// =============================================================================
// CONTEXT BUILDER SERVICE
// =============================================================================

export interface ContextBuilderService {
  buildContext(
    projectId: string,
    specText: string,
    options?: { maxTokens?: number }
  ): Promise<ContextBuildResult>;

  previewContext(
    projectId: string,
    specContent: string
  ): Promise<ContextBuildResult>;
}

export function createContextBuilder(): ContextBuilderService {
  // =========================================================================
  // HELPER FUNCTIONS
  // =========================================================================

  function estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  function analyzeSpec(specText: string): SpecAnalysis {
    // Extract significant terms (excluding stop words)
    const words = specText.toLowerCase().split(/\W+/);
    const terms = [...new Set(
      words.filter(w =>
        w.length > 3 &&
        !STOP_WORDS.has(w) &&
        !/^\d+$/.test(w)
      )
    )];

    // Extract entities (capitalized words, acronyms)
    const entityPattern = /\b([A-Z][a-z]+(?:[A-Z][a-z]+)*|[A-Z]{2,})\b/g;
    const entities = [...new Set(specText.match(entityPattern) || [])];

    return { terms: terms.slice(0, 50), entities: entities.slice(0, 20) };
  }

  // =========================================================================
  // DATA RETRIEVAL
  // =========================================================================

  async function getProjectBrief(projectId: string): Promise<string | null> {
    const knowledge = await prisma.projectKnowledge.findUnique({
      where: { projectId },
    });
    return knowledge?.brief || null;
  }

  async function getTeamPreferencesConfig(projectId: string): Promise<TeamPreferencesConfig | null> {
    return prisma.teamPreferencesConfig.findUnique({
      where: { projectId },
    });
  }

  async function getActivePreferences(projectId: string): Promise<string[]> {
    const prefs = await prisma.teamPreference.findMany({
      where: { projectId, active: true },
      take: 10,
    });
    return prefs.map(p => p.preference);
  }

  async function getRelevantGlossary(projectId: string, terms: string[]): Promise<GlossaryTerm[]> {
    if (terms.length === 0) return [];

    const allTerms = await prisma.glossaryTerm.findMany({
      where: { projectId },
      take: 50,
    });

    // Filter to terms that match analysis
    const termSet = new Set(terms.map(t => t.toLowerCase()));
    return allTerms.filter(gt => {
      const gtLower = gt.term.toLowerCase();
      // Match if term appears in analysis or analysis term appears in glossary term
      return termSet.has(gtLower) ||
        terms.some(t => gtLower.includes(t) || t.includes(gtLower));
    }).slice(0, 15);
  }

  async function getRelatedSpecs(projectId: string, terms: string[]): Promise<ContextChunk[]> {
    if (terms.length === 0) return [];

    return prisma.contextChunk.findMany({
      where: {
        projectId,
        sourceType: 'specs',
        keywords: { hasSome: terms.slice(0, 20) },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });
  }

  async function getJiraContext(projectId: string, terms: string[]): Promise<ContextChunk[]> {
    if (terms.length === 0) return [];

    return prisma.contextChunk.findMany({
      where: {
        projectId,
        sourceType: 'jira',
        keywords: { hasSome: terms.slice(0, 10) },
      },
      take: 5,
    });
  }

  async function getDocumentChunks(projectId: string, terms: string[]): Promise<ContextChunk[]> {
    if (terms.length === 0) return [];

    return prisma.contextChunk.findMany({
      where: {
        projectId,
        sourceType: 'document',
        keywords: { hasSome: terms.slice(0, 10) },
      },
      take: 3,
    });
  }

  // =========================================================================
  // FORMATTING
  // =========================================================================

  function formatPreferences(config: TeamPreferencesConfig | null, customPrefs: string[]): string {
    const lines = ['### Team Conventions'];

    if (config) {
      const formatNames: Record<string, string> = {
        gherkin: 'Given/When/Then (Gherkin)',
        bullets: 'Bullet points',
        checklist: 'Checklist',
        numbered: 'Numbered list',
      };

      lines.push(`- AC Format: ${formatNames[config.acFormat] || config.acFormat}`);
      lines.push(`- Max AC per story: ${config.maxAcCount}`);
      lines.push(`- Verbosity: ${config.verbosity}`);
      lines.push(`- Technical Depth: ${config.technicalDepth.replace('_', ' ')}`);

      if (config.requiredSections.length > 0) {
        lines.push(`- Required sections: ${config.requiredSections.join(', ')}`);
      }
    }

    for (const pref of customPrefs.slice(0, 5)) {
      lines.push(`- ${pref}`);
    }

    return lines.join('\n');
  }

  function formatGlossary(terms: GlossaryTerm[]): string {
    if (terms.length === 0) return '';

    const lines = ['### Domain Terminology'];
    for (const term of terms) {
      let line = `- **${term.term}**: ${term.definition}`;
      if (term.useInstead) {
        line += ` (prefer over: ${term.useInstead})`;
      }
      lines.push(line);
    }
    return lines.join('\n');
  }

  function formatRelatedSpecs(specs: ContextChunk[], maxTokens: number): string {
    if (specs.length === 0) return '';

    const lines = ['### Related Specifications'];
    let tokens = estimateTokens(lines[0]);

    for (const spec of specs) {
      const metadata = spec.metadata as Record<string, unknown>;
      const specName = metadata?.specName || metadata?.sourceName || 'Related Spec';
      const content = spec.summary || spec.content.slice(0, 200);
      const line = `- **${specName}**: ${content}`;
      const lineTokens = estimateTokens(line);

      if (tokens + lineTokens > maxTokens) break;

      lines.push(line);
      tokens += lineTokens;
    }

    return lines.length > 1 ? lines.join('\n') : '';
  }

  function formatJiraContext(tickets: ContextChunk[], maxTokens: number): string {
    if (tickets.length === 0) return '';

    const lines = ['### Existing Work'];
    let tokens = estimateTokens(lines[0]);

    for (const ticket of tickets) {
      const content = ticket.summary || ticket.content.slice(0, 150);
      const line = `- **${ticket.sourceId}**: ${content}`;
      const lineTokens = estimateTokens(line);

      if (tokens + lineTokens > maxTokens) break;

      lines.push(line);
      tokens += lineTokens;
    }

    return lines.length > 1 ? lines.join('\n') : '';
  }

  function formatDocumentChunks(chunks: ContextChunk[], maxTokens: number): string {
    if (chunks.length === 0) return '';

    const lines = ['### Reference Documentation'];
    let tokens = estimateTokens(lines[0]);

    for (const chunk of chunks) {
      const metadata = chunk.metadata as Record<string, unknown>;
      const docName = metadata?.documentName || 'Document';
      const content = chunk.content.slice(0, 180);
      const line = `- **${docName}**: ${content}...`;
      const lineTokens = estimateTokens(line);

      if (tokens + lineTokens > maxTokens) break;

      lines.push(line);
      tokens += lineTokens;
    }

    return lines.length > 1 ? lines.join('\n') : '';
  }

  // =========================================================================
  // MAIN BUILD FUNCTION
  // =========================================================================

  return {
    async buildContext(
      projectId: string,
      specText: string,
      options: { maxTokens?: number } = {}
    ): Promise<ContextBuildResult> {
      const maxTokens = options.maxTokens || DEFAULT_MAX_TOKENS;
      const sourcesUsed: ContextSourceUsed[] = [];
      const parts: string[] = [];
      let tokensUsed = 0;

      // 1. ANALYZE SPEC
      const analysis = analyzeSpec(specText);

      // 2. ALWAYS INCLUDE: Project Brief
      const brief = await getProjectBrief(projectId);
      if (brief) {
        const briefText = `### About This Project\n\n${brief}`;
        const briefTokens = Math.min(estimateTokens(briefText), TOKEN_BUDGETS.brief);

        if (tokensUsed + briefTokens <= maxTokens) {
          // Truncate if needed
          const truncatedBrief = brief.length > TOKEN_BUDGETS.brief * 4
            ? brief.slice(0, TOKEN_BUDGETS.brief * 4) + '...'
            : brief;
          parts.push(`### About This Project\n\n${truncatedBrief}`);
          tokensUsed += estimateTokens(parts[parts.length - 1]);
          sourcesUsed.push({
            type: 'brief',
            name: 'Project Brief',
            tokensUsed: estimateTokens(parts[parts.length - 1]),
          });
        }
      }

      // 3. ALWAYS INCLUDE: Team Preferences
      const prefsConfig = await getTeamPreferencesConfig(projectId);
      const customPrefs = await getActivePreferences(projectId);

      if (prefsConfig || customPrefs.length > 0) {
        const prefsText = formatPreferences(prefsConfig, customPrefs);
        const prefsTokens = estimateTokens(prefsText);

        if (tokensUsed + prefsTokens <= maxTokens) {
          parts.push(prefsText);
          tokensUsed += prefsTokens;
          sourcesUsed.push({
            type: 'preferences',
            name: 'Team Preferences',
            tokensUsed: prefsTokens,
          });
        }
      }

      // 4. MATCHING: Relevant Glossary Terms
      const glossaryTerms = await getRelevantGlossary(projectId, analysis.terms);
      if (glossaryTerms.length > 0) {
        const glossaryText = formatGlossary(glossaryTerms);
        const glossaryTokens = estimateTokens(glossaryText);
        const budgetRemaining = Math.min(TOKEN_BUDGETS.glossary, maxTokens - tokensUsed);

        if (glossaryTokens <= budgetRemaining) {
          parts.push(glossaryText);
          tokensUsed += glossaryTokens;
          sourcesUsed.push({
            type: 'glossary',
            name: `${glossaryTerms.length} terms`,
            tokensUsed: glossaryTokens,
          });
        }
      }

      // 5. MATCHING: Related Specs
      const relatedSpecs = await getRelatedSpecs(projectId, analysis.terms);
      if (relatedSpecs.length > 0) {
        const budgetRemaining = Math.min(TOKEN_BUDGETS.specs, maxTokens - tokensUsed);
        const specsText = formatRelatedSpecs(relatedSpecs, budgetRemaining);
        const specsTokens = estimateTokens(specsText);

        if (specsText && specsTokens > 0) {
          parts.push(specsText);
          tokensUsed += specsTokens;
          sourcesUsed.push({
            type: 'spec',
            name: `${relatedSpecs.length} specs`,
            tokensUsed: specsTokens,
          });
        }
      }

      // 6. MATCHING: Jira Context
      const jiraContext = await getJiraContext(projectId, analysis.terms);
      if (jiraContext.length > 0) {
        const budgetRemaining = Math.min(TOKEN_BUDGETS.jira, maxTokens - tokensUsed);
        const jiraText = formatJiraContext(jiraContext, budgetRemaining);
        const jiraTokens = estimateTokens(jiraText);

        if (jiraText && jiraTokens > 0) {
          parts.push(jiraText);
          tokensUsed += jiraTokens;
          sourcesUsed.push({
            type: 'jira',
            name: `${jiraContext.length} tickets`,
            tokensUsed: jiraTokens,
          });
        }
      }

      // 7. MATCHING: Document Chunks
      const docChunks = await getDocumentChunks(projectId, analysis.terms);
      if (docChunks.length > 0) {
        const budgetRemaining = Math.min(TOKEN_BUDGETS.documents, maxTokens - tokensUsed);
        const docsText = formatDocumentChunks(docChunks, budgetRemaining);
        const docsTokens = estimateTokens(docsText);

        if (docsText && docsTokens > 0) {
          parts.push(docsText);
          tokensUsed += docsTokens;
          sourcesUsed.push({
            type: 'document',
            name: `${docChunks.length} chunks`,
            tokensUsed: docsTokens,
          });
        }
      }

      // 8. ASSEMBLE FINAL CONTEXT
      const contextString = parts.length > 0
        ? `## Project Context\n\n${parts.join('\n\n')}`
        : '';

      return { contextString, tokensUsed, sourcesUsed };
    },

    async previewContext(projectId: string, specContent: string): Promise<ContextBuildResult> {
      // Same as buildContext but with abbreviated content
      return this.buildContext(projectId, specContent.slice(0, 2000));
    },
  };
}

// Singleton instance
let _contextBuilder: ContextBuilderService | null = null;

export function getContextBuilder(): ContextBuilderService {
  if (!_contextBuilder) {
    _contextBuilder = createContextBuilder();
  }
  return _contextBuilder;
}
