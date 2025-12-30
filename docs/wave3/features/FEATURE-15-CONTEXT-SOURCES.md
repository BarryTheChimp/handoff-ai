# Feature 15: Context Sources

## Overview

**What:** Connect multiple sources of context beyond the manual knowledge base: previously translated specs, Jira tickets (existing work), and uploaded files. Create a pluggable connector architecture.

**Why:** The richest context isn't what users type manually - it's what already exists. Translated specs define entities. Jira tickets show what's been built. Architecture docs explain the system. The AI should use all of this.

**Success Criteria:**
- Context can be pulled from translated specs in the same project
- Context can be pulled from Jira (if connected)
- Uploaded documents are chunked and searchable
- New connector types can be added easily (future: Confluence, GitHub)

## Context Source Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CONTEXT SOURCE REGISTRY                         │
│                                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │   SPECS     │ │   JIRA      │ │  DOCUMENTS  │ │   FUTURE    │   │
│  │  Connector  │ │  Connector  │ │  Connector  │ │  Connectors │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
│        │               │               │               │            │
│        └───────────────┼───────────────┼───────────────┘            │
│                        ▼                                            │
│              ┌─────────────────────┐                               │
│              │  ContextSourceAPI   │                               │
│              │  • search(query)    │                               │
│              │  • getChunks(ids)   │                               │
│              │  • getSummary()     │                               │
│              └─────────────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
```

## Context Source Types

### 1. Translated Specs (Built-in)

**Source:** Previously translated specs in the same project
**Content:** Spec summaries, entity definitions, story patterns

```typescript
interface SpecContextSource {
  type: 'spec';
  specId: string;
  specName: string;
  summary: string;  // AI-generated during translation
  entities: string[];  // Entities defined in this spec
  storyCount: number;
  lastUpdated: Date;
}
```

**When to use:**
- When current spec references entities from another spec
- When detecting duplicate stories
- When maintaining consistency across specs

### 2. Jira Connector

**Source:** Existing Jira project (if connected)
**Content:** Completed tickets, sprint history, existing stories

```typescript
interface JiraContextSource {
  type: 'jira';
  projectKey: string;
  ticketId: string;
  summary: string;
  description: string;
  status: string;
  labels: string[];
  lastUpdated: Date;
}
```

**When to use:**
- When translating spec for existing project (avoid duplicates)
- When learning terminology from existing tickets
- When understanding what's already built

### 3. Document Connector

**Source:** Uploaded reference documents (PDF, DOCX, MD)
**Content:** Chunked text with headings, searchable

```typescript
interface DocumentContextSource {
  type: 'document';
  documentId: string;
  documentName: string;
  chunkId: string;
  content: string;
  heading?: string;
  pageNumber?: number;
}
```

**When to use:**
- When spec references architecture patterns
- When spec references existing technical docs
- When understanding system context

## Database Schema

```prisma
/// ContextSource - Registered context sources for a project
model ContextSource {
  id          String   @id @default(uuid())
  projectId   String   @map("project_id")
  
  // Source type and connection
  sourceType  ContextSourceType @map("source_type")
  name        String
  isEnabled   Boolean  @default(true) @map("is_enabled")
  
  // Connection details (JSON varies by type)
  config      Json     @default("{}")
  
  // Status
  lastSyncAt  DateTime? @map("last_sync_at")
  lastError   String?  @map("last_error")
  itemCount   Int      @default(0) @map("item_count")
  
  // Timestamps
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  // Relations
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@index([projectId])
  @@map("context_sources")
}

enum ContextSourceType {
  specs       // Other specs in project (automatic)
  jira        // Jira project
  document    // Uploaded documents
  confluence  // Future
  github      // Future
}

