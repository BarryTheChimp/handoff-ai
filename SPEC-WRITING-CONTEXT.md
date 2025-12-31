# Handoff AI - Full Codebase Context for Spec Writing

> **Copy this entire document into Claude before writing any spec.**

---

## PROJECT OVERVIEW

**Handoff AI** transforms specification documents into developer-ready Jira tickets.

**Flow:** Upload spec → AI extracts & translates → Review work items → Export to Jira

**Tech Stack:**
- Frontend: React 18, Tailwind CSS, Zustand, Vite
- Backend: Node.js 20, Fastify 4, Prisma 5
- Database: PostgreSQL 15 (Supabase)
- AI: Claude API (claude-sonnet-4-20250514)

---

## CURRENT DATABASE SCHEMA

```prisma
// =====================
// ENUMS
// =====================
enum SpecStatus { uploaded, extracting, ready, translating, translated, error }
enum WorkItemType { epic, feature, story }
enum WorkItemStatus { draft, ready_for_review, approved, exported }
enum SizeEstimate { S, M, L, XL }
enum ContextSourceType { specs, jira, document, confluence, github }
enum EditField { title, description, acceptanceCriteria, technicalNotes, size, priority }
enum EditType { addition, removal, modification, complete }
enum SuggestionType { addToPreferences, addToGlossary, updateTemplate, addRequiredSection }
enum PatternStatus { pending, suggested, accepted, dismissed, applied }
enum HealthLevel { minimal, basic, good, excellent }
enum DocumentType { architecture, process, technical, business, other }
enum ACFormat { gherkin, bullets, checklist, numbered }
enum Verbosity { concise, balanced, detailed }
enum TechnicalDepth { high_level, moderate, implementation }
enum ExportStatus { pending, in_progress, completed, failed, cancelled }
enum SpecGroupStatus { pending, analyzing, conflicts_detected, ready, error }

// =====================
// CORE MODELS
// =====================
model Project {
  id, name, description, jiraProjectKey, settings (JSON), createdAt, updatedAt
  → specs[], specGroups[], templates[], preferences[], knowledge,
    glossary[], referenceDocuments[], preferencesConfig, contextSources[],
    contextChunks[], storyEdits[], learnedPatterns[], health
}

model Spec {
  id, projectId, specGroupId?, name, filePath, fileType, fileSize
  extractedText, status (SpecStatus), specType, uploadedBy, uploadedAt
  metadata (JSON), errorMessage
  → project, specGroup?, sections[], workItems[]
}

model SpecSection {
  id, specId, sectionRef, heading, content, orderIndex, intentionallyUncovered
  → spec, workItemSources[]
}

model WorkItem {
  id, specId, parentId? (self-reference)
  type (WorkItemType), title, description, acceptanceCriteria, technicalNotes
  sizeEstimate, status (WorkItemStatus), orderIndex, jiraKey, templateId
  customFields (JSON), dependsOnIds[]
  → parent?, children[], spec, sources[], history[], feedback[], edits[]
}

model WorkItemSource { workItemId, sectionId, relevanceScore }
model WorkItemHistory { id, workItemId, fieldChanged, oldValue, newValue, changedBy, changedAt }

// =====================
// KNOWLEDGE BASE
// =====================
model ProjectKnowledge {
  id, projectId (unique), brief (markdown), briefUpdatedAt
}

model GlossaryTerm {
  id, projectId, term, definition, aliases[], category
  useInstead, avoidTerms[], isManual, sourceSpecId, confidence
}

model TeamPreferencesConfig {
  id, projectId (unique)
  acFormat, requiredSections[], maxAcCount, verbosity, technicalDepth
  customPrefs (JSON)
}

model ReferenceDocument {
  id, projectId, name, fileName, filePath, fileType, fileSize
  extractedText, summary, docType, isActive, uploadedAt, uploadedBy
  → chunks[]
}

model DocumentChunk { id, documentId, content, chunkIndex, heading, summary }

// =====================
// CONTEXT SOURCES
// =====================
model ContextSource {
  id, projectId, sourceType, name, isEnabled, config (JSON)
  lastSyncAt, lastError, itemCount
}

model ContextChunk {
  id, projectId, sourceType, sourceId, content, summary
  metadata (JSON), heading, keywords[]
}

// =====================
// LEARNING LOOP
// =====================
model StoryEdit {
  id, projectId, workItemId, field (EditField)
  beforeValue, afterValue, editType, specId, userId, createdAt
}

model LearnedPattern {
  id, projectId, pattern, description, confidence, occurrences
  field (EditField), context, suggestion
  suggestionType, status (PatternStatus), reviewedAt, reviewedBy, appliedAt
}

// =====================
// PROJECT HEALTH
// =====================
model ProjectHealth {
  id, projectId (unique), score (0-100), level (HealthLevel)
  briefScore, glossaryScore, prefsScore, specsScore, sourcesScore, learningScore
  recommendations (JSON)
}

// =====================
// OTHER
// =====================
model JiraConnection { id, userId, accessToken, refreshToken, expiresAt, cloudId, siteUrl }
model SpecGroup { id, projectId, name, primarySpecId, stitchedContext, status }
model SpecConflict { id, specGroupId, spec1Id, spec1Section, spec1Text, spec2Id, spec2Section, spec2Text, conflictType, severity, description, resolution, mergedText }
model Export { id, specId, userId, jiraProjectKey, status, isDryRun, totalItems, processedItems, failedItems, results (JSON) }
model BulkOperation { id, userId, specId, operation, itemIds[], payload (JSON), previousValues (JSON), expiresAt }
model StoryTemplate { id, projectId, name, isDefault, acFormat, requiredSections[], customFields (JSON) }
model AIFeedback { id, workItemId, userId, rating, feedback, categories[] }
model TeamPreference { id, projectId, preference, description, category, learnedFrom[], active }
```

