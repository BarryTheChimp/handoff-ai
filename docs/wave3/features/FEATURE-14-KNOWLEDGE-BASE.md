# Feature 14: Knowledge Base

## Overview

**What:** A structured knowledge store for project context - brief, glossary, reference documents, and team preferences. This is the foundation that all context-aware features build upon.

**Why:** AI translations are only as good as the context they have. A spec translated in isolation produces generic output. A spec translated with domain knowledge, terminology, and conventions produces professional, accurate stories.

**Success Criteria:**
- Users can write and edit a project brief
- Users can manage a glossary of domain terms
- Users can upload reference documents
- Users can configure team preferences (AC format, etc.)
- All stored per-project, persisted in database

## The Knowledge Base Structure

```
PROJECT KNOWLEDGE BASE
├── Brief (free text)
│   ├── System overview
│   ├── Integration points
│   └── Key stakeholders
│
├── Glossary (structured)
│   ├── Term → Definition
│   ├── Aliases
│   └── Categories
│
├── Reference Documents (files)
│   ├── Architecture diagrams
│   ├── Technical specs
│   └── Process docs
│
└── Team Preferences (structured)
    ├── AC format (Gherkin/bullets/checklist)
    ├── Detail level
    ├── Required sections
    └── Writing style
```

## Database Schema

```prisma
// ============================================================================
// KNOWLEDGE BASE MODELS
// ============================================================================

/// ProjectKnowledge - Core project context
model ProjectKnowledge {
  id          String   @id @default(uuid())
  projectId   String   @unique @map("project_id")
  
  // Project Brief (markdown)
  brief       String?  @db.Text
  briefUpdatedAt DateTime? @map("brief_updated_at")
  
  // Timestamps
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  // Relations
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@map("project_knowledge")
}

/// GlossaryTerm - Domain terminology
model GlossaryTerm {
  id          String   @id @default(uuid())
  projectId   String   @map("project_id")
  
  // Term details
  term        String
  definition  String   @db.Text
  aliases     String[] @default([])
  category    String?
  
  // Usage hints for AI
  useInstead  String?  @map("use_instead")  // "Use 'MRN' not 'patient ID'"
  avoidTerms  String[] @default([]) @map("avoid_terms")
  
  // Source tracking (for auto-extracted terms)
  isManual    Boolean  @default(true) @map("is_manual")
  sourceSpecId String? @map("source_spec_id")
  confidence  Float?   // For auto-extracted terms
  
  // Timestamps
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  // Relations
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@unique([projectId, term])
  @@index([projectId])
  @@index([category])
  @@map("glossary_terms")
}

/// ReferenceDocument - Uploaded context documents
model ReferenceDocument {
  id          String   @id @default(uuid())
  projectId   String   @map("project_id")
  
  // File info
  name        String
  fileName    String   @map("file_name")
  filePath    String   @map("file_path")
  fileType    String   @map("file_type")
  fileSize    Int      @map("file_size")
  
  // Extracted content
  extractedText String? @db.Text @map("extracted_text")
  summary     String?  @db.Text
  
  // Metadata
  docType     DocumentType @default(other) @map("doc_type")
  isActive    Boolean  @default(true) @map("is_active")
  
  // Timestamps
  uploadedAt  DateTime @default(now()) @map("uploaded_at")
  uploadedBy  String   @map("uploaded_by")
  
  // Relations
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  chunks      DocumentChunk[]
  
  @@index([projectId])
  @@map("reference_documents")
}

enum DocumentType {
  architecture  // System diagrams, ERDs
  process       // Workflow docs, runbooks
  technical     // API docs, schemas
  business      // Requirements, PRDs
  other
}

/// DocumentChunk - Chunked content for retrieval
model DocumentChunk {
  id          String   @id @default(uuid())
  documentId  String   @map("document_id")
  
  // Chunk content
  content     String   @db.Text
  chunkIndex  Int      @map("chunk_index")
  
  // Metadata for retrieval
  heading     String?  // Section heading if available
  summary     String?  // AI-generated summary of chunk
  
  // Relations
  document    ReferenceDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  @@index([documentId])
  @@map("document_chunks")
}

/// TeamPreferences - Team conventions for AI
model TeamPreferences {
  id          String   @id @default(uuid())
  projectId   String   @unique @map("project_id")
  
  // Story Structure
  acFormat    ACFormat @default(bullets) @map("ac_format")
  requiredSections String[] @default([]) @map("required_sections")
  maxAcCount  Int      @default(8) @map("max_ac_count")
  
  // Content Style
  verbosity   Verbosity @default(balanced)
  technicalDepth TechnicalDepth @default(moderate) @map("technical_depth")
  
  // Custom preferences (freeform, learned)
  customPrefs Json     @default("[]") @map("custom_prefs")
  
  // Timestamps
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  // Relations
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@map("team_preferences")
}

enum ACFormat {
  gherkin    // Given/When/Then
  bullets    // Bullet points
  checklist  // Checkbox style
  numbered   // Numbered list
}

enum Verbosity {
  concise
  balanced
  detailed
}

enum TechnicalDepth {
  high_level   // Business-focused
  moderate     // Balanced
  implementation // Dev-ready detail
}

// Add relations to Project model
model Project {
  // ... existing fields ...
  
  knowledge       ProjectKnowledge?
  glossary        GlossaryTerm[]
  referenceDocuments ReferenceDocument[]
  teamPreferences TeamPreferences?
}
```