/// ContextChunk - Searchable chunks from context sources
model ContextChunk {
  id          String   @id @default(uuid())
  projectId   String   @map("project_id")
  sourceType  ContextSourceType @map("source_type")
  sourceId    String   @map("source_id")  // ID of spec, doc, or jira ticket
  
  // Content
  content     String   @db.Text
  summary     String?  @db.Text
  metadata    Json     @default("{}")  // Type-specific metadata
  
  // For retrieval
  heading     String?
  keywords    String[] @default([])
  
  // Timestamps
  createdAt   DateTime @default(now()) @map("created_at")
  
  // Relations
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@index([projectId])
  @@index([sourceType])
  @@index([sourceId])
  @@map("context_chunks")
}
```

## Spec Context Extraction

When a spec is translated, automatically extract context:

```typescript
// backend/src/services/SpecContextExtractor.ts

interface SpecContext {
  summary: string;
  entities: ExtractedEntity[];
  patterns: string[];
  keywords: string[];
}

export async function extractSpecContext(
  specId: string,
  workItems: WorkItem[]
): Promise<SpecContext> {
  // Generate summary from work items
  const summary = await generateSpecSummary(workItems);
  
  // Extract entities mentioned
  const entities = extractEntities(workItems);
  
  // Extract patterns (e.g., "all API endpoints follow REST conventions")
  const patterns = extractPatterns(workItems);
  
  // Extract keywords for search
  const keywords = extractKeywords(workItems);
  
  // Store as context chunks
  await prisma.contextChunk.create({
    data: {
      projectId: spec.projectId,
      sourceType: 'specs',
      sourceId: specId,
      content: summary,
      summary,
      metadata: { entities, patterns },
      keywords,
    },
  });
  
  return { summary, entities, patterns, keywords };
}

async function generateSpecSummary(workItems: WorkItem[]): Promise<string> {
  const prompt = `
Summarize this specification in 2-3 sentences for use as context in future translations.
Focus on: what entities it defines, what functionality it covers, key technical details.

Work items:
${workItems.map(w => `- ${w.title}: ${w.description}`).join('\n')}

Summary:`;

  const response = await llm.complete(prompt);
  return response.text;
}
```

## Jira Connector Implementation

```typescript
// backend/src/services/connectors/JiraConnector.ts

import { JiraClient } from '../integrations/jira';

export class JiraConnector {
  private client: JiraClient;
  private projectKey: string;

  constructor(config: { baseUrl: string; apiToken: string; projectKey: string }) {
    this.client = new JiraClient(config.baseUrl, config.apiToken);
    this.projectKey = config.projectKey;
  }

  async sync(projectId: string): Promise<number> {
    // Fetch recent tickets
    const tickets = await this.client.search({
      jql: `project = ${this.projectKey} AND updated >= -30d`,
      fields: ['summary', 'description', 'status', 'labels'],
      maxResults: 100,
    });

    // Create context chunks
    let count = 0;
    for (const ticket of tickets.issues) {
      await prisma.contextChunk.upsert({
        where: {
          projectId_sourceType_sourceId: {
            projectId,
            sourceType: 'jira',
            sourceId: ticket.key,
          },
        },
        create: {
          projectId,
          sourceType: 'jira',
          sourceId: ticket.key,
          content: `${ticket.fields.summary}\n\n${ticket.fields.description || ''}`,
          summary: ticket.fields.summary,
          metadata: {
            status: ticket.fields.status.name,
            labels: ticket.fields.labels,
          },
          keywords: extractKeywords(ticket.fields.summary + ' ' + ticket.fields.description),
        },
        update: {
          content: `${ticket.fields.summary}\n\n${ticket.fields.description || ''}`,
          metadata: {
            status: ticket.fields.status.name,
            labels: ticket.fields.labels,
          },
        },
      });
      count++;
    }

    return count;
  }

  async search(query: string, limit: number = 5): Promise<ContextChunk[]> {
    // Simple keyword search for now
    // Future: vector similarity search
    return prisma.contextChunk.findMany({
      where: {
        sourceType: 'jira',
        OR: [
          { content: { contains: query, mode: 'insensitive' } },
          { keywords: { hasSome: query.toLowerCase().split(' ') } },
        ],
      },
      take: limit,
    });
  }
}
```

## Document Processing

When a document is uploaded, chunk and index it:

```typescript
// backend/src/services/DocumentProcessor.ts

import { PDFExtractor } from './extractors/pdf';
import { DocxExtractor } from './extractors/docx';