---

## BACKEND API ROUTES

### Authentication
```
POST /api/auth/login         - Login with username/password, returns JWT
GET  /api/auth/me            - Get current user from JWT
```
**Note:** Currently uses hardcoded test users (admin/admin123, tech.lead/lead123, developer/dev123)

### Projects
```
GET    /api/projects                    - List all projects (with specCount, workItemCount)
POST   /api/projects                    - Create project {name, description}
GET    /api/projects/:id                - Get project details
PATCH  /api/projects/:id                - Update project
DELETE /api/projects/:id                - Delete project (cascade)
```

### Specs
```
GET    /api/specs?projectId=            - List specs for project
POST   /api/specs                       - Upload spec (multipart: file, projectId)
GET    /api/specs/:id                   - Get spec with extractedText
DELETE /api/specs/:id                   - Delete spec (cascade)
POST   /api/specs/:id/extract           - Trigger text extraction
POST   /api/specs/:id/translate         - Trigger AI translation
GET    /api/specs/:id/workitems         - Get work items as tree + flat
GET    /api/specs/:id/sections          - Get parsed sections
PATCH  /api/specs/:id/metadata          - Update spec metadata
```

### Work Items
```
GET    /api/workitems?specId=           - List work items (flat)
PATCH  /api/workitems/:id               - Update fields (title, description, AC, techNotes, size, status)
POST   /api/workitems/:id/approve       - Set status to approved
POST   /api/workitems/:id/dependencies  - Add dependency IDs
DELETE /api/workitems/:id/dependencies/:depId - Remove dependency
```

### Knowledge Base
```
GET    /api/projects/:id/knowledge/brief          - Get project brief
POST   /api/projects/:id/knowledge/brief          - Create/update brief
GET    /api/projects/:id/glossary                 - List glossary terms
POST   /api/projects/:id/glossary                 - Add term
PATCH  /api/projects/:id/glossary/:termId         - Update term
DELETE /api/projects/:id/glossary/:termId         - Delete term
GET    /api/projects/:id/preferences              - Get preferences config
POST   /api/projects/:id/preferences              - Update preferences
```

### Context Sources
```
GET    /api/projects/:id/context-sources          - List sources
POST   /api/projects/:id/context-sources          - Add source
GET    /api/projects/:id/context-sources/:sid     - Get source
PATCH  /api/projects/:id/context-sources/:sid     - Update source
DELETE /api/projects/:id/context-sources/:sid     - Delete source
POST   /api/projects/:id/context-sources/:sid/sync - Trigger sync
```

### Context Builder
```
POST   /api/projects/:id/context/preview          - Preview context assembly
POST   /api/projects/:id/context/build            - Build full context (for AI)
```

### Learning Loop
```
POST   /api/projects/:id/learning/edits           - Track an edit
GET    /api/projects/:id/learning/patterns        - Get pending patterns
POST   /api/projects/:id/learning/patterns/detect - Detect patterns from edits
POST   /api/projects/:id/learning/patterns/:pid/accept  - Accept pattern
POST   /api/projects/:id/learning/patterns/:pid/dismiss - Dismiss pattern
GET    /api/projects/:id/learning/stats           - Get learning statistics
```

### Health Score
```
GET    /api/projects/:id/health                   - Get health score
POST   /api/projects/:id/health/recalculate       - Force recalculate
```

