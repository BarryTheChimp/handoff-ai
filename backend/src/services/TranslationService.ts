import { PrismaClient, Spec, SpecSection, WorkItem, WorkItemType, WorkItemStatus, SizeEstimate } from '@prisma/client';
import { getClaudeService, ClaudeOptions } from './ClaudeService.js';
import { createPromptService } from './PromptService.js';

// =============================================================================
// TYPES - Response types from each AI pass
// =============================================================================

/** Pass 1: Structure Analysis Response */
interface StructureAnalysis {
  documentType: string;
  summary: string;
  themes: Array<{
    name: string;
    description: string;
    sectionRefs: string[];
  }>;
  entities: Array<{
    name: string;
    description: string;
  }>;
  technicalComponents: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  integrations: Array<{
    name: string;
    purpose: string;
  }>;
  complexity: 'low' | 'medium' | 'high';
  estimatedEpics: number;
}

/** Pass 2: Epic Generation Response */
interface EpicGeneration {
  epics: Array<{
    title: string;
    description: string;
    scope: string[];
    outOfScope?: string[];
    sectionRefs: string[];
    themes: string[];
    suggestedFeatureCount: number;
  }>;
}

/** Pass 3: Story Generation Response */
interface StoryGeneration {
  features: Array<{
    title: string;
    description: string;
    stories: Array<{
      title: string;
      description: string;
      acceptanceCriteria: string;
      technicalNotes: string;
      size: 'S' | 'M' | 'L' | 'XL';
      sectionRefs: string[];
    }>;
  }>;
}

/** Pass 4: Enrichment Response */
interface EnrichmentResult {
  dependencies: Array<{
    storyTitle: string;
    dependsOn: string;
    reason: string;
  }>;
  coverage: {
    coveredSections: string[];
    uncoveredSections: string[];
    coveragePercent: number;
  };
  issues: Array<{
    storyTitle: string;
    issueType: string;
    description: string;
    suggestion: string;
  }>;
  suggestedStories: Array<{
    title: string;
    reason: string;
    parentFeature: string;
    sectionRefs: string[];
  }>;
  qualityScore: number;
  summary: string;
}

/** Full Translation Result */
export interface TranslationResult {
  specId: string;
  analysis: StructureAnalysis;
  epicsCreated: number;
  featuresCreated: number;
  storiesCreated: number;
  enrichment: EnrichmentResult;
  warnings: string[];
  durationMs: number;
}

/** Translation Service Error */
export class TranslationError extends Error {
  constructor(
    message: string,
    public readonly phase: string,
    public readonly specId: string
  ) {
    super(message);
    this.name = 'TranslationError';
  }
}

// =============================================================================
// SERVICE INTERFACE
// =============================================================================

export interface TranslationService {
  translate(specId: string): Promise<TranslationResult>;
  getTranslationStatus(specId: string): Promise<{ status: string; progress?: number }>;
}

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

/** Questionnaire preferences stored in spec metadata */
interface QuestionnairePrefs {
  documentType: 'api-spec' | 'requirements' | 'design' | 'other';
  structure: 'epic-feature-story' | 'epic-story';
  storySize: 'small' | 'medium' | 'large';
  acFormat: 'given-when-then' | 'bullets' | 'checklist';
  technicalNotes: {
    apiSchemas: boolean;
    dbChanges: boolean;
    dependencies: boolean;
  };
}

const DEFAULT_PREFS: QuestionnairePrefs = {
  documentType: 'api-spec',
  structure: 'epic-feature-story',
  storySize: 'medium',
  acFormat: 'given-when-then',
  technicalNotes: {
    apiSchemas: true,
    dbChanges: true,
    dependencies: true,
  },
};

/** Extract questionnaire preferences from spec metadata */
function getPreferences(metadata: unknown): QuestionnairePrefs {
  if (!metadata || typeof metadata !== 'object') {
    return DEFAULT_PREFS;
  }
  const m = metadata as Partial<QuestionnairePrefs>;
  return {
    documentType: m.documentType || DEFAULT_PREFS.documentType,
    structure: m.structure || DEFAULT_PREFS.structure,
    storySize: m.storySize || DEFAULT_PREFS.storySize,
    acFormat: m.acFormat || DEFAULT_PREFS.acFormat,
    technicalNotes: m.technicalNotes || DEFAULT_PREFS.technicalNotes,
  };
}

