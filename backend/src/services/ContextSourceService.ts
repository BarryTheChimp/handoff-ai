import { prisma } from '../lib/prisma.js';
import type { ContextSourceType, ContextSource, ContextChunk } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface ContextSourceData {
  id: string;
  projectId: string;
  sourceType: ContextSourceType;
  name: string;
  isEnabled: boolean;
  config: Record<string, unknown>;
  lastSyncAt: Date | null;
  lastError: string | null;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContextChunkData {
  id: string;
  projectId: string;
  sourceType: ContextSourceType;
  sourceId: string;
  content: string;
  summary: string | null;
  metadata: Record<string, unknown>;
  heading: string | null;
  keywords: string[];
  createdAt: Date;
}

export interface CreateContextSourceInput {
  sourceType: ContextSourceType;
  name: string;
  config?: Record<string, unknown>;
  isEnabled?: boolean;
}

export interface SearchResult {
  sourceType: ContextSourceType;
  sourceId: string;
  sourceName: string;
  content: string;
  heading?: string;
  relevance: number;
}

// =============================================================================
// SERVICE INTERFACE
// =============================================================================

export interface ContextSourceService {
  // Context Sources CRUD
  listSources(projectId: string): Promise<ContextSourceData[]>;
  getSource(sourceId: string): Promise<ContextSourceData | null>;
  createSource(projectId: string, input: CreateContextSourceInput): Promise<ContextSourceData>;
  updateSource(sourceId: string, updates: Partial<CreateContextSourceInput>): Promise<ContextSourceData>;
  deleteSource(sourceId: string): Promise<void>;
  toggleSource(sourceId: string, isEnabled: boolean): Promise<ContextSourceData>;

  // Context Chunks
  addChunk(projectId: string, chunk: Omit<ContextChunkData, 'id' | 'createdAt'>): Promise<ContextChunkData>;
  addChunks(projectId: string, chunks: Omit<ContextChunkData, 'id' | 'createdAt'>[]): Promise<number>;
  getChunksBySource(sourceId: string, sourceType: ContextSourceType): Promise<ContextChunkData[]>;
  deleteChunksBySource(sourceId: string, sourceType: ContextSourceType): Promise<number>;

  // Search
  searchContext(projectId: string, query: string, options?: {
    sourceTypes?: ContextSourceType[];
    limit?: number;
  }): Promise<SearchResult[]>;

  // Sync
  syncSpecsSource(projectId: string): Promise<{ synced: number }>;
  syncDocumentsSource(projectId: string): Promise<{ synced: number }>;
  updateSourceSyncStatus(sourceId: string, status: { itemCount: number; error?: string }): Promise<void>;

  // Initialization
  ensureDefaultSources(projectId: string): Promise<void>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function extractKeywords(text: string): string[] {
  // Simple keyword extraction - extract significant words
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3);

  // Count frequency
  const freq: Record<string, number> = {};
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1;
  }

  // Sort by frequency and take top 20
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

function transformSource(source: ContextSource): ContextSourceData {
  return {
    ...source,
    config: source.config as Record<string, unknown>,
  };
}

function transformChunk(chunk: ContextChunk): ContextChunkData {
  return {
    ...chunk,
    metadata: chunk.metadata as Record<string, unknown>,
  };
}

// =============================================================================
// IMPLEMENTATION
// =============================================================================

export function createContextSourceService(): ContextSourceService {
  return {
    // =========================================================================
    // CONTEXT SOURCES CRUD
    // =========================================================================

    async listSources(projectId: string): Promise<ContextSourceData[]> {
      const sources = await prisma.contextSource.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
      });
      return sources.map(transformSource);
    },

    async getSource(sourceId: string): Promise<ContextSourceData | null> {
      const source = await prisma.contextSource.findUnique({
        where: { id: sourceId },
      });
      return source ? transformSource(source) : null;
    },

    async createSource(projectId: string, input: CreateContextSourceInput): Promise<ContextSourceData> {
      const source = await prisma.contextSource.create({
        data: {
          projectId,
          sourceType: input.sourceType,
          name: input.name,
          config: (input.config || {}) as object,
          isEnabled: input.isEnabled ?? true,
        },
      });
      return transformSource(source);
    },

    async updateSource(sourceId: string, updates: Partial<CreateContextSourceInput>): Promise<ContextSourceData> {
      const data: Record<string, unknown> = {};
      if (updates.name !== undefined) data.name = updates.name;
      if (updates.config !== undefined) data.config = updates.config;
      if (updates.isEnabled !== undefined) data.isEnabled = updates.isEnabled;

      const source = await prisma.contextSource.update({
        where: { id: sourceId },
        data,
      });
      return transformSource(source);
    },

    async deleteSource(sourceId: string): Promise<void> {
      // Get source to find type and project
      const source = await prisma.contextSource.findUnique({
        where: { id: sourceId },
      });

      if (source) {
        // Delete related chunks
        await prisma.contextChunk.deleteMany({
          where: {
            projectId: source.projectId,
            sourceType: source.sourceType,
          },
        });
      }

      await prisma.contextSource.delete({
        where: { id: sourceId },
      });
    },

    async toggleSource(sourceId: string, isEnabled: boolean): Promise<ContextSourceData> {
      const source = await prisma.contextSource.update({
        where: { id: sourceId },
        data: { isEnabled },
      });
      return transformSource(source);
    },

    // =========================================================================
    // CONTEXT CHUNKS
    // =========================================================================

    async addChunk(projectId: string, chunk: Omit<ContextChunkData, 'id' | 'createdAt'>): Promise<ContextChunkData> {
      const created = await prisma.contextChunk.create({
        data: {
          projectId,
          sourceType: chunk.sourceType,
          sourceId: chunk.sourceId,
          content: chunk.content,
          summary: chunk.summary,
          metadata: chunk.metadata as object,
          heading: chunk.heading,
          keywords: chunk.keywords.length > 0 ? chunk.keywords : extractKeywords(chunk.content),
        },
      });
      return transformChunk(created);
    },

    async addChunks(projectId: string, chunks: Omit<ContextChunkData, 'id' | 'createdAt'>[]): Promise<number> {
      const result = await prisma.contextChunk.createMany({
        data: chunks.map(chunk => ({
          projectId,
          sourceType: chunk.sourceType,
          sourceId: chunk.sourceId,
          content: chunk.content,
          summary: chunk.summary,
          metadata: chunk.metadata as object,
          heading: chunk.heading,
          keywords: chunk.keywords.length > 0 ? chunk.keywords : extractKeywords(chunk.content),
        })),
      });
      return result.count;
    },

    async getChunksBySource(sourceId: string, sourceType: ContextSourceType): Promise<ContextChunkData[]> {
      const chunks = await prisma.contextChunk.findMany({
        where: { sourceId, sourceType },
        orderBy: { createdAt: 'asc' },
      });
      return chunks.map(transformChunk);
    },

    async deleteChunksBySource(sourceId: string, sourceType: ContextSourceType): Promise<number> {
      const result = await prisma.contextChunk.deleteMany({
        where: { sourceId, sourceType },
      });
      return result.count;
    },

    // =========================================================================
    // SEARCH
    // =========================================================================

    async searchContext(projectId: string, query: string, options?: {
      sourceTypes?: ContextSourceType[];
      limit?: number;
    }): Promise<SearchResult[]> {
      const limit = options?.limit || 10;
      const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);

      // Build where clause
      const where: Record<string, unknown> = {
        projectId,
      };

      if (options?.sourceTypes && options.sourceTypes.length > 0) {
        where.sourceType = { in: options.sourceTypes };
      }

      // Simple keyword search for now (future: vector similarity)
      const chunks = await prisma.contextChunk.findMany({
        where: {
          ...where,
          OR: [
            { content: { contains: query, mode: 'insensitive' } },
            { keywords: { hasSome: queryWords } },
            { heading: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit * 2, // Get more to sort by relevance
      });

      // Calculate relevance score
      const results: SearchResult[] = chunks.map(chunk => {
        let relevance = 0;

        // Exact phrase match
        if (chunk.content.toLowerCase().includes(query.toLowerCase())) {
          relevance += 0.5;
        }

        // Keyword matches
        const chunkKeywords = new Set(chunk.keywords.map(k => k.toLowerCase()));
        for (const word of queryWords) {
          if (chunkKeywords.has(word)) {
            relevance += 0.1;
          }
        }

        // Heading match
        if (chunk.heading && chunk.heading.toLowerCase().includes(query.toLowerCase())) {
          relevance += 0.3;
        }

        return {
          sourceType: chunk.sourceType,
          sourceId: chunk.sourceId,
          sourceName: (chunk.metadata as Record<string, unknown>).sourceName as string || chunk.sourceId,
          content: chunk.content.slice(0, 500), // Truncate for response
          heading: chunk.heading || undefined,
          relevance: Math.min(relevance, 1),
        };
      });

      // Sort by relevance and limit
      return results
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, limit);
    },

    // =========================================================================
    // SYNC
    // =========================================================================

    async syncSpecsSource(projectId: string): Promise<{ synced: number }> {
      // Get all translated specs in the project
      const specs = await prisma.spec.findMany({
        where: { projectId, status: 'translated' },
        include: {
          workItems: {
            where: { type: { in: ['epic', 'feature'] } },
            take: 20,
          },
        },
      });

      // Delete existing spec chunks
      await prisma.contextChunk.deleteMany({
        where: { projectId, sourceType: 'specs' },
      });

      // Create new chunks for each spec
      let synced = 0;
      for (const spec of specs) {
        // Generate summary from work items
        const summary = spec.workItems
          .map(w => `${w.type}: ${w.title}`)
          .join('\n');

        await prisma.contextChunk.create({
          data: {
            projectId,
            sourceType: 'specs',
            sourceId: spec.id,
            content: summary,
            summary: `Spec: ${spec.name}`,
            metadata: {
              specName: spec.name,
              sourceName: spec.name,
              workItemCount: spec.workItems.length,
            },
            heading: spec.name,
            keywords: extractKeywords(spec.name + ' ' + summary),
          },
        });
        synced++;
      }

      // Update source status
      await prisma.contextSource.updateMany({
        where: { projectId, sourceType: 'specs' },
        data: { itemCount: synced, lastSyncAt: new Date(), lastError: null },
      });

      return { synced };
    },

    async syncDocumentsSource(projectId: string): Promise<{ synced: number }> {
      // Get all active reference documents
      const docs = await prisma.referenceDocument.findMany({
        where: { projectId, isActive: true },
      });

      // Delete existing document chunks
      await prisma.contextChunk.deleteMany({
        where: { projectId, sourceType: 'document' },
      });

      // Create chunks for each document
      let synced = 0;
      for (const doc of docs) {
        if (doc.extractedText) {
          // Chunk the text (simple chunking by paragraphs)
          const paragraphs = doc.extractedText.split(/\n\n+/).filter(p => p.trim().length > 50);
          const chunks = paragraphs.slice(0, 10); // Limit to first 10 paragraphs

          for (let i = 0; i < chunks.length; i++) {
            await prisma.contextChunk.create({
              data: {
                projectId,
                sourceType: 'document',
                sourceId: doc.id,
                content: chunks[i],
                summary: doc.summary,
                metadata: {
                  documentName: doc.name,
                  sourceName: doc.name,
                  chunkIndex: i,
                  docType: doc.docType,
                },
                heading: doc.name,
                keywords: extractKeywords(chunks[i]),
              },
            });
          }
          synced++;
        }
      }

      // Update source status
      await prisma.contextSource.updateMany({
        where: { projectId, sourceType: 'document' },
        data: { itemCount: synced, lastSyncAt: new Date(), lastError: null },
      });

      return { synced };
    },

    async updateSourceSyncStatus(sourceId: string, status: { itemCount: number; error?: string }): Promise<void> {
      await prisma.contextSource.update({
        where: { id: sourceId },
        data: {
          itemCount: status.itemCount,
          lastSyncAt: new Date(),
          lastError: status.error || null,
        },
      });
    },

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    async ensureDefaultSources(projectId: string): Promise<void> {
      // Check if specs source exists
      const specsSource = await prisma.contextSource.findFirst({
        where: { projectId, sourceType: 'specs' },
      });

      if (!specsSource) {
        await prisma.contextSource.create({
          data: {
            projectId,
            sourceType: 'specs',
            name: 'Translated Specifications',
            isEnabled: true,
            config: {},
          },
        });
      }

      // Check if documents source exists
      const docsSource = await prisma.contextSource.findFirst({
        where: { projectId, sourceType: 'document' },
      });

      if (!docsSource) {
        await prisma.contextSource.create({
          data: {
            projectId,
            sourceType: 'document',
            name: 'Reference Documents',
            isEnabled: true,
            config: {},
          },
        });
      }
    },
  };
}

// Singleton instance
let _contextSourceService: ContextSourceService | null = null;

export function getContextSourceService(): ContextSourceService {
  if (!_contextSourceService) {
    _contextSourceService = createContextSourceService();
  }
  return _contextSourceService;
}