## API Specification

### Brief

#### GET /api/projects/:id/knowledge
Get project knowledge (brief).

```json
{
  "data": {
    "brief": "## System Overview\n\nOpenEyes is an open source...",
    "briefUpdatedAt": "2024-01-20T10:00:00Z"
  }
}
```

#### PUT /api/projects/:id/knowledge
Update project brief.

```json
// Request
{ "brief": "## System Overview\n\n..." }

// Response
{ "data": { "brief": "...", "briefUpdatedAt": "..." } }
```

### Glossary

#### GET /api/projects/:id/glossary
List all glossary terms.

```json
{
  "data": [
    {
      "id": "uuid",
      "term": "MRN",
      "definition": "Medical Record Number - unique patient identifier",
      "aliases": ["medical record number", "patient id"],
      "category": "Identifiers",
      "useInstead": "Use 'MRN' consistently, not 'patient ID'",
      "isManual": true
    }
  ],
  "summary": {
    "total": 25,
    "byCategory": {
      "Identifiers": 5,
      "Systems": 8,
      "HL7": 12
    }
  }
}
```

#### POST /api/projects/:id/glossary
Add term.

```json
{
  "term": "MRN",
  "definition": "Medical Record Number",
  "aliases": ["medical record number"],
  "category": "Identifiers",
  "useInstead": "Use 'MRN' not 'patient ID'"
}
```

#### PUT /api/projects/:id/glossary/:termId
Update term.

#### DELETE /api/projects/:id/glossary/:termId
Delete term.

#### POST /api/projects/:id/glossary/import
Import from CSV.

```
term,definition,category,aliases
MRN,Medical Record Number,Identifiers,"medical record number,patient id"
HL7,Health Level 7 messaging standard,Standards,
```

### Reference Documents

#### GET /api/projects/:id/documents
List reference documents.

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "OpenEyes Architecture",
      "fileName": "openeyes-architecture.pdf",
      "fileType": "application/pdf",
      "fileSize": 245000,
      "docType": "architecture",
      "summary": "Overview of OpenEyes system components...",
      "isActive": true,
      "uploadedAt": "2024-01-15T09:00:00Z"
    }
  ]
}
```

#### POST /api/projects/:id/documents
Upload document (multipart/form-data).

#### DELETE /api/projects/:id/documents/:docId
Delete document.

### Team Preferences

#### GET /api/projects/:id/preferences
Get team preferences.

```json
{
  "data": {
    "acFormat": "gherkin",
    "requiredSections": ["technicalNotes", "securityConsiderations"],
    "maxAcCount": 8,
    "verbosity": "balanced",
    "technicalDepth": "moderate",
    "customPrefs": [
      "Always include error handling scenarios",
      "Reference NHS Digital standards where applicable"
    ]
  }
}
```

#### PUT /api/projects/:id/preferences
Update preferences.

## Frontend Components

### ProjectSettingsPage

**File:** `frontend/src/pages/ProjectSettingsPage.tsx`

```typescript
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageLayout } from '../components/templates/PageLayout';
import { ProjectBriefEditor } from '../components/organisms/ProjectBriefEditor';
import { GlossaryManager } from '../components/organisms/GlossaryManager';
import { DocumentManager } from '../components/organisms/DocumentManager';
import { PreferencesEditor } from '../components/organisms/PreferencesEditor';