### Other Endpoints
```
/api/bulk/*           - Bulk update, undo operations
/api/templates/*      - Story template CRUD
/api/dependencies/*   - Dependency graph operations
/api/estimates/*      - Size estimation with AI
/api/coverage/*       - Spec coverage analysis
/api/feedback/*       - AI feedback (thumbs up/down)
/api/history/*        - Work item change history
/api/jira/*           - Jira OAuth and export
/api/spec-groups/*    - Multi-file upload groups
```

---

## BACKEND SERVICES

| Service | Purpose |
|---------|---------|
| **AuthService** | JWT authentication, user validation |
| **TranslationService** | 4-pass AI translation (Epic→Feature→Story→Enhance) |
| **ExtractionService** | Extract text from PDF, DOCX, MD, YAML, JSON |
| **ClaudeService** | Claude API wrapper with retries |
| **PromptService** | Prompt templates for AI |
| **KnowledgeService** | Brief, glossary, preferences CRUD |
| **ContextBuilder** | RAG-style context assembly with token budgeting |
| **ContextSourceService** | External source management |
| **LearningService** | Edit tracking, pattern detection |
| **HealthScoreService** | Calculate project health (0-100) |
| **DependencyService** | Work item dependencies |
| **EstimationService** | AI-powered size estimation |
| **CoverageService** | Spec section coverage analysis |
| **TemplateService** | Story templates |
| **BulkOperationService** | Bulk edits with undo |
| **HistoryService** | Audit trail |
| **JiraService** | Jira API integration (mock by default) |
| **JiraExportService** | Export work items to Jira |
| **DocumentService** | File handling |
| **StorageService** | File storage |
| **SpecGroupService** | Multi-file spec grouping |
| **FeedbackService** | AI feedback collection |

---

## FRONTEND PAGES

| Page | Route | Description |
|------|-------|-------------|
| **Login** | `/login` | Username/password login |
| **Projects** | `/projects` | Project list with cards, create modal |
| **Dashboard** | `/` | Spec list for selected project, upload |
| **Review** | `/review/:specId` | Work item tree + story editor |
| **Templates** | `/templates` | Story template management |
| **Dependencies** | `/dependencies/:specId` | Visual dependency graph |
| **Coverage** | `/coverage/:specId` | Spec coverage analysis |
| **Preferences** | `/preferences/:projectId` | Team preferences editor |
| **Knowledge Base** | `/knowledge` | Brief, glossary, prefs tabs |
| **Group Status** | `/spec-groups/:groupId` | Multi-file upload status |

---

## FRONTEND COMPONENTS

### Atoms (Basic UI)
- `Button` - Primary, secondary, ghost variants with loading
- `Badge` - Status badges with colors
- `Spinner` - Loading indicator
- `Modal` - Reusable modal wrapper
- `Icon` - Icon wrapper

### Molecules (Composed)
- `TreeNode` / `DraggableTreeNode` - Work item tree nodes
- `ProjectCard` - Project in list
- `ProjectSelector` - Dropdown to switch projects
- `UserDropdown` - User menu with logout
- `SpecFilters` - Search and status filter
- `EditableText` - Inline editable text
- `SizeSelector` - S/M/L/XL picker
- `EstimateSuggestion` - AI estimate display
- `FeedbackSection` - Thumbs up/down
- `HealthScoreWidget` - Circular progress + breakdown
- `MarkdownPreview` - Render markdown
- `Breadcrumbs` - Navigation breadcrumbs
- `CreateProjectModal` - New project form
- `JiraConnectionStatus` - Jira connection indicator

### Organisms (Complex)
- `Header` - Top bar with logo, project selector, user menu
- `Navigation` - Sidebar navigation
- `WorkBreakdownTree` / `DraggableWorkBreakdownTree` - Hierarchical work item tree
- `StoryEditor` - Full work item editor (title, description, AC, tech notes, size, status)
- `SpecCard` - Spec in dashboard grid
- `EmptyState` - Various empty states
- `DependencyGraph` - Visual graph of dependencies
- `ExportModal` - Jira export with progress
- `QuestionnaireModal` - Post-upload questions
- `BatchUploadModal` - Multi-file upload
- `BatchEstimateModal` - Bulk size estimation
- `BulkActionBar` - Multi-select actions
- `SplitModal` - Split story into multiple
- `MergeModal` - Merge multiple stories
- `DeleteConfirmModal` - Confirm deletion
- `SetupWizard` - Project onboarding (4 steps)
- `ContextPreview` - Token budget visualization
- `LearningSuggestions` - Pattern accept/dismiss
- `TeachHandoffModal` - Manual preference teaching
- `NodeDetailPanel` - Work item detail sidebar

