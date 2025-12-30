# Feature 16: Smart Context Builder

## Overview

**What:** The brain of the context engine. For each translation, intelligently select and assemble the most relevant context from all available sources, fitting within token budget.

**Why:** Having context isn't enough - you need the *right* context. Dumping everything into the prompt wastes tokens and dilutes focus. The Context Builder does RAG-style retrieval to pick what matters for *this specific spec*.

**Success Criteria:**
- Context relevance improves translation quality
- Token usage is optimized (max ~2000 tokens overhead)
- Context sources are prioritized intelligently
- Users can see what context was used

## How It Works

```
INPUT: Spec to translate
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CONTEXT BUILDER                                │
│                                                                     │
│  1. ANALYZE SPEC                                                    │
│     • Extract key terms, entities, concepts                         │
│     • Identify domain (HL7, API, UI, etc.)                         │
│                                                                     │
│  2. RETRIEVE RELEVANT CONTEXT                                       │
│     • Brief (always)                                                │
│     • Glossary (matching terms)                                     │
│     • Specs (related summaries)                                     │
│     • Jira (relevant tickets)                                       │
│     • Docs (matching chunks)                                        │
│     • Preferences (always)                                          │
│                                                                     │
│  3. RANK BY RELEVANCE                                              │
│     • Score each chunk by term overlap                              │
│     • Boost chunks from same domain                                 │
│                                                                     │
│  4. SELECT WITHIN BUDGET                                            │
│     • Token budget: 2000 tokens                                     │
│     • Priority order determines cutoff                              │
│                                                                     │
│  5. FORMAT FOR PROMPT                                               │
│     • Structure as markdown sections                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
OUTPUT: Formatted context string for AI prompt
```

## Token Budget Strategy

**Budget Allocation (~2000 tokens max):**

| Source | Priority | Budget | Notes |
|--------|----------|--------|-------|
| Project Brief | 1 (always) | 400 tokens | Core context |
| Team Preferences | 2 (always) | 100 tokens | Format instructions |
| Relevant Glossary | 3 (matching) | 300 tokens | Only matching terms |
| Related Specs | 4 (matching) | 600 tokens | Top 3 most relevant |
| Jira Context | 5 (matching) | 400 tokens | Relevant tickets |
| Document Chunks | 6 (matching) | 200 tokens | Relevant sections |

**Cost: ~$0.006 per translation (negligible)**

## Implementation

### ContextBuilder Service

**File:** `backend/src/services/ContextBuilder.ts`