type SettingsTab = 'general' | 'brief' | 'glossary' | 'documents' | 'preferences';

export function ProjectSettingsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<SettingsTab>('brief');

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'general', label: 'General' },
    { key: 'brief', label: 'Project Brief' },
    { key: 'glossary', label: 'Glossary' },
    { key: 'documents', label: 'Reference Docs' },
    { key: 'preferences', label: 'Preferences' },
  ];

  return (
    <PageLayout
      title="Project Settings"
      breadcrumbs={[
        { label: 'Project Name', path: '/' },
        { label: 'Settings' },
      ]}
    >
      <div className="flex gap-8">
        {/* Sidebar Tabs */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                  activeTab === tab.key
                    ? 'bg-toucan-orange/10 text-toucan-orange'
                    : 'text-toucan-grey-300 hover:bg-toucan-dark-lighter'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'brief' && <ProjectBriefEditor projectId={projectId!} />}
          {activeTab === 'glossary' && <GlossaryManager projectId={projectId!} />}
          {activeTab === 'documents' && <DocumentManager projectId={projectId!} />}
          {activeTab === 'preferences' && <PreferencesEditor projectId={projectId!} />}
        </div>
      </div>
    </PageLayout>
  );
}
```

### ProjectBriefEditor

**File:** `frontend/src/components/organisms/ProjectBriefEditor.tsx`

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import debounce from 'lodash/debounce';
import { api } from '../../services/api';

const BRIEF_TEMPLATE = `## System Overview

Describe what your system is and what it does.

## Integration Points

- System A: Description
- System B: Description

## Key Stakeholders

- Role 1: Their needs
- Role 2: Their needs

## Team Conventions

- Story format preferences
- Definition of done
`;

interface ProjectBriefEditorProps {
  projectId: string;
}

export function ProjectBriefEditor({ projectId }: ProjectBriefEditorProps) {
  const [brief, setBrief] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await api.get(`/projects/${projectId}/knowledge`);
        setBrief(response.data.data?.brief || '');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  const saveBrief = useCallback(
    debounce(async (content: string) => {
      setSaving(true);
      try {
        await api.put(`/projects/${projectId}/knowledge`, { brief: content });
        setLastSaved(new Date());
      } finally {
        setSaving(false);
      }
    }, 1500),
    [projectId]
  );

  function handleChange(value: string) {
    setBrief(value);
    saveBrief(value);
  }

  function useTemplate() {
    if (brief && !confirm('Replace current brief with template?')) return;
    handleChange(BRIEF_TEMPLATE);
  }

  if (loading) return <div>Loading...</div>;

  const wordCount = brief.trim().split(/\s+/).filter(Boolean).length;
  const tokenEstimate = Math.ceil(brief.length / 4);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-toucan-grey-100">Project Brief</h2>
          <p className="text-sm text-toucan-grey-400 mt-1">
            Describe your project to help the AI understand the domain
          </p>
        </div>
        <div className="flex items-center gap-4">
          {saving && <span className="text-xs text-toucan-grey-500">Saving...</span>}
          {lastSaved && !saving && (
            <span className="text-xs text-toucan-grey-500">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button onClick={useTemplate} className="btn btn-secondary text-sm">
            Use Template
          </button>
        </div>
      </div>

      <textarea
        value={brief}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Start typing your project brief..."
        className="w-full h-96 bg-toucan-dark border border-toucan-dark-border rounded-lg 
                   p-4 text-toucan-grey-200 font-mono text-sm resize-none
                   focus:outline-none focus:ring-2 focus:ring-toucan-orange/50"
      />

      <div className="flex items-center justify-between text-xs text-toucan-grey-500">
        <span>{wordCount} words</span>
        <span>~{tokenEstimate} tokens (context cost)</span>
      </div>

      <div className="bg-toucan-dark-lighter rounded-lg p-4 text-sm">
        <p className="text-toucan-grey-300">
          <strong className="text-toucan-orange">💡 Tip:</strong> A good brief helps the AI 
          understand your domain. Include system names, integrations, and team conventions.
        </p>
      </div>
    </div>
  );
}
```