const CHUNK_SIZE = 500; // tokens
const CHUNK_OVERLAP = 50; // tokens

export async function processDocument(
  document: ReferenceDocument
): Promise<void> {
  // Extract text based on file type
  let text: string;
  let sections: { heading?: string; content: string }[] = [];
  
  if (document.fileType === 'application/pdf') {
    const result = await PDFExtractor.extract(document.filePath);
    text = result.text;
    sections = result.sections;
  } else if (document.fileType.includes('word')) {
    const result = await DocxExtractor.extract(document.filePath);
    text = result.text;
    sections = result.sections;
  } else {
    // Plain text
    text = await fs.readFile(document.filePath, 'utf-8');
    sections = [{ content: text }];
  }

  // Update document with extracted text
  await prisma.referenceDocument.update({
    where: { id: document.id },
    data: { extractedText: text },
  });

  // Chunk and create context chunks
  const chunks = chunkDocument(sections, CHUNK_SIZE, CHUNK_OVERLAP);
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    // Generate summary for chunk (optional, costs API)
    // const summary = await generateChunkSummary(chunk.content);
    
    await prisma.contextChunk.create({
      data: {
        projectId: document.projectId,
        sourceType: 'document',
        sourceId: document.id,
        content: chunk.content,
        heading: chunk.heading,
        metadata: {
          chunkIndex: i,
          documentName: document.name,
        },
        keywords: extractKeywords(chunk.content),
      },
    });
  }
}

function chunkDocument(
  sections: { heading?: string; content: string }[],
  chunkSize: number,
  overlap: number
): { heading?: string; content: string }[] {
  const chunks: { heading?: string; content: string }[] = [];
  
  for (const section of sections) {
    const words = section.content.split(/\s+/);
    
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunkWords = words.slice(i, i + chunkSize);
      chunks.push({
        heading: section.heading,
        content: chunkWords.join(' '),
      });
    }
  }
  
  return chunks;
}
```

## API Endpoints

### GET /api/projects/:id/context-sources
List configured context sources.

```json
{
  "data": [
    {
      "id": "uuid",
      "sourceType": "specs",
      "name": "Translated Specifications",
      "isEnabled": true,
      "itemCount": 7,
      "lastSyncAt": "2024-01-20T10:00:00Z"
    },
    {
      "id": "uuid",
      "sourceType": "jira",
      "name": "Moorfields OpenEyes (MOE)",
      "isEnabled": true,
      "itemCount": 145,
      "lastSyncAt": "2024-01-20T09:30:00Z",
      "config": { "projectKey": "MOE" }
    }
  ]
}
```

### POST /api/projects/:id/context-sources
Add new context source.

```json
{
  "sourceType": "jira",
  "name": "Moorfields OpenEyes",
  "config": {
    "projectKey": "MOE",
    "baseUrl": "https://toucanlabs.atlassian.net"
  }
}
```

### POST /api/projects/:id/context-sources/:sourceId/sync
Trigger sync for a context source.

### GET /api/projects/:id/context-search
Search across all context sources.

```json
// Request
GET /api/projects/123/context-search?q=patient+allergy&sources=specs,jira&limit=10

// Response
{
  "data": [
    {
      "sourceType": "specs",
      "sourceId": "spec-uuid",
      "sourceName": "Allergy Management",
      "content": "The Allergy Management API handles...",
      "relevance": 0.92
    },
    {
      "sourceType": "jira",
      "sourceId": "MOE-145",
      "sourceName": "MOE-145: Implement allergy sync",
      "content": "As a clinician, I want allergies...",
      "relevance": 0.85
    }
  ]
}
```

## Frontend: Context Sources Manager

**File:** `frontend/src/components/organisms/ContextSourcesManager.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

interface ContextSource {
  id: string;
  sourceType: 'specs' | 'jira' | 'document';
  name: string;
  isEnabled: boolean;
  itemCount: number;
  lastSyncAt?: string;
  lastError?: string;
}