### Templates
- `PageLayout` - Standard page wrapper with header/nav
- `ReviewLayout` - Split pane for review page

---

## WHAT WAVE 1-3 ACTUALLY DELIVERED

### Wave 1: Foundation
✅ Monorepo setup (npm workspaces)
✅ TypeScript configuration
✅ PostgreSQL + Prisma schema
✅ Fastify server setup
✅ Basic JWT authentication
✅ File upload (multipart)
✅ Spec storage and retrieval

### Wave 2: Core Pipeline
✅ Document extraction (PDF via pdf-parse, DOCX via mammoth)
✅ Section parsing with heading detection
✅ AI translation service (4-pass: Epics → Features → Stories → Enhance)
✅ Work item hierarchy with parent/child relationships
✅ Review interface with collapsible tree
✅ Story editor with all fields (title, description, AC, tech notes)
✅ Status workflow (draft → ready_for_review → approved → exported)
✅ Jira export (mock implementation, OAuth flow scaffolded)
✅ Spec groups for multi-file uploads
✅ Conflict detection between specs
✅ Story templates with custom AC formats
✅ Dependencies between work items
✅ Size estimation with AI
✅ Coverage analysis (which sections have work items)
✅ Bulk operations with undo
✅ Work item history (audit trail)
✅ AI feedback (thumbs up/down)

### Wave 3: Smart Context Engine
✅ **F11: User Session & Logout** - UserDropdown, session state, logout
✅ **F12: Project Management** - Full CRUD, ProjectsPage, ProjectCard
✅ **F13: Global Navigation** - Header, ProjectSelector, responsive nav
✅ **F14: Knowledge Base** - ProjectKnowledge, GlossaryTerm, TeamPreferencesConfig
✅ **F15: Context Sources** - ContextSource, external doc integration
✅ **F16: Smart Context Builder** - RAG-style retrieval, token budgeting (2000 default)
✅ **F17: Learning Loop** - StoryEdit tracking, LearnedPattern detection, suggestions
✅ **F18: Setup Wizard & Health** - SetupWizard (4 steps), ProjectHealth, HealthScoreWidget

---

## DESIGN SYSTEM (Toucan Labs)

### Colors
```css
--toucan-orange: #FF6B35       /* Primary CTA */
--toucan-orange-light: #FF8F66 /* Hover */
--toucan-orange-dark: #E55A2B  /* Active */
--toucan-dark: #1A1A2E         /* Page background */
--toucan-dark-lighter: #252542 /* Cards */
--toucan-dark-border: #3D3D5C  /* Borders */
--toucan-grey-100: #F5F5F7     /* Primary text */
--toucan-grey-200: #E5E5E7     /* Secondary text */
--toucan-grey-400: #9999A5     /* Muted */
--toucan-grey-600: #66667A     /* Disabled */
--toucan-success: #4ADE80
--toucan-warning: #FBBF24
--toucan-error: #F87171
--toucan-info: #60A5FA
```

### Typography
- Primary: Inter (400, 500, 600, 700)
- Mono: JetBrains Mono (for code)

### Component Patterns
- Buttons: `btn btn-primary`, `btn btn-secondary`, `btn btn-ghost`
- Cards: `bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg`
- Inputs: `bg-toucan-dark border border-toucan-dark-border rounded-md`

---

## CURRENT KNOWN GAPS

1. **Auth** - No registration, no forgot password, hardcoded test users
2. **E2E Tests** - No Playwright tests for critical flows
3. **Jira** - Mock implementation, needs real OAuth
4. **Real-time** - No WebSocket for live updates
5. **Multi-tenancy** - No user-to-project permissions
6. **File preview** - Can't preview uploaded specs in-app

---

## CODING CONVENTIONS

### Backend
- Services are "deep modules" (simple interface, complex implementation)
- Routes are thin (just request/response handling)
- All endpoints return `{ data: T }` or `{ error: { code, message } }`
- Use Prisma for all DB operations

### Frontend
- **ALL HOOKS BEFORE CONDITIONAL RETURNS** (React rules of hooks)
- Named exports only (no default exports)
- Use existing atoms/molecules before creating new
- Follow Toucan design system colors
- No `any` types

### File Naming
- Components: PascalCase (`StoryEditor.tsx`)
- Hooks: camelCase with 'use' (`useProject.ts`)
- Services: PascalCase with 'Service' (`TranslationService.ts`)
- Routes: camelCase (`workitems.ts`)
