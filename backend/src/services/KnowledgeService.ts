import { prisma } from '../lib/prisma.js';
import type { DocumentType, ACFormat, Verbosity, TechnicalDepth } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface ProjectBrief {
  projectId: string;
  brief: string | null;
  briefUpdatedAt: Date | null;
}

export interface GlossaryTermData {
  id: string;
  projectId: string;
  term: string;
  definition: string;
  aliases: string[];
  category: string | null;
  useInstead: string | null;
  avoidTerms: string[];
  isManual: boolean;
  sourceSpecId: string | null;
  confidence: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGlossaryTermInput {
  term: string;
  definition: string;
  aliases?: string[];
  category?: string;
  useInstead?: string;
  avoidTerms?: string[];
}

export interface UpdateGlossaryTermInput {
  term?: string;
  definition?: string;
  aliases?: string[];
  category?: string | null;
  useInstead?: string | null;
  avoidTerms?: string[];
}

export interface ReferenceDocumentData {
  id: string;
  projectId: string;
  name: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  extractedText: string | null;
  summary: string | null;
  docType: DocumentType;
  isActive: boolean;
  uploadedAt: Date;
  uploadedBy: string;
}

export interface CreateReferenceDocInput {
  name: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  docType?: DocumentType;
  uploadedBy: string;
}

export interface TeamPreferencesConfigData {
  id: string;
  projectId: string;
  acFormat: ACFormat;
  requiredSections: string[];
  maxAcCount: number;
  verbosity: Verbosity;
  technicalDepth: TechnicalDepth;
  customPrefs: unknown[];
  updatedAt: Date;
}

export interface UpdatePreferencesConfigInput {
  acFormat?: ACFormat;
  requiredSections?: string[];
  maxAcCount?: number;
  verbosity?: Verbosity;
  technicalDepth?: TechnicalDepth;
  customPrefs?: unknown[];
}

// =============================================================================
// SERVICE INTERFACE
// =============================================================================

export interface KnowledgeService {
  // Project Brief
  getBrief(projectId: string): Promise<ProjectBrief | null>;
  updateBrief(projectId: string, brief: string): Promise<ProjectBrief>;

  // Glossary
  listGlossaryTerms(projectId: string, category?: string): Promise<GlossaryTermData[]>;
  getGlossaryTerm(termId: string): Promise<GlossaryTermData | null>;
  createGlossaryTerm(projectId: string, input: CreateGlossaryTermInput): Promise<GlossaryTermData>;
  updateGlossaryTerm(termId: string, input: UpdateGlossaryTermInput): Promise<GlossaryTermData>;
  deleteGlossaryTerm(termId: string): Promise<void>;
  bulkImportGlossary(projectId: string, terms: CreateGlossaryTermInput[]): Promise<{ imported: number; skipped: number }>;

  // Reference Documents
  listReferenceDocuments(projectId: string): Promise<ReferenceDocumentData[]>;
  getReferenceDocument(docId: string): Promise<ReferenceDocumentData | null>;
  createReferenceDocument(projectId: string, input: CreateReferenceDocInput): Promise<ReferenceDocumentData>;
  updateReferenceDocument(docId: string, updates: { name?: string; docType?: DocumentType; isActive?: boolean }): Promise<ReferenceDocumentData>;
  deleteReferenceDocument(docId: string): Promise<void>;
  setDocumentExtractedText(docId: string, text: string, summary?: string): Promise<void>;

  // Team Preferences Config
  getPreferencesConfig(projectId: string): Promise<TeamPreferencesConfigData | null>;
  updatePreferencesConfig(projectId: string, input: UpdatePreferencesConfigInput): Promise<TeamPreferencesConfigData>;