### GlossaryManager

**File:** `frontend/src/components/organisms/GlossaryManager.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  aliases: string[];
  category?: string;
  useInstead?: string;
  isManual: boolean;
}

export function GlossaryManager({ projectId }: { projectId: string }) {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadTerms();
  }, [projectId]);

  async function loadTerms() {
    try {
      const response = await api.get(`/projects/${projectId}/glossary`);
      setTerms(response.data.data);
    } finally {
      setLoading(false);
    }
  }

  async function addTerm(term: Partial<GlossaryTerm>) {
    const response = await api.post(`/projects/${projectId}/glossary`, term);
    setTerms([...terms, response.data.data]);
    setShowAdd(false);
  }

  async function deleteTerm(termId: string) {
    if (!confirm('Delete this term?')) return;
    await api.delete(`/projects/${projectId}/glossary/${termId}`);
    setTerms(terms.filter((t) => t.id !== termId));
  }

  const categories = [...new Set(terms.map((t) => t.category).filter(Boolean))];
  
  const filteredTerms = terms.filter((t) =>
    t.term.toLowerCase().includes(filter.toLowerCase()) ||
    t.definition.toLowerCase().includes(filter.toLowerCase())
  );

  // Group by category
  const groupedTerms = filteredTerms.reduce((acc, term) => {
    const cat = term.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(term);
    return acc;
  }, {} as Record<string, GlossaryTerm[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-toucan-grey-100">Glossary</h2>
          <p className="text-sm text-toucan-grey-400 mt-1">
            Define domain terms to help the AI use correct terminology
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary text-sm">Import CSV</button>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary text-sm">
            + Add Term
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search terms..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-4 py-2 text-sm"
      />

      {loading ? (
        <div>Loading...</div>
      ) : Object.keys(groupedTerms).length === 0 ? (
        <div className="text-center py-12 text-toucan-grey-500">
          No terms yet. Add your first term to get started.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTerms).map(([category, categoryTerms]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-toucan-grey-400 mb-3">
                {category} ({categoryTerms.length})
              </h3>
              <div className="grid gap-3">
                {categoryTerms.map((term) => (
                  <div key={term.id} className="bg-toucan-dark-card border border-toucan-dark-border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-toucan-grey-100">{term.term}</h4>
                        <p className="text-sm text-toucan-grey-400 mt-1">{term.definition}</p>
                        {term.aliases.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {term.aliases.map((alias) => (
                              <span key={alias} className="text-xs px-2 py-0.5 bg-toucan-dark rounded text-toucan-grey-500">
                                {alias}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => deleteTerm(term.id)} 
                        className="text-toucan-grey-500 hover:text-red-400"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddTermModal
          onClose={() => setShowAdd(false)}
          onAdd={addTerm}
          categories={categories as string[]}
        />
      )}
    </div>
  );
}

function AddTermModal({ onClose, onAdd, categories }: {
  onClose: () => void;
  onAdd: (term: Partial<GlossaryTerm>) => void;
  categories: string[];
}) {
  const [term, setTerm] = useState('');
  const [definition, setDefinition] = useState('');
  const [category, setCategory] = useState('');
  const [aliases, setAliases] = useState('');

  function handleSubmit() {
    onAdd({
      term,
      definition,
      category: category || undefined,
      aliases: aliases.split(',').map((a) => a.trim()).filter(Boolean),
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-toucan-dark-card border border-toucan-dark-border rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-toucan-grey-100 mb-4">Add Term</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-toucan-grey-400 mb-1">Term *</label>
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2"
              placeholder="e.g. MRN"
            />
          </div>
          
          <div>
            <label className="block text-sm text-toucan-grey-400 mb-1">Definition *</label>
            <textarea
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 h-20"
              placeholder="What does this term mean?"
            />
          </div>
          
          <div>
            <label className="block text-sm text-toucan-grey-400 mb-1">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              list="categories"
              className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2"
              placeholder="e.g. HL7, Systems, Identifiers"
            />
            <datalist id="categories">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          
          <div>
            <label className="block text-sm text-toucan-grey-400 mb-1">Aliases (comma-separated)</label>
            <input
              type="text"
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
              className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2"
              placeholder="e.g. medical record number, patient id"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={!term || !definition} className="btn btn-primary">
            Add Term
          </button>
        </div>
      </div>
    </div>
  );
}
```