```typescript
import { PrismaClient } from '@prisma/client';

interface ContextBuildResult {
  contextString: string;
  tokensUsed: number;
  sourcesUsed: ContextSourceUsed[];
}

interface ContextSourceUsed {
  type: 'brief' | 'glossary' | 'preferences' | 'spec' | 'jira' | 'document';
  name: string;
  tokensUsed: number;
}

const DEFAULT_MAX_TOKENS = 2000;

export class ContextBuilder {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

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
    const analysis = this.analyzeSpec(specText);

    // 2. ALWAYS INCLUDE: Project Brief
    const brief = await this.getProjectBrief(projectId);
    if (brief) {
      const briefTokens = this.estimateTokens(brief);
      if (tokensUsed + briefTokens <= maxTokens) {
        parts.push(`### About This Project\n\n${brief}`);
        tokensUsed += briefTokens;
        sourcesUsed.push({ type: 'brief', name: 'Project Brief', tokensUsed: briefTokens });
      }
    }

    // 3. ALWAYS INCLUDE: Team Preferences
    const prefs = await this.getTeamPreferences(projectId);
    if (prefs) {
      const prefsText = this.formatPreferences(prefs);
      const prefsTokens = this.estimateTokens(prefsText);
      if (tokensUsed + prefsTokens <= maxTokens) {
        parts.push(prefsText);
        tokensUsed += prefsTokens;
        sourcesUsed.push({ type: 'preferences', name: 'Team Preferences', tokensUsed: prefsTokens });
      }
    }

    // 4. MATCHING: Relevant Glossary Terms
    const glossaryTerms = await this.getRelevantGlossary(projectId, analysis.terms);
    if (glossaryTerms.length > 0) {
      const glossaryText = this.formatGlossary(glossaryTerms);
      const glossaryTokens = this.estimateTokens(glossaryText);
      const budgetRemaining = Math.min(300, maxTokens - tokensUsed);
      
      if (glossaryTokens <= budgetRemaining) {
        parts.push(glossaryText);
        tokensUsed += glossaryTokens;
        sourcesUsed.push({ type: 'glossary', name: `${glossaryTerms.length} terms`, tokensUsed: glossaryTokens });
      }
    }

    // 5. MATCHING: Related Specs
    const relatedSpecs = await this.getRelatedSpecs(projectId, analysis.terms);
    if (relatedSpecs.length > 0) {
      const budgetRemaining = Math.min(600, maxTokens - tokensUsed);
      const specsText = this.formatRelatedSpecs(relatedSpecs, budgetRemaining);
      const specsTokens = this.estimateTokens(specsText);
      
      if (specsTokens > 0) {
        parts.push(specsText);
        tokensUsed += specsTokens;
        sourcesUsed.push({ type: 'spec', name: `${relatedSpecs.length} specs`, tokensUsed: specsTokens });
      }
    }

    // 6. MATCHING: Jira Context
    const jiraContext = await this.getJiraContext(projectId, analysis.terms);
    if (jiraContext.length > 0) {
      const budgetRemaining = Math.min(400, maxTokens - tokensUsed);
      const jiraText = this.formatJiraContext(jiraContext, budgetRemaining);
      const jiraTokens = this.estimateTokens(jiraText);
      
      if (jiraTokens > 0) {
        parts.push(jiraText);
        tokensUsed += jiraTokens;
        sourcesUsed.push({ type: 'jira', name: `${jiraContext.length} tickets`, tokensUsed: jiraTokens });
      }
    }

    // 7. MATCHING: Document Chunks
    const docChunks = await this.getDocumentChunks(projectId, analysis.terms);
    if (docChunks.length > 0) {
      const budgetRemaining = Math.min(200, maxTokens - tokensUsed);
      const docsText = this.formatDocumentChunks(docChunks, budgetRemaining);
      const docsTokens = this.estimateTokens(docsText);
      
      if (docsTokens > 0) {
        parts.push(docsText);
        tokensUsed += docsTokens;
        sourcesUsed.push({ type: 'document', name: `${docChunks.length} chunks`, tokensUsed: docsTokens });
      }
    }

    // 8. ASSEMBLE FINAL CONTEXT
    const contextString = parts.length > 0
      ? `## Project Context\n\n${parts.join('\n\n')}`
      : '';

    return { contextString, tokensUsed, sourcesUsed };
  }

  // ========================================
  // ANALYSIS
  // ========================================

  private analyzeSpec(specText: string): { terms: string[]; entities: string[] } {
    const words = specText.toLowerCase().split(/\W+/);
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'have', 'has', 'had', 'do', 'does', 'will', 'would', 'could', 'should', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'and', 'but', 'or', 'not', 'this', 'that', 'these', 'those']);
    
    const terms = [...new Set(words.filter(w => 
      w.length > 3 && !stopWords.has(w) && !/^\d+$/.test(w)
    ))];

    const entityPattern = /\b([A-Z][a-z]+|[A-Z]{2,})\b/g;
    const entities = [...new Set(specText.match(entityPattern) || [])];

    return { terms, entities };
  }

  // ========================================
  // DATA RETRIEVAL
  // ========================================

  private async getProjectBrief(projectId: string): Promise<string | null> {
    const knowledge = await this.prisma.projectKnowledge.findUnique({
      where: { projectId },
    });
    return knowledge?.brief || null;
  }

  private async getTeamPreferences(projectId: string): Promise<any | null> {
    return this.prisma.teamPreferences.findUnique({ where: { projectId } });
  }

  private async getRelevantGlossary(projectId: string, terms: string[]): Promise<any[]> {
    const allTerms = await this.prisma.glossaryTerm.findMany({ where: { projectId } });
    return allTerms.filter(gt => {
      const termLower = gt.term.toLowerCase();
      return terms.some(t => termLower.includes(t) || t.includes(termLower));
    });
  }

  private async getRelatedSpecs(projectId: string, terms: string[]): Promise<any[]> {
    return this.prisma.contextChunk.findMany({
      where: {
        projectId,
        sourceType: 'specs',
        keywords: { hasSome: terms.slice(0, 20) },
      },
      take: 5,
    });
  }

  private async getJiraContext(projectId: string, terms: string[]): Promise<any[]> {
    return this.prisma.contextChunk.findMany({
      where: {
        projectId,
        sourceType: 'jira',
        keywords: { hasSome: terms.slice(0, 10) },
      },
      take: 5,
    });
  }

  private async getDocumentChunks(projectId: string, terms: string[]): Promise<any[]> {
    return this.prisma.contextChunk.findMany({
      where: {
        projectId,
        sourceType: 'document',
        keywords: { hasSome: terms.slice(0, 10) },
      },
      take: 3,
    });
  }

  // ========================================
  // FORMATTING
  // ========================================

  private formatPreferences(prefs: any): string {
    const lines = ['### Team Conventions'];
    const formatNames: Record<string, string> = {
      gherkin: 'Given/When/Then',
      bullets: 'Bullet points',
      checklist: 'Checklist',
      numbered: 'Numbered list',
    };
    if (prefs.acFormat) lines.push(`- AC Format: ${formatNames[prefs.acFormat] || prefs.acFormat}`);
    if (prefs.requiredSections?.length) lines.push(`- Include: ${prefs.requiredSections.join(', ')}`);
    if (prefs.customPrefs?.length) {
      prefs.customPrefs.forEach((p: string) => lines.push(`- ${p}`));
    }
    return lines.join('\n');
  }

  private formatGlossary(terms: any[]): string {
    const lines = ['### Domain Terminology'];
    for (const term of terms.slice(0, 15)) {
      lines.push(`- **${term.term}**: ${term.definition}`);
    }
    return lines.join('\n');
  }

  private formatRelatedSpecs(specs: any[], maxTokens: number): string {
    const lines = ['### Related Specifications'];
    let tokens = 30;
    for (const spec of specs) {
      const line = `- ${spec.metadata?.specName || 'Spec'}: ${spec.summary || spec.content.slice(0, 200)}`;
      if (tokens + this.estimateTokens(line) > maxTokens) break;
      lines.push(line);
      tokens += this.estimateTokens(line);
    }
    return lines.length > 1 ? lines.join('\n') : '';
  }

  private formatJiraContext(tickets: any[], maxTokens: number): string {
    const lines = ['### Existing Work'];
    let tokens = 20;
    for (const ticket of tickets) {
      const line = `- ${ticket.sourceId}: ${ticket.summary || ticket.content.slice(0, 150)}`;
      if (tokens + this.estimateTokens(line) > maxTokens) break;
      lines.push(line);
      tokens += this.estimateTokens(line);
    }
    return lines.length > 1 ? lines.join('\n') : '';
  }

  private formatDocumentChunks(chunks: any[], maxTokens: number): string {
    const lines = ['### Reference Documentation'];
    let tokens = 30;
    for (const chunk of chunks) {
      const line = `- ${chunk.content.slice(0, 200)}...`;
      if (tokens + this.estimateTokens(line) > maxTokens) break;
      lines.push(line);
      tokens += this.estimateTokens(line);
    }
    return lines.length > 1 ? lines.join('\n') : '';
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
```

## Integration with Translation Service

```typescript
// In TranslationService.ts

import { ContextBuilder } from './ContextBuilder';

export class TranslationService {
  private contextBuilder: ContextBuilder;

  async translateSpec(specId: string): Promise<TranslationResult> {
    const spec = await this.prisma.spec.findUnique({ where: { id: specId } });
    
    // BUILD CONTEXT
    const contextResult = await this.contextBuilder.buildContext(
      spec.projectId,
      spec.rawContent
    );

    console.log(`Context: ${contextResult.tokensUsed} tokens from ${contextResult.sourcesUsed.length} sources`);

    // Include in translation prompt
    const prompt = `
${contextResult.contextString}

---

## Specification to Translate

${spec.rawContent}

---

Based on the project context and specification, generate user stories...
`;

    // Continue with translation...
  }
}
```

## Context Preview UI

**File:** `frontend/src/components/organisms/ContextPreview.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

interface ContextSource {
  type: string;
  name: string;
  tokensUsed: number;
}

export function ContextPreview({ projectId, specContent }: { projectId: string; specContent: string }) {
  const [preview, setPreview] = useState<{
    sources: ContextSource[];
    totalTokens: number;
    contextString: string;
  } | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (specContent.length > 100) {
      api.post(`/projects/${projectId}/context/preview`, {
        specContent: specContent.slice(0, 2000),
      }).then(r => setPreview(r.data.data));
    }
  }, [projectId]);

  if (!preview) return null;

  const colors: Record<string, string> = {
    brief: 'bg-blue-500',
    glossary: 'bg-green-500',
    preferences: 'bg-purple-500',
    spec: 'bg-yellow-500',
    jira: 'bg-cyan-500',
    document: 'bg-pink-500',
  };

  return (
    <div className="bg-toucan-dark-lighter rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-toucan-orange">🧠</span>
          <span className="text-sm font-medium text-toucan-grey-200">Context Engine</span>
        </div>
        <span className="text-xs text-toucan-grey-500">
          {preview.totalTokens} tokens • {preview.sources.length} sources
        </span>
      </div>

      {/* Token Distribution Bar */}
      <div className="flex gap-0.5 mt-3 h-2 rounded-full overflow-hidden">
        {preview.sources.map((source, i) => (
          <div
            key={i}
            className={colors[source.type] || 'bg-gray-500'}
            style={{ width: `${(source.tokensUsed / preview.totalTokens) * 100}%` }}
            title={`${source.name}: ${source.tokensUsed} tokens`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 text-xs">
        {preview.sources.map((source, i) => (
          <span key={i} className="text-toucan-grey-400">
            <span className={`inline-block w-2 h-2 rounded-full ${colors[source.type]} mr-1`} />
            {source.name}
          </span>
        ))}
      </div>

      {/* Expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-xs text-toucan-grey-500 hover:text-toucan-grey-300"
      >
        {expanded ? '▼ Hide' : '▶ Show'} full context
      </button>

      {expanded && (
        <pre className="mt-3 text-xs text-toucan-grey-400 bg-toucan-dark rounded p-3 max-h-64 overflow-auto whitespace-pre-wrap">
          {preview.contextString}
        </pre>
      )}
    </div>
  );
}
```

## Testing Checklist

- [ ] Build context for spec with no knowledge → minimal/empty
- [ ] Add brief → included in context
- [ ] Add glossary terms → matching terms included
- [ ] Translate another spec → first spec's summary available
- [ ] Connect Jira → relevant tickets included
- [ ] Total tokens stays under 2000
- [ ] Context preview shows in UI
- [ ] Translation uses context (visible improvement)

## Dependencies

- Feature 14 (Knowledge Base)
- Feature 15 (Context Sources)

## Effort Estimate

**8 hours**
- ContextBuilder service: 3 hours
- Retrieval logic: 1.5 hours
- Formatting: 1 hour
- TranslationService integration: 1 hour
- ContextPreview UI: 1 hour
- Testing: 30 min
