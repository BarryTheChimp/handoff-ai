# Handoff AI - Complete Platform Deep Dive

> **Generated:** 2026-01-02
> **Purpose:** Comprehensive technical documentation for build spec development

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Database Schema](#2-database-schema)
3. [Backend Services](#3-backend-services)
4. [API Endpoints](#4-api-endpoints)
5. [Frontend Pages & Navigation](#5-frontend-pages--navigation)
6. [Frontend Components](#6-frontend-components)
7. [AI Translation Pipeline](#7-ai-translation-pipeline)
8. [Current Gaps & Limitations](#8-current-gaps--limitations)

---

## 1. Platform Overview

### What Handoff AI Does

Handoff AI transforms specification documents into structured, developer-ready work items:

1. **Upload** - Supports PDF, DOCX, YAML, JSON, Markdown specs
2. **Extract** - Parses document structure into sections
3. **Translate** - 4-pass AI pipeline creates epics → features → stories
4. **Review** - Interactive tree editor for refinement
5. **Export** - Push to Jira or download as CSV/JSON/Markdown

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Zustand, Tailwind CSS |
| Backend | Node.js, Fastify 4, TypeScript |
| Database | PostgreSQL 15, Prisma ORM 5 |
| AI | Claude API (Haiku + Sonnet models) |
| Auth | JWT, bcrypt |
| Email | Resend |
| Storage | Filesystem (local) |

---

## 2. Database Schema

### Models (23 Total)

#### Core Entities
| Model | Purpose |
|-------|---------|
| **User** | Authentication, roles (admin/member), status (pending/active/suspended) |
| **UserInvitation** | Team invitations with 72-hour expiry tokens |
| **PasswordResetToken** | Password reset with 1-hour expiry |
| **Project** | Container for specs, knowledge base, templates, settings |
| **Spec** | Uploaded document with status workflow: uploaded → extracting → ready → translating → translated |
| **SpecSection** | Parsed sections of a spec (heading, content, sectionRef, orderIndex) |
| **WorkItem** | Epic/Feature/Story with hierarchy (parentId), status, size estimate |
| **WorkItemSource** | Junction: links WorkItem ↔ SpecSection with relevanceScore |
| **WorkItemHistory** | Audit trail: fieldChanged, oldValue, newValue, changedBy, changedAt |

#### Jira Integration
| Model | Purpose |
|-------|---------|
| **JiraConnection** | OAuth tokens (encrypted), cloudId, siteUrl per user |
| **Export** | Export job tracking: status, progress, results, errors |

#### Multi-File Upload
| Model | Purpose |
|-------|---------|
| **SpecGroup** | Groups 2-10 specs for unified translation |
| **SpecConflict** | Conflicts between specs in a group (type, severity, resolution) |

#### Templates & Preferences
| Model | Purpose |
|-------|---------|
| **StoryTemplate** | AC format, required sections, custom fields per project |
| **TeamPreference** | Learned preferences from feedback |
| **TeamPreferencesConfig** | AC format, verbosity, technical depth settings |

#### Knowledge Base
| Model | Purpose |
|-------|---------|
| **ProjectKnowledge** | Project brief (markdown, 50k chars max) |
| **GlossaryTerm** | Domain terms with definitions, aliases, "use instead" guidance |
| **ReferenceDocument** | Uploaded context documents |
| **DocumentChunk** | Chunked reference doc content for retrieval |

#### Context Sources
| Model | Purpose |
|-------|---------|
| **ContextSource** | Integration configs (Jira, specs, documents) |
| **ContextChunk** | Searchable chunks with keywords for context retrieval |

#### Learning & Feedback
| Model | Purpose |
|-------|---------|
| **AIFeedback** | Thumbs up/down ratings per work item |
| **StoryEdit** | Tracked user edits for pattern learning |
| **LearnedPattern** | Detected patterns from edits (pending → accepted/dismissed) |

#### Quality & Health
| Model | Purpose |
|-------|---------|
| **SpecAnalysis** | Cached pre-translation analysis (readiness, issues, complexity) |
| **ProjectHealth** | Health score (0-100) with component breakdown |
| **DuplicateMatch** | Detected duplicate work items with similarity scores |
| **BulkOperation** | Batch operations with undo tokens (1-hour expiry) |

### Key Enums

```
SpecStatus: uploaded | extracting | ready | translating | translated | error
WorkItemType: epic | feature | story
WorkItemStatus: draft | ready_for_review | approved | exported
SizeEstimate: S | M | L | XL
UserRole: admin | member
UserStatus: pending | active | suspended
ACFormat: gherkin | bullets | checklist | numbered
Verbosity: concise | balanced | detailed
TechnicalDepth: high_level | moderate | implementation
```

### Data Flow

```
Project (root)
├── Spec (document)
│   ├── SpecSection (parsed content)
│   └── WorkItem (epic/feature/story hierarchy)
│       ├── WorkItemSource → SpecSection (traceability)
│       ├── WorkItemHistory (audit)
│       └── AIFeedback (user ratings)
├── SpecGroup (batch uploads)
│   └── SpecConflict (resolution required)
├── StoryTemplate (generation config)
├── TeamPreference (learned from feedback)
├── ProjectKnowledge (brief)
├── GlossaryTerm (domain terms)
├── ReferenceDocument (context)
├── ContextSource (integrations)
└── ProjectHealth (quality metrics)
```

---

## 3. Backend Services

### Core AI Services

| Service | Purpose | Key Methods |
|---------|---------|-------------|
| **TranslationService** | 4-pass AI pipeline orchestration | `translate(specId)` |
| **ClaudeService** | Claude API wrapper with retry logic | `complete()`, `completeJSON<T>()` |
| **PromptService** | Template loading and variable substitution | `loadAndRender()` |
| **ContextBuilder** | Builds AI context from knowledge base | `buildContext(projectId, specText)` |
| **SpecAnalysisService** | Pre-translation quality analysis | `analyzeSpec(specId)` |

### Document Services

| Service | Purpose | Key Methods |
|---------|---------|-------------|
| **DocumentService** | Upload validation, spec CRUD | `upload()`, `validateFile()` |
| **ExtractionService** | Parse PDF/DOCX/YAML/MD into sections | `extractContent(specId)` |
| **StorageService** | Filesystem storage abstraction | `save()`, `read()`, `delete()` |

### Quality Services

| Service | Purpose | Key Methods |
|---------|---------|-------------|
| **CoverageService** | Track spec section coverage | `calculateCoverage(specId)` |
| **DependencyService** | Manage work item dependencies | `getGraph()`, `addDependency()`, `wouldCreateCycle()` |
| **DuplicateDetectionService** | Find similar/duplicate work items | `detectDuplicates()`, `mergeItems()` |
| **EstimationService** | AI-powered size estimation | `estimateSingle()`, `estimateBatch()` |
| **InvestScoreService** | Score stories against INVEST criteria | `getScore(workItemId)` |
| **HealthScoreService** | Project health/maturity scoring | `calculateHealth(projectId)` |

### Work Item Services

| Service | Purpose | Key Methods |
|---------|---------|-------------|
| **StorySplitService** | AI-assisted story splitting | `analyzeSplit()`, `executeSplit()` |
| **HistoryService** | Track changes for undo/redo | `recordChange()`, `undoLastChange()` |
| **WorkBreakdownService** | Hierarchical breakdown views | `getWorkBreakdown(projectId)` |
| **BulkOperationService** | Batch updates with undo | `updateFields()`, `aiEnhance()`, `undo()` |

### Export Services

| Service | Purpose | Key Methods |
|---------|---------|-------------|
| **JiraService** | Jira OAuth and API wrapper | `createIssue()`, `linkIssues()` |
| **JiraExportService** | Async export to Jira | `createExport()`, `getExportProgress()` |
| **LocalExportService** | Export to CSV/JSON/Markdown | `exportSpec()` |

### Knowledge Services

| Service | Purpose | Key Methods |
|---------|---------|-------------|
| **KnowledgeService** | Brief, glossary, reference docs | `updateBrief()`, `createGlossaryTerm()` |
| **ContextSourceService** | Manage integrations | `syncSpecsSource()`, `searchContext()` |
| **FeedbackService** | Collect work item ratings | `submitFeedback()` |

### Other Services

| Service | Purpose |
|---------|---------|
| **AuthService** | Login, invitations, password reset |
| **EmailService** | Transactional emails via Resend |
| **BrandingService** | User settings for UI/export |
| **SpecGroupService** | Multi-file groups with conflict resolution |
| **RelationshipService** | Extract entities and relationships |

---

## 4. API Endpoints

### Summary: 136+ Endpoints across 26 route files

### Authentication (`/api/auth/*`)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/login` | Authenticate user |
| GET | `/me` | Get current user |
| POST | `/invite` | Send invitation (admin) |
| GET | `/invite/:token` | Get invitation details |
| POST | `/accept-invite` | Accept invitation |
| POST | `/forgot-password` | Request reset email |
| POST | `/reset-password` | Reset password |

### Projects (`/api/projects/*`)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List projects |
| POST | `/` | Create project |
| GET | `/:id` | Get project |
| PUT | `/:id` | Update project |
| DELETE | `/:id` | Delete project |
| POST | `/:id/logo` | Upload logo |
| DELETE | `/:id/logo` | Delete logo |
| GET | `/:id/logo` | Get logo (public) |

### Specs (`/api/specs/*`)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List specs |
| POST | `/` | Upload spec (multipart) |
| GET | `/:id` | Get spec |
| DELETE | `/:id` | Delete spec |
| PATCH | `/:id/metadata` | Update questionnaire answers |
| POST | `/:id/extract` | Trigger extraction |
| POST | `/:id/translate` | Trigger AI translation |
| GET | `/:id/workitems` | Get work items (flat + hierarchical) |
| GET | `/:id/sections` | Get spec sections |
| GET | `/:id/preview` | Preview original file |

### Work Items (`/api/workitems/*`)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | List with filters |
| GET | `/:id` | Get work item |
| PATCH | `/:id` | Update fields (auto-saves history) |
| DELETE | `/:id` | Delete work item |
| POST | `/:id/move` | Reorder/reparent |
| POST | `/:id/split` | Split story |
| POST | `/merge` | Merge stories |
| POST | `/bulk` | Bulk update |
| POST | `/bulk/ai-enhance` | AI enhancement |
| POST | `/bulk/undo` | Undo bulk operation |

### Jira Integration
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/jira/auth` | Get OAuth URL |
| GET | `/api/jira/callback` | OAuth callback |
| GET | `/api/jira/status` | Connection status |
| DELETE | `/api/jira/disconnect` | Disconnect |
| GET | `/api/jira/projects` | List Jira projects |
| POST | `/api/specs/:id/export` | Start Jira export |
| GET | `/api/exports/:id` | Export progress |

### Knowledge Base (`/api/projects/:projectId/*`)
| Method | Path | Purpose |
|--------|------|---------|
| GET/PUT | `/knowledge/brief` | Project brief |
| GET/POST | `/glossary` | Glossary terms |
| PUT/DELETE | `/glossary/:termId` | Term CRUD |
| GET/POST | `/reference-docs` | Reference documents |
| GET/PUT | `/preferences-config` | Team preferences config |
| GET/POST | `/context-sources` | Context integrations |

### Quality & Analysis
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/specs/:id/analysis` | Pre-translation analysis |
| GET | `/api/specs/:id/coverage` | Coverage report |
| GET | `/api/specs/:id/dependencies` | Dependency graph |
| GET | `/api/specs/:id/duplicates` | Duplicate detection |
| GET | `/api/workitems/:id/invest-score` | INVEST score |
| GET | `/api/projects/:id/health` | Project health |

---

## 5. Frontend Pages & Navigation

### Route Map

| Route | Page | Purpose |
|-------|------|---------|
| `/login` | LoginPage | Sign in |
| `/forgot-password` | ForgotPasswordPage | Request reset |
| `/reset-password/:token` | ResetPasswordPage | Set new password |
| `/invite/:token` | AcceptInvitePage | Accept invitation |
| `/` | DashboardPage | Spec list, upload, manage |
| `/projects` | ProjectsPage | Project CRUD |
| `/review/:specId` | ReviewPage | Edit work items in tree |
| `/spec-groups/:groupId` | GroupStatusPage | Batch upload conflicts |
| `/templates` | TemplatesPage | Story template management |
| `/knowledge` | KnowledgeBasePage | Brief, glossary, docs, sources |
| `/preferences/:projectId` | PreferencesPage | Team preferences |
| `/settings` | SettingsPage | Branding, export defaults |
| `/users` | UsersPage | Team management (admin) |
| `/dependencies/:specId` | DependencyGraphPage | Visual dependency graph |
| `/coverage/:specId` | CoveragePage | Section coverage heatmap |
| `/work-breakdown/:projectId` | WorkBreakdownPage | Treemap visualization |

### Navigation Flow

```
Login → Dashboard (/)
           │
           ├─ Upload Spec → Questionnaire → Extract → Translate → Review
           │
           ├─ Review Page (/review/:id)
           │   ├─ Tree Editor (drag-drop, multi-select)
           │   ├─ Story Editor (auto-save)
           │   ├─ Dependencies (/dependencies/:id)
           │   ├─ Coverage (/coverage/:id)
           │   └─ Export to Jira/File
           │
           ├─ Knowledge Base (/knowledge)
           │   ├─ Project Brief
           │   ├─ Glossary
           │   ├─ Reference Docs
           │   ├─ Context Sources
           │   └─ Preferences Config
           │
           ├─ Templates (/templates)
           │
           └─ Settings (/settings)
```

### State Management (Zustand Stores)

| Store | Purpose |
|-------|---------|
| **treeStore** | Work item tree hierarchy, expand/collapse, selection |
| **selectionStore** | Multi-select state, undo tokens |
| **editorStore** | Current item editing, auto-save, dirty state |
| **historyStore** | Undo/redo stack (max 50 entries) |
| **loadingStore** | Operation progress tracking |
| **toastStore** | Toast notifications |

---

## 6. Frontend Components

### Component Hierarchy

```
Atoms (foundational)
├── Button (primary, secondary, ghost, danger)
├── Badge (StatusBadge, TypeBadge, SizeBadge)
├── Modal (dialog with backdrop)
├── Spinner (loading states)
├── ProgressBar (progress indicator)
└── Icon (lucide-react wrapper)

Molecules (composite)
├── EditableText (click-to-edit)
├── TreeNode (work item in tree)
├── DraggableTreeNode (with drag-drop + multi-select)
├── MarkdownPreview (edit/preview tabs)
├── SizeSelector (S/M/L/XL picker)
├── EstimateSuggestion (AI estimate display)
├── AutoSaveStatus (saving/saved/error)
├── ProjectSelector (dropdown)
├── UserDropdown (user menu)
├── Toast (notification)
└── OperationProgress (bottom-right tracker)

Organisms (complex features)
├── WorkBreakdownTree (tree view)
├── DraggableWorkBreakdownTree (editable tree)
├── StoryEditor (full item editor)
├── SpecCard (spec list item)
├── Header (app header)
├── Navigation (side nav)
├── ExportModal (Jira/file export)
├── QuestionnaireModal (pre-translation preferences)
├── SplitModal (story splitting)
├── MergeModal (story merging)
└── ToastContainer (notification area)

Templates (page layouts)
├── PageLayout (standard page wrapper)
└── ReviewLayout (split-pane editor)
```

### Key Interactive Components

| Component | Features |
|-----------|----------|
| **DraggableWorkBreakdownTree** | Drag-drop reordering, hierarchy validation, multi-select, keyboard nav |
| **StoryEditor** | Auto-save (2s debounce), markdown editing, AI estimation, INVEST scoring |
| **ExportModal** | Multi-step wizard for Jira/file export with progress tracking |
| **QuestionnaireModal** | Pre-translation preferences (structure, size, AC format) |

---

## 7. AI Translation Pipeline

### 4-Pass Architecture

```
Pass 1: Structure Analysis (Haiku)
├── Input: Spec text + sections
├── Output: Themes, entities, components, complexity
└── Purpose: Understand document structure

Pass 2: Epic Generation (Sonnet)
├── Input: Pass 1 analysis
├── Output: 1-5 epics with scope
└── Purpose: Create high-level work packages

Pass 3: Story Generation (Sonnet, per epic)
├── Input: Epic + relevant sections + preferences
├── Output: Features → Stories with AC
└── Purpose: Break down into actionable items

Pass 4: Enrichment (Haiku)
├── Input: All work items + sections
├── Output: Dependencies, coverage gaps, quality score
└── Purpose: Validate and enhance
```

### Model Usage

| Pass | Model | Temperature | Purpose |
|------|-------|-------------|---------|
| 1 | Haiku | 0.1 | Fast analysis |
| 2 | Sonnet | 0.3 | Quality generation |
| 3 | Sonnet | 0.3 | Detailed breakdown |
| 4 | Haiku | 0.1 | Validation |

### Prompt Templates

Located in `/backend/src/prompts/api-spec/`:

| File | Purpose | Variables |
|------|---------|-----------|
| `structure.txt` | Analyze document structure | `{{documentContent}}`, `{{sections}}` |
| `epics.txt` | Generate epics | `{{summary}}`, `{{themes}}`, `{{entities}}` |
| `stories.txt` | Generate stories | `{{epicTitle}}`, `{{relevantSections}}`, `{{acFormat}}` |
| `enrichment.txt` | Validate and enrich | `{{workItems}}`, `{{sections}}` |

### Context Building

The **ContextBuilder** service enriches AI prompts with:

1. **Always included:** Project brief, team preferences
2. **Keyword-matched:** Glossary terms, related specs, Jira context
3. **Token-budgeted:** Allocates tokens across sources (brief: 400, glossary: 300, etc.)

---

## 8. Current Gaps & Limitations

### What IS Built

- 4-pass AI translation pipeline
- Context-aware prompting with token budgets
- Pre-translation readiness scoring
- Coverage + dependency + duplicate detection
- Domain glossary integration
- Team preference customization
- INVEST quality scoring
- Jira export with progress tracking

### What is NOT Built

| Gap | Description |
|-----|-------------|
| **Cross-document synthesis** | Each spec translates independently; no unified view across multiple specs |
| **Semantic context matching** | Keyword-only matching; "customer" won't match "client" |
| **Learning from corrections** | User edits tracked but not used to improve AI |
| **Real-time multi-pass refinement** | Passes don't inform each other dynamically |
| **Pattern extraction** | Detected patterns exist but not applied to generation |
| **Multiple spec types** | Only `api-spec` prompts exist; architecture supports more |

### Architecture Supports But Not Implemented

- **Multi-spec type prompts:** Just need to create `requirements-doc/`, `design-doc/` folders
- **Semantic search:** ContextChunks exist, need embedding integration
- **Cross-spec entities:** RelationshipService extracts entities, not linked across specs
- **Learning loop:** StoryEdit → LearnedPattern exists, not feeding back to prompts

---

## Appendix: File Counts

| Area | Count |
|------|-------|
| Database Models | 23 |
| Backend Services | 37 |
| API Endpoints | 136+ |
| Frontend Pages | 15 |
| Frontend Components | 60+ |
| Zustand Stores | 6 |
| Prompt Templates | 4 (for api-spec only) |

---

*This document provides complete technical context for building improvements to the Handoff AI platform.*