  // Build context for AI prompts
  buildContextForPrompt(projectId: string): Promise<string>;
}

// =============================================================================
// IMPLEMENTATION
// =============================================================================

export function createKnowledgeService(): KnowledgeService {
  return {
    // =========================================================================
    // PROJECT BRIEF
    // =========================================================================

    async getBrief(projectId: string): Promise<ProjectBrief | null> {
      const knowledge = await prisma.projectKnowledge.findUnique({
        where: { projectId },
      });

      if (!knowledge) {
        return null;
      }

      return {
        projectId: knowledge.projectId,
        brief: knowledge.brief,
        briefUpdatedAt: knowledge.briefUpdatedAt,
      };
    },

    async updateBrief(projectId: string, brief: string): Promise<ProjectBrief> {
      const knowledge = await prisma.projectKnowledge.upsert({
        where: { projectId },
        create: {
          projectId,
          brief,
          briefUpdatedAt: new Date(),
        },
        update: {
          brief,
          briefUpdatedAt: new Date(),
        },
      });

      return {
        projectId: knowledge.projectId,
        brief: knowledge.brief,
        briefUpdatedAt: knowledge.briefUpdatedAt,
      };
    },

    // =========================================================================
    // GLOSSARY
    // =========================================================================

    async listGlossaryTerms(projectId: string, category?: string): Promise<GlossaryTermData[]> {
      const terms = await prisma.glossaryTerm.findMany({
        where: {
          projectId,
          ...(category ? { category } : {}),
        },
        orderBy: { term: 'asc' },
      });

      return terms;
    },

    async getGlossaryTerm(termId: string): Promise<GlossaryTermData | null> {
      return prisma.glossaryTerm.findUnique({
        where: { id: termId },
      });
    },

    async createGlossaryTerm(projectId: string, input: CreateGlossaryTermInput): Promise<GlossaryTermData> {
      return prisma.glossaryTerm.create({
        data: {
          projectId,
          term: input.term.trim(),
          definition: input.definition,
          aliases: input.aliases || [],
          category: input.category || null,
          useInstead: input.useInstead || null,
          avoidTerms: input.avoidTerms || [],
          isManual: true,
        },
      });
    },

    async updateGlossaryTerm(termId: string, input: UpdateGlossaryTermInput): Promise<GlossaryTermData> {
      const data: Record<string, unknown> = {};

      if (input.term !== undefined) data.term = input.term.trim();
      if (input.definition !== undefined) data.definition = input.definition;
      if (input.aliases !== undefined) data.aliases = input.aliases;
      if (input.category !== undefined) data.category = input.category;
      if (input.useInstead !== undefined) data.useInstead = input.useInstead;
      if (input.avoidTerms !== undefined) data.avoidTerms = input.avoidTerms;

      return prisma.glossaryTerm.update({
        where: { id: termId },
        data,
      });
    },

    async deleteGlossaryTerm(termId: string): Promise<void> {
      await prisma.glossaryTerm.delete({
        where: { id: termId },
      });
    },

    async bulkImportGlossary(projectId: string, terms: CreateGlossaryTermInput[]): Promise<{ imported: number; skipped: number }> {
      let imported = 0;
      let skipped = 0;

      for (const term of terms) {
        try {
          await prisma.glossaryTerm.create({
            data: {
              projectId,
              term: term.term.trim(),
              definition: term.definition,
              aliases: term.aliases || [],
              category: term.category || null,
              useInstead: term.useInstead || null,
              avoidTerms: term.avoidTerms || [],
              isManual: true,
            },
          });
          imported++;
        } catch {
          // Skip duplicates
          skipped++;
        }
      }

      return { imported, skipped };
    },

    // =========================================================================
    // REFERENCE DOCUMENTS
    // =========================================================================

    async listReferenceDocuments(projectId: string): Promise<ReferenceDocumentData[]> {
      return prisma.referenceDocument.findMany({
        where: { projectId },
        orderBy: { uploadedAt: 'desc' },
      });
    },

    async getReferenceDocument(docId: string): Promise<ReferenceDocumentData | null> {
      return prisma.referenceDocument.findUnique({
        where: { id: docId },
      });
    },

    async createReferenceDocument(projectId: string, input: CreateReferenceDocInput): Promise<ReferenceDocumentData> {
      return prisma.referenceDocument.create({
        data: {
          projectId,
          name: input.name,
          fileName: input.fileName,
          filePath: input.filePath,
          fileType: input.fileType,
          fileSize: input.fileSize,
          docType: input.docType || 'other',
          uploadedBy: input.uploadedBy,
        },
      });
    },

    async updateReferenceDocument(docId: string, updates: { name?: string; docType?: DocumentType; isActive?: boolean }): Promise<ReferenceDocumentData> {
      return prisma.referenceDocument.update({
        where: { id: docId },
        data: updates,
      });
    },

    async deleteReferenceDocument(docId: string): Promise<void> {
      await prisma.referenceDocument.delete({
        where: { id: docId },
      });
    },

    async setDocumentExtractedText(docId: string, text: string, summary?: string): Promise<void> {
      await prisma.referenceDocument.update({
        where: { id: docId },
        data: {
          extractedText: text,
          summary: summary || null,
        },
      });
    },

    // =========================================================================
    // TEAM PREFERENCES CONFIG
    // =========================================================================

    async getPreferencesConfig(projectId: string): Promise<TeamPreferencesConfigData | null> {
      const config = await prisma.teamPreferencesConfig.findUnique({
        where: { projectId },
      });

      if (!config) return null;

      return {
        ...config,
        customPrefs: config.customPrefs as unknown[],
      };
    },

    async updatePreferencesConfig(projectId: string, input: UpdatePreferencesConfigInput): Promise<TeamPreferencesConfigData> {
      const config = await prisma.teamPreferencesConfig.upsert({
        where: { projectId },
        create: {
          projectId,
          acFormat: input.acFormat || 'bullets',
          requiredSections: input.requiredSections || [],
          maxAcCount: input.maxAcCount || 8,
          verbosity: input.verbosity || 'balanced',
          technicalDepth: input.technicalDepth || 'moderate',
          customPrefs: (input.customPrefs || []) as unknown as object,
        },
        update: {
          ...(input.acFormat !== undefined && { acFormat: input.acFormat }),
          ...(input.requiredSections !== undefined && { requiredSections: input.requiredSections }),
          ...(input.maxAcCount !== undefined && { maxAcCount: input.maxAcCount }),
          ...(input.verbosity !== undefined && { verbosity: input.verbosity }),
          ...(input.technicalDepth !== undefined && { technicalDepth: input.technicalDepth }),
          ...(input.customPrefs !== undefined && { customPrefs: input.customPrefs as unknown as object }),
        },
      });

      return {
        ...config,
        customPrefs: config.customPrefs as unknown[],
      };
    },

    // =========================================================================
    // CONTEXT BUILDING
    // =========================================================================

    async buildContextForPrompt(projectId: string): Promise<string> {
      const sections: string[] = [];

      // 1. Project Brief
      const knowledge = await prisma.projectKnowledge.findUnique({
        where: { projectId },
      });

      if (knowledge?.brief) {
        sections.push('## Project Context\n');
        sections.push(knowledge.brief);
        sections.push('');
      }

      // 2. Glossary (abbreviated for token budget)
      const glossary = await prisma.glossaryTerm.findMany({
        where: { projectId },
        take: 50, // Limit to most important terms
        orderBy: { term: 'asc' },
      });

      if (glossary.length > 0) {
        sections.push('## Key Terminology\n');
        for (const term of glossary) {
          let line = `- **${term.term}**: ${term.definition}`;
          if (term.useInstead) {
            line += ` (prefer over: ${term.useInstead})`;
          }
          sections.push(line);
        }
        sections.push('');
      }

      // 3. Team Preferences
      const prefConfig = await prisma.teamPreferencesConfig.findUnique({
        where: { projectId },
      });

      if (prefConfig) {
        sections.push('## Team Conventions\n');
        sections.push(`- **AC Format**: ${prefConfig.acFormat}`);
        sections.push(`- **Max AC Count**: ${prefConfig.maxAcCount}`);
        sections.push(`- **Verbosity**: ${prefConfig.verbosity}`);
        sections.push(`- **Technical Depth**: ${prefConfig.technicalDepth}`);

        if (prefConfig.requiredSections.length > 0) {
          sections.push(`- **Required Sections**: ${prefConfig.requiredSections.join(', ')}`);
        }
        sections.push('');
      }

      // 4. Active team preferences (learned patterns)
      const teamPrefs = await prisma.teamPreference.findMany({
        where: { projectId, active: true },
        take: 10,
      });

      if (teamPrefs.length > 0) {
        sections.push('## Team Preferences\n');
        for (const pref of teamPrefs) {
          sections.push(`- ${pref.preference}`);
        }
        sections.push('');
      }

      return sections.join('\n').trim();
    },
  };
}

// Singleton instance
let _knowledgeService: KnowledgeService | null = null;

export function getKnowledgeService(): KnowledgeService {
  if (!_knowledgeService) {
    _knowledgeService = createKnowledgeService();
  }
  return _knowledgeService;
}