export function createTranslationService(prisma: PrismaClient): TranslationService {
  const claude = getClaudeService();
  const prompts = createPromptService();

  // Default spec type for prompts
  const DEFAULT_SPEC_TYPE = 'api-spec';

  /**
   * Pass 1: Analyze document structure using Haiku (cheap, fast)
   * Identifies themes, entities, technical components, and complexity
   */
  async function analyzeStructure(
    spec: Spec,
    sections: SpecSection[]
  ): Promise<StructureAnalysis> {
    console.log('[Translation] Pass 1: Structure Analysis (Haiku)');

    const prompt = await prompts.loadAndRender(spec.specType || DEFAULT_SPEC_TYPE, 'structure', {
      documentContent: spec.extractedText || '',
      sections: sections.map(s => ({
        ref: s.sectionRef,
        heading: s.heading,
        content: s.content.slice(0, 500) + (s.content.length > 500 ? '...' : ''),
      })),
    });

    const options: ClaudeOptions = {
      model: 'haiku', // Cost-effective for analysis
      temperature: 0.1, // Low creativity, high consistency
    };

    return await claude.completeJSON<StructureAnalysis>(prompt, options);
  }

  /**
   * Pass 2: Generate Epics using Sonnet (quality generation)
   * Creates high-level work items based on identified themes
   */
  async function generateEpics(
    spec: Spec,
    analysis: StructureAnalysis
  ): Promise<EpicGeneration> {
    console.log('[Translation] Pass 2: Epic Generation (Sonnet)');

    const prompt = await prompts.loadAndRender(spec.specType || DEFAULT_SPEC_TYPE, 'epics', {
      summary: analysis.summary,
      themes: analysis.themes,
      entities: analysis.entities,
      technicalComponents: analysis.technicalComponents,
    });

    const options: ClaudeOptions = {
      model: 'sonnet', // Quality for generation
      temperature: 0.3, // Slight creativity for good titles/descriptions
      maxTokens: 4096,
    };

    return await claude.completeJSON<EpicGeneration>(prompt, options);
  }

  /**
   * Pass 3: Generate Stories for each Epic using Sonnet (quality generation)
   * Breaks down epics into features and user stories
   */
  async function generateStories(
    spec: Spec,
    sections: SpecSection[],
    epic: EpicGeneration['epics'][0],
    config: { acFormat: string; sizePreference: string }
  ): Promise<StoryGeneration> {
    console.log(`[Translation] Pass 3: Story Generation for "${epic.title}" (Sonnet)`);

    // Find relevant sections for this epic
    const relevantSections = sections.filter(s =>
      epic.sectionRefs.includes(s.sectionRef)
    );

    // Get full preferences for additional context
    const prefs = getPreferences(spec.metadata);

    const prompt = await prompts.loadAndRender(spec.specType || DEFAULT_SPEC_TYPE, 'stories', {
      epicTitle: epic.title,
      epicDescription: epic.description,
      epicScope: epic.scope.join('\n- '),
      relevantSections: relevantSections.map(s => ({
        ref: s.sectionRef,
        heading: s.heading,
        content: s.content,
      })),
      structure: prefs.structure === 'epic-story' ? 'epic > story (no features)' : 'epic > feature > story',
      sizePreference: config.sizePreference,
      acFormat: config.acFormat,
      includeApiSchemas: prefs.technicalNotes.apiSchemas,
      includeDbChanges: prefs.technicalNotes.dbChanges,
      includeDependencies: prefs.technicalNotes.dependencies,
    });

    const options: ClaudeOptions = {
      model: 'sonnet', // Quality for generation
      temperature: 0.3,
      maxTokens: 8192, // Stories can be lengthy
    };

    return await claude.completeJSON<StoryGeneration>(prompt, options);
  }

  /**
   * Pass 4: Enrich and validate using Haiku (cheap validation)
   * Identifies dependencies, coverage gaps, and issues
   */
  async function enrichWorkItems(
    spec: Spec,
    sections: SpecSection[],
    workItems: Array<{ type: string; title: string; parentTitle?: string }>
  ): Promise<EnrichmentResult> {
    console.log('[Translation] Pass 4: Enrichment (Haiku)');

    const prompt = await prompts.loadAndRender(spec.specType || DEFAULT_SPEC_TYPE, 'enrichment', {
      workItems: workItems,
      sections: sections.map(s => ({
        ref: s.sectionRef,
        heading: s.heading,
      })),
    });

    const options: ClaudeOptions = {
      model: 'haiku', // Cost-effective for validation
      temperature: 0.1,
    };

    return await claude.completeJSON<EnrichmentResult>(prompt, options);
  }

  /**
   * Create work items in the database from generated data
   */
  async function saveWorkItems(
    specId: string,
    sections: SpecSection[],
    epics: EpicGeneration,
    storiesByEpic: Map<string, StoryGeneration>
  ): Promise<{ epicsCreated: number; featuresCreated: number; storiesCreated: number }> {
    let epicIndex = 0;
    let epicsCreated = 0;
    let featuresCreated = 0;
    let storiesCreated = 0;

    // Build a section lookup map for linking
    const sectionByRef = new Map(sections.map(s => [s.sectionRef, s]));

    for (const epicData of epics.epics) {
      // Create Epic
      const epic = await prisma.workItem.create({
        data: {
          specId,
          type: WorkItemType.epic,
          title: epicData.title,
          description: epicData.description,
          technicalNotes: epicData.scope.join('\n'),
          status: WorkItemStatus.draft,
          orderIndex: epicIndex++,
        },
      });
      epicsCreated++;

      // Link epic to source sections
      for (const ref of epicData.sectionRefs) {
        const section = sectionByRef.get(ref);
        if (section) {
          await prisma.workItemSource.create({
            data: {
              workItemId: epic.id,
              sectionId: section.id,
              relevanceScore: 1.0,
            },
          });
        }
      }

      // Get stories for this epic
      const storyData = storiesByEpic.get(epicData.title);
      if (!storyData) continue;

      let featureIndex = 0;
      for (const featureData of storyData.features) {
        // Create Feature
        const feature = await prisma.workItem.create({
          data: {
            specId,
            parentId: epic.id,
            type: WorkItemType.feature,
            title: featureData.title,
            description: featureData.description,
            status: WorkItemStatus.draft,
            orderIndex: featureIndex++,
          },
        });
        featuresCreated++;

        let storyIndex = 0;
        for (const storyItem of featureData.stories) {
          // Map size string to enum
          const sizeMap: Record<string, SizeEstimate> = {
            S: SizeEstimate.S,
            M: SizeEstimate.M,
            L: SizeEstimate.L,
            XL: SizeEstimate.XL,
          };

          // Create Story
          const story = await prisma.workItem.create({
            data: {
              specId,
              parentId: feature.id,
              type: WorkItemType.story,
              title: storyItem.title,
              description: storyItem.description,
              acceptanceCriteria: storyItem.acceptanceCriteria,
              technicalNotes: storyItem.technicalNotes,
              sizeEstimate: sizeMap[storyItem.size] || SizeEstimate.M,
              status: WorkItemStatus.draft,
              orderIndex: storyIndex++,
            },
          });
          storiesCreated++;

          // Link story to source sections
          for (const ref of storyItem.sectionRefs) {
            const section = sectionByRef.get(ref);
            if (section) {
              await prisma.workItemSource.create({
                data: {
                  workItemId: story.id,
                  sectionId: section.id,
                  relevanceScore: 1.0,
                },
              });
            }
          }
        }
      }
    }

    return { epicsCreated, featuresCreated, storiesCreated };
  }

  return {
    /**
     * Translate a specification into work items using a 4-pass AI pipeline.
     *
     * Pass 1 (Haiku): Structure analysis - identify themes, entities, complexity
     * Pass 2 (Sonnet): Epic generation - create high-level work items
     * Pass 3 (Sonnet): Story generation - break down into features and stories
     * Pass 4 (Haiku): Enrichment - dependencies, coverage, quality check
     *
     * @param specId - The spec to translate (must have status 'ready')
     * @returns Translation result with stats and enrichment data
     * @throws {TranslationError} If any phase fails
     */
    async translate(specId: string): Promise<TranslationResult> {
      const startTime = Date.now();
      const warnings: string[] = [];

      // Load spec and validate status
      const spec = await prisma.spec.findUnique({
        where: { id: specId },
        include: { sections: { orderBy: { orderIndex: 'asc' } } },
      });

      if (!spec) {
        throw new TranslationError('Spec not found', 'validation', specId);
      }

      if (spec.status !== 'ready') {
        throw new TranslationError(
          `Spec must be in 'ready' status, currently: ${spec.status}`,
          'validation',
          specId
        );
      }

      if (spec.sections.length === 0) {
        throw new TranslationError('Spec has no extracted sections', 'validation', specId);
      }

      // Update status to translating
      await prisma.spec.update({
        where: { id: specId },
        data: { status: 'translating' },
      });

      try {
        // =====================================================================
        // PASS 1: Structure Analysis (Haiku - cheap)
        // =====================================================================
        console.log('[Translation] Starting 4-pass pipeline...');
        const analysis = await analyzeStructure(spec, spec.sections);
        console.log(`[Translation] Analysis complete: ${analysis.estimatedEpics} estimated epics, complexity: ${analysis.complexity}`);

        // =====================================================================
        // PASS 2: Epic Generation (Sonnet - quality)
        // =====================================================================
        const epics = await generateEpics(spec, analysis);
        console.log(`[Translation] Generated ${epics.epics.length} epics`);

        if (epics.epics.length === 0) {
          warnings.push('No epics were generated from the analysis');
        }

        // =====================================================================
        // PASS 3: Story Generation (Sonnet - quality)
        // For each epic, generate features and stories
        // =====================================================================
        const storiesByEpic = new Map<string, StoryGeneration>();
        // Use questionnaire preferences for story generation
        const prefs = getPreferences(spec.metadata);
        const config = {
          acFormat: prefs.acFormat,
          sizePreference: prefs.storySize,
        };

        for (const epic of epics.epics) {
          try {
            const stories = await generateStories(spec, spec.sections, epic, config);
            storiesByEpic.set(epic.title, stories);
            console.log(`[Translation] Generated ${stories.features.length} features for epic "${epic.title}"`);
          } catch (error) {
            console.error(`[Translation] Failed to generate stories for epic "${epic.title}":`, error);
            warnings.push(`Failed to generate stories for epic: ${epic.title}`);
          }
        }

        // =====================================================================
        // Save work items to database
        // =====================================================================
        const counts = await saveWorkItems(specId, spec.sections, epics, storiesByEpic);
        console.log(`[Translation] Saved ${counts.epicsCreated} epics, ${counts.featuresCreated} features, ${counts.storiesCreated} stories`);

        // =====================================================================
        // PASS 4: Enrichment (Haiku - cheap)
        // =====================================================================
        const allWorkItems = await prisma.workItem.findMany({
          where: { specId },
          include: { parent: true },
        });

        const workItemsForEnrichment = allWorkItems.map(wi => {
          const item: { type: string; title: string; parentTitle?: string } = {
            type: wi.type,
            title: wi.title,
          };
          if (wi.parent?.title) {
            item.parentTitle = wi.parent.title;
          }
          return item;
        });

        const enrichment = await enrichWorkItems(spec, spec.sections, workItemsForEnrichment);
        console.log(`[Translation] Enrichment complete: quality score ${enrichment.qualityScore}/10`);

        // Add enrichment issues as warnings
        for (const issue of enrichment.issues) {
          warnings.push(`${issue.issueType}: ${issue.storyTitle} - ${issue.description}`);
        }

        // Add coverage gaps as warnings
        if (enrichment.coverage.uncoveredSections.length > 0) {
          warnings.push(`Uncovered sections: ${enrichment.coverage.uncoveredSections.join(', ')}`);
        }

        // =====================================================================
        // Update spec status to translated
        // =====================================================================
        await prisma.spec.update({
          where: { id: specId },
          data: {
            status: 'translated',
            metadata: {
              ...(spec.metadata as object || {}),
              translationResult: {
                analysis: {
                  documentType: analysis.documentType,
                  complexity: analysis.complexity,
                  themesCount: analysis.themes.length,
                },
                epicsCreated: counts.epicsCreated,
                featuresCreated: counts.featuresCreated,
                storiesCreated: counts.storiesCreated,
                qualityScore: enrichment.qualityScore,
                coveragePercent: enrichment.coverage.coveragePercent,
                translatedAt: new Date().toISOString(),
              },
            },
          },
        });

        const durationMs = Date.now() - startTime;
        console.log(`[Translation] Pipeline complete in ${durationMs}ms`);

        return {
          specId,
          analysis,
          epicsCreated: counts.epicsCreated,
          featuresCreated: counts.featuresCreated,
          storiesCreated: counts.storiesCreated,
          enrichment,
          warnings,
          durationMs,
        };
      } catch (error) {
        // Update status to error
        await prisma.spec.update({
          where: { id: specId },
          data: {
            status: 'error',
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        });

        if (error instanceof TranslationError) {
          throw error;
        }

        throw new TranslationError(
          `Translation failed: ${error instanceof Error ? error.message : String(error)}`,
          'unknown',
          specId
        );
      }
    },

    /**
     * Get the current translation status for a spec
     */
    async getTranslationStatus(specId: string): Promise<{ status: string; progress?: number }> {
      const spec = await prisma.spec.findUnique({
        where: { id: specId },
        select: { status: true, metadata: true },
      });

      if (!spec) {
        throw new TranslationError('Spec not found', 'validation', specId);
      }

      return {
        status: spec.status,
      };
    },
  };
}

// Singleton instance (requires prisma to be passed in)
let _translationService: TranslationService | null = null;

export function getTranslationService(prisma: PrismaClient): TranslationService {
  if (!_translationService) {
    _translationService = createTranslationService(prisma);
  }
  return _translationService;
}