### PreferencesEditor

**File:** `frontend/src/components/organisms/PreferencesEditor.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

interface TeamPreferences {
  acFormat: 'gherkin' | 'bullets' | 'checklist' | 'numbered';
  requiredSections: string[];
  maxAcCount: number;
  verbosity: 'concise' | 'balanced' | 'detailed';
  technicalDepth: 'high_level' | 'moderate' | 'implementation';
  customPrefs: string[];
}

const SECTION_OPTIONS = [
  { value: 'technicalNotes', label: 'Technical Notes' },
  { value: 'securityConsiderations', label: 'Security Considerations' },
  { value: 'accessibilityNotes', label: 'Accessibility Notes' },
  { value: 'testingNotes', label: 'Testing Notes' },
  { value: 'errorHandling', label: 'Error Handling' },
];

export function PreferencesEditor({ projectId }: { projectId: string }) {
  const [prefs, setPrefs] = useState<TeamPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPrefs();
  }, [projectId]);

  async function loadPrefs() {
    try {
      const response = await api.get(`/projects/${projectId}/preferences`);
      setPrefs(response.data.data);
    } catch {
      setPrefs({
        acFormat: 'bullets',
        requiredSections: [],
        maxAcCount: 8,
        verbosity: 'balanced',
        technicalDepth: 'moderate',
        customPrefs: [],
      });
    } finally {
      setLoading(false);
    }
  }

  async function savePrefs() {
    setSaving(true);
    try {
      await api.put(`/projects/${projectId}/preferences`, prefs);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !prefs) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-toucan-grey-100">Team Preferences</h2>
        <p className="text-sm text-toucan-grey-400 mt-1">
          Configure how the AI generates stories
        </p>
      </div>

      {/* AC Format */}
      <div>
        <h3 className="text-sm font-medium text-toucan-grey-200 mb-3">
          Acceptance Criteria Format
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'gherkin', label: 'Gherkin', desc: 'Given/When/Then' },
            { value: 'bullets', label: 'Bullet Points', desc: 'Simple bullets' },
            { value: 'checklist', label: 'Checklist', desc: 'Checkbox style' },
            { value: 'numbered', label: 'Numbered', desc: 'Numbered list' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setPrefs({ ...prefs, acFormat: option.value as any })}
              className={`p-3 rounded-lg border text-left ${
                prefs.acFormat === option.value
                  ? 'border-toucan-orange bg-toucan-orange/10'
                  : 'border-toucan-dark-border hover:border-toucan-grey-600'
              }`}
            >
              <div className="font-medium text-toucan-grey-200">{option.label}</div>
              <div className="text-xs text-toucan-grey-500">{option.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Required Sections */}
      <div>
        <h3 className="text-sm font-medium text-toucan-grey-200 mb-3">
          Required Sections
        </h3>
        <div className="space-y-2">
          {SECTION_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.requiredSections.includes(option.value)}
                onChange={(e) => {
                  const sections = e.target.checked
                    ? [...prefs.requiredSections, option.value]
                    : prefs.requiredSections.filter((s) => s !== option.value);
                  setPrefs({ ...prefs, requiredSections: sections });
                }}
                className="rounded"
              />
              <span className="text-sm text-toucan-grey-300">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Custom Instructions */}
      <div>
        <h3 className="text-sm font-medium text-toucan-grey-200 mb-3">
          Custom Instructions
        </h3>
        <div className="space-y-2">
          {prefs.customPrefs.map((pref, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={pref}
                onChange={(e) => {
                  const customs = [...prefs.customPrefs];
                  customs[index] = e.target.value;
                  setPrefs({ ...prefs, customPrefs: customs });
                }}
                className="flex-1 bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-sm"
              />
              <button
                onClick={() => {
                  setPrefs({ ...prefs, customPrefs: prefs.customPrefs.filter((_, i) => i !== index) });
                }}
                className="text-toucan-grey-500 hover:text-red-400"
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={() => setPrefs({ ...prefs, customPrefs: [...prefs.customPrefs, ''] })}
            className="text-sm text-toucan-orange hover:underline"
          >
            + Add custom instruction
          </button>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-4 border-t border-toucan-dark-border">
        <button onClick={savePrefs} disabled={saving} className="btn btn-primary">
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}
```