export function ContextSourcesManager({ projectId }: { projectId: string }) {
  const [sources, setSources] = useState<ContextSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSources();
  }, [projectId]);

  async function loadSources() {
    const response = await api.get(`/projects/${projectId}/context-sources`);
    setSources(response.data.data);
    setLoading(false);
  }

  async function syncSource(sourceId: string) {
    await api.post(`/projects/${projectId}/context-sources/${sourceId}/sync`);
    loadSources();
  }

  async function toggleSource(sourceId: string, enabled: boolean) {
    await api.put(`/projects/${projectId}/context-sources/${sourceId}`, { isEnabled: enabled });
    loadSources();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-toucan-grey-100">Context Sources</h2>
        <p className="text-sm text-toucan-grey-400 mt-1">
          Connect additional sources of context for smarter translations
        </p>
      </div>

      <div className="space-y-4">
        {sources.map((source) => (
          <ContextSourceCard
            key={source.id}
            source={source}
            onSync={() => syncSource(source.id)}
            onToggle={(enabled) => toggleSource(source.id, enabled)}
          />
        ))}
      </div>

      {/* Add Source Button */}
      <button className="btn btn-secondary w-full">
        + Connect New Source
      </button>
    </div>
  );
}

function ContextSourceCard({ source, onSync, onToggle }: {
  source: ContextSource;
  onSync: () => void;
  onToggle: (enabled: boolean) => void;
}) {
  const icons = {
    specs: '📋',
    jira: '🎫',
    document: '📄',
  };

  return (
    <div className="bg-toucan-dark-card border border-toucan-dark-border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icons[source.sourceType]}</span>
          <div>
            <h3 className="font-medium text-toucan-grey-100">{source.name}</h3>
            <p className="text-xs text-toucan-grey-500">
              {source.itemCount} items • Last sync: {source.lastSyncAt 
                ? new Date(source.lastSyncAt).toLocaleString() 
                : 'Never'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {source.sourceType !== 'specs' && (
            <button onClick={onSync} className="text-sm text-toucan-orange hover:underline">
              Sync Now
            </button>
          )}
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={source.isEnabled}
              onChange={(e) => onToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-toucan-dark-lighter rounded-full peer 
                          peer-checked:bg-toucan-orange/30 
                          peer-checked:after:translate-x-full after:content-[''] 
                          after:absolute after:top-0.5 after:left-[2px] 
                          after:bg-white after:rounded-full after:h-5 after:w-5 
                          after:transition-all peer-checked:after:bg-toucan-orange" />
          </label>
        </div>
      </div>

      {source.lastError && (
        <div className="mt-3 text-xs text-red-400 bg-red-500/10 rounded px-3 py-2">
          Error: {source.lastError}
        </div>
      )}
    </div>
  );
}
```

## Add to Project Settings

Add "Context Sources" tab to ProjectSettingsPage:

```typescript
const tabs = [
  // ... existing tabs
  { key: 'sources', label: 'Context Sources' },
];

// In render:
{activeTab === 'sources' && <ContextSourcesManager projectId={projectId!} />}
```

## Testing Checklist

- [ ] Translate spec → context chunks created automatically
- [ ] Context sources page shows specs source
- [ ] Upload document → chunks created
- [ ] Connect Jira → syncs tickets
- [ ] Toggle source enabled/disabled → works
- [ ] Sync source → updates item count
- [ ] Search context → returns results from multiple sources
- [ ] Delete spec → related chunks deleted

## Files to Create

```
backend/src/
├── services/
│   ├── SpecContextExtractor.ts
│   ├── DocumentProcessor.ts
│   └── connectors/
│       └── JiraConnector.ts
└── routes/
    └── context-sources.ts

frontend/src/components/organisms/
└── ContextSourcesManager.tsx
```

## Dependencies

- Feature 14 (Knowledge Base) - ReferenceDocument model
- Existing Jira integration (if present)

## Effort Estimate

**6 hours**
- Database schema: 30 min
- SpecContextExtractor: 1 hour
- DocumentProcessor: 1.5 hours
- JiraConnector: 1 hour
- API routes: 45 min
- ContextSourcesManager UI: 45 min
- Testing: 30 min