## Seed Data for Moorfields

```typescript
const moorfieldsGlossary = [
  { term: 'MRN', definition: 'Medical Record Number - unique patient identifier in Meditech', category: 'Identifiers' },
  { term: 'Meditech', definition: 'Core Patient Administration System (PAS) at Moorfields', category: 'Systems' },
  { term: 'OpenEyes', definition: 'Open source ophthalmology Electronic Medical Record (EMR)', category: 'Systems' },
  { term: 'Rhapsody', definition: 'Integration engine handling message routing between systems', category: 'Systems' },
  { term: 'HL7', definition: 'Health Level 7 - healthcare messaging standard', category: 'Standards' },
  { term: 'ADT', definition: 'Admit/Discharge/Transfer - HL7 message type for patient movements', category: 'HL7' },
  { term: 'PID', definition: 'Patient Identification - HL7 segment containing patient demographics', category: 'HL7' },
  { term: 'AL1', definition: 'Allergy Information - HL7 segment for patient allergies', category: 'HL7' },
  { term: 'DG1', definition: 'Diagnosis - HL7 segment for diagnosis information', category: 'HL7' },
  { term: 'SCH', definition: 'Schedule - HL7 segment for appointment information', category: 'HL7' },
];
```

## Testing Checklist

- [ ] Navigate to /projects/:id/settings → tabs work
- [ ] Brief tab → editor loads
- [ ] Type in brief → auto-saves after 1.5 seconds
- [ ] Use Template → populates brief
- [ ] Glossary tab → list terms
- [ ] Add term → appears in list
- [ ] Delete term → removed from list
- [ ] Search terms → filters correctly
- [ ] Import CSV → terms created
- [ ] Preferences tab → loads settings
- [ ] Change AC format → selected
- [ ] Toggle required sections → updated
- [ ] Add custom instruction → added
- [ ] Save preferences → persists

## Files to Create

```
backend/src/routes/
├── knowledge.ts
├── glossary.ts
└── preferences.ts

frontend/src/
├── pages/
│   └── ProjectSettingsPage.tsx
└── components/organisms/
    ├── ProjectBriefEditor.tsx
    ├── GlossaryManager.tsx
    ├── DocumentManager.tsx
    └── PreferencesEditor.tsx
```

## Dependencies

- Feature 12 (Project Management) - project routes exist

## Effort Estimate

**6 hours**
- Database schema + migration: 45 min
- Backend routes: 1.5 hours
- ProjectSettingsPage: 30 min
- ProjectBriefEditor: 45 min
- GlossaryManager: 1 hour
- PreferencesEditor: 45 min
- DocumentManager (basic): 30 min
- Testing: 15 min
