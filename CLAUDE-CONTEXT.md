# Handoff AI - Complete Claude Context

> **Copy this entire file into Claude before starting any work on this codebase.**

---

## 1. PROJECT OVERVIEW

### What is Handoff AI?
Handoff AI is a web application that transforms specification documents (API specs, requirements docs, design docs) into structured, developer-ready Jira tickets. It bridges the gap between product/management language and technical implementation tasks.

### The Problem It Solves
- Specs are written in product language, developers need technical tasks
- Breaking down specs manually takes hours and is inconsistent
- Context gets lost in translation between teams

### The Solution
1. **Upload** any specification document
2. **AI translates** product language into work packages (Epics → Features → Stories)
3. **Review & refine** the generated breakdown in an interactive UI
4. **Export** directly to Jira with proper linking

### Owner
Toucan Labs

---

## 2. TECH STACK

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | React | 18.x |
| State Management | Zustand | 4.x |
| Styling | Tailwind CSS | 3.x |
| Backend | Node.js + Fastify | 20.x / 4.x |
| Database | PostgreSQL + Prisma | 15.x / 5.x |
| AI | Claude API | claude-sonnet-4-20250514 |
| Testing | Vitest + Playwright | Latest |

### Project Structure
```
handoff-ai/
├── backend/
│   ├── src/
│   │   ├── index.ts           # Server entry point
│   │   ├── routes/            # API endpoints (thin layer)
│   │   ├── services/          # Business logic (deep modules)
│   │   ├── config/            # Configuration files
│   │   └── lib/               # Utilities (prisma, etc)
│   └── prisma/
│       └── schema.prisma      # Database schema
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Root + routing
│   │   ├── pages/             # Route pages
│   │   ├── components/
│   │   │   ├── atoms/         # Button, Input, Badge, Spinner
│   │   │   ├── molecules/     # FormField, Cards, Filters
│   │   │   └── organisms/     # Header, Navigation, Modals
│   │   ├── services/api.ts    # API client
│   │   ├── hooks/             # Custom hooks
│   │   └── stores/            # Zustand stores
│   └── vite.config.ts
└── docs/                      # Documentation
```

---

## 3. AUTHENTICATION

**Current Implementation:** Hardcoded test users (no database user table yet)

### Test Users
| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | admin |
| tech.lead | lead123 | tech_lead |
| developer | dev123 | developer |

### Auth Flow
1. POST `/api/auth/login` with `{username, password}`
2. Returns JWT token (24h expiry)
3. Frontend stores in `localStorage.auth_token`
4. All API calls include `Authorization: Bearer <token>`

### Files
- `backend/src/routes/auth.ts` - Login endpoint
- `backend/src/services/AuthService.ts` - JWT signing/verification
- `backend/src/config/users.ts` - Test user definitions

---

## 4. DATABASE SCHEMA

### Core Entities

#### Project
Top-level container for all project data.
```
Project {
  id, name, description, jiraProjectKey, settings, createdAt, updatedAt
  → specs[], specGroups[], templates[], preferences[], knowledge, glossary[],
    contextSources[], storyEdits[], learnedPatterns[], health
}
```

#### Spec
An uploaded specification document.
```
Spec {
  id, projectId, name, filePath, fileType, fileSize, extractedText
  status: uploaded | extracting | ready | translating | translated | error
  specType, uploadedBy, uploadedAt, metadata, errorMessage
  → sections[], workItems[]
}
```

#### WorkItem
Generated Epic, Feature, or Story.
```
WorkItem {
  id, specId, parentId (self-reference for hierarchy)
  type: epic | feature | story
  title, description, acceptanceCriteria, technicalNotes
  sizeEstimate: S | M | L | XL
  status: draft | ready_for_review | approved | exported
  orderIndex, jiraKey, templateId, customFields, dependsOnIds
  → parent, children[], sources[], history[], feedback[], edits[]
}
```

### Knowledge Base Entities

#### ProjectKnowledge
Project brief/overview (markdown).
```
ProjectKnowledge {
  id, projectId, brief, briefUpdatedAt
}
```

#### GlossaryTerm
Domain terminology for consistent AI output.
```
GlossaryTerm {
  id, projectId, term, definition, aliases[], category
  useInstead, avoidTerms[], isManual, confidence
}
```

#### TeamPreferencesConfig
AI generation preferences.
```
TeamPreferencesConfig {
  id, projectId
  acFormat: gherkin | bullets | checklist | numbered
  requiredSections[], maxAcCount, verbosity, technicalDepth, customPrefs
}
```

### Learning Loop Entities

#### StoryEdit
Tracks user edits to AI-generated content.
```
StoryEdit {
  id, projectId, workItemId
  field: title | description | acceptanceCriteria | technicalNotes | size | priority
  beforeValue, afterValue
  editType: addition | removal | modification | complete
  specId, userId, createdAt
}
```

#### LearnedPattern
Patterns detected from edits that become suggestions.
```
LearnedPattern {
  id, projectId, pattern, description, confidence, occurrences
  field, context, suggestion
  suggestionType: addToPreferences | addToGlossary | updateTemplate | addRequiredSection
  status: pending | suggested | accepted | dismissed | applied
}
```

#### ProjectHealth
Cached health score for project context completeness.
```
ProjectHealth {
  id, projectId, score (0-100)
  level: minimal | basic | good | excellent
  briefScore, glossaryScore, prefsScore, specsScore, sourcesScore, learningScore
  recommendations[]
}
```

### Other Entities
- **SpecSection** - Parsed sections from spec documents
- **WorkItemSource** - Links work items to source sections
- **WorkItemHistory** - Audit trail for changes
- **SpecGroup** - Multi-file upload grouping
- **SpecConflict** - Detected conflicts between specs
- **Export** - Jira export job tracking
- **BulkOperation** - Bulk edit with undo support
- **StoryTemplate** - Templates for story format
- **AIFeedback** - User ratings on AI output
- **ContextSource** - External context integrations
- **ContextChunk** - Searchable content chunks

---

## 5. API ENDPOINTS

### Authentication
```
POST /api/auth/login        - Login, returns JWT
GET  /api/auth/me           - Get current user (requires auth)
```

### Projects
```
GET    /api/projects                    - List all projects
POST   /api/projects                    - Create project
GET    /api/projects/:id                - Get project
PATCH  /api/projects/:id                - Update project
DELETE /api/projects/:id                - Delete project
```

### Specs
```
GET    /api/specs?projectId=            - List specs for project
POST   /api/specs                       - Upload spec (multipart)
GET    /api/specs/:id                   - Get spec details
DELETE /api/specs/:id                   - Delete spec
POST   /api/specs/:id/extract           - Trigger text extraction
POST   /api/specs/:id/translate         - Trigger AI translation
GET    /api/specs/:id/workitems         - Get work items tree
GET    /api/specs/:id/sections          - Get parsed sections
```

### Work Items
```
GET    /api/workitems?specId=           - List work items
PATCH  /api/workitems/:id               - Update work item
POST   /api/workitems/:id/approve       - Approve work item
POST   /api/workitems/:id/dependencies  - Add dependencies
DELETE /api/workitems/:id/dependencies  - Remove dependencies
```

### Knowledge Base
```
GET    /api/projects/:id/brief          - Get project brief
POST   /api/projects/:id/brief          - Create/update brief
GET    /api/projects/:id/glossary       - Get glossary terms
POST   /api/projects/:id/glossary       - Add term
PATCH  /api/projects/:id/glossary/:tid  - Update term
DELETE /api/projects/:id/glossary/:tid  - Delete term
GET    /api/projects/:id/preferences    - Get preferences config
POST   /api/projects/:id/preferences    - Update preferences
```

### Context & Learning
```
GET    /api/projects/:id/context-sources    - List sources
POST   /api/projects/:id/context-sources    - Add source
POST   /api/projects/:id/context/preview    - Preview context build
GET    /api/projects/:id/learning/patterns  - Get detected patterns
POST   /api/projects/:id/learning/edits     - Track an edit
POST   /api/projects/:id/learning/patterns/:pid/accept  - Accept pattern
POST   /api/projects/:id/learning/patterns/:pid/dismiss - Dismiss pattern
```

### Health
```
GET    /api/projects/:id/health             - Get health score
POST   /api/projects/:id/health/recalculate - Force recalculate
```

### Other
```
/api/bulk/*          - Bulk operations
/api/templates/*     - Story templates
/api/dependencies/*  - Dependency graph
/api/estimates/*     - Size estimates
/api/coverage/*      - Spec coverage analysis
/api/feedback/*      - AI feedback
/api/history/*       - Work item history
/api/jira/*          - Jira integration
/api/spec-groups/*   - Multi-file uploads
```

---

## 6. BACKEND SERVICES

### Core Services

**TranslationService** - AI-powered spec-to-work-items pipeline
- 4-pass translation: Epics → Features → Stories → Enhancement
- Uses Claude API via ClaudeService
- Creates hierarchical work items

**ExtractionService** - Document text extraction
- Supports PDF, DOCX, Markdown, YAML, JSON
- Parses into sections with headings

**ClaudeService** - Claude API wrapper
- Rate limiting, retries, error handling
- Prompt construction

### Knowledge Services

**KnowledgeService** - Brief, glossary, preferences CRUD
**ContextBuilder** - RAG-style context assembly
- Token budgeting (default 2000 tokens)
- Relevance scoring
- Priority: Brief (30%) > Sources (25%) > Glossary (20%) > Prefs (15%)

**LearningService** - Edit tracking and pattern detection
**HealthScoreService** - Project health calculation

### Other Services
- **DocumentService** - File storage
- **HistoryService** - Audit trail
- **DependencyService** - Work item dependencies
- **EstimationService** - Size estimates
- **CoverageService** - Spec coverage analysis
- **TemplateService** - Story templates
- **BulkOperationService** - Bulk edits with undo
- **JiraService** / **JiraExportService** - Jira integration

---

## 7. FRONTEND PAGES

| Page | Route | Purpose |
|------|-------|---------|
| Login | /login | Authentication |
| Projects | /projects | Project list, create/select |
| Dashboard | / | Spec list for selected project |
| Review | /review/:specId | Work item tree + editor |
| Templates | /templates | Story templates |
| Dependencies | /dependencies/:specId | Dependency graph |
| Coverage | /coverage/:specId | Spec coverage |
| Preferences | /preferences/:projectId | Team preferences |
| Knowledge Base | /knowledge | Brief, glossary, preferences |
| Group Status | /spec-groups/:groupId | Multi-file upload status |

### Key Components

**organisms/**
- Header - Top bar with logo
- Navigation - Sidebar nav
- WorkBreakdownTree - Hierarchical work items
- StoryEditor - Work item editing panel
- SpecCard - Spec card in dashboard
- ExportModal - Jira export
- QuestionnaireModal - Post-upload questions
- HealthScoreWidget - Context health display
- SetupWizard - Project onboarding

**molecules/**
- ProjectCard - Project in list
- SpecFilters - Search/filter controls
- TreeNode - Single tree item

**atoms/**
- Button, Input, Badge, Spinner, Checkbox

---

## 8. IMPLEMENTED FEATURES

### Wave 1: Foundation
- Project setup (monorepo, TypeScript, Prisma)
- Database schema
- Basic auth with JWT
- File upload
- Spec storage

### Wave 2: Core Pipeline
- Document extraction (PDF, DOCX, MD)
- Section parsing
- AI translation (4-pass pipeline)
- Work item hierarchy (Epic → Feature → Story)
- Review interface with tree view
- Story editor with fields
- Jira export
- Spec groups (multi-file)
- Templates
- Dependencies
- Estimates
- Coverage analysis
- Bulk operations

### Wave 3: Smart Context Engine
- **F11: User Session & Logout** - User menu, session management
- **F12: Project Management** - Full CRUD for projects
- **F13: Global Navigation** - Header, project switcher
- **F14: Knowledge Base** - Brief, glossary, preferences
- **F15: Context Sources** - External doc integration
- **F16: Smart Context Builder** - RAG-style context with token budget
- **F17: Learning Loop** - Edit tracking, pattern detection
- **F18: Setup Wizard & Health** - Onboarding, health score

---

## 9. CODE PATTERNS

### Backend Pattern: Deep Services, Thin Routes
```typescript
// Routes are thin - just request/response handling
fastify.get('/api/projects/:id/health', async (request, reply) => {
  const { projectId } = request.params;
  const health = await healthService.getHealth(projectId);
  return reply.send({ data: health });
});

// Services contain all business logic
class HealthScoreService {
  async calculateHealth(projectId: string): Promise<HealthResult> {
    // Complex logic here
  }
}
```

### Frontend Pattern: Hooks Before Returns
```typescript
// ALL hooks must be called before any conditional return
export function MyComponent() {
  // 1. All hooks first
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const data = useCallback(() => {}, []);

  useEffect(() => {
    // ...
  }, []);

  // 2. Conditional returns AFTER hooks
  if (loading) return <Spinner />;
  if (!data) return <Navigate to="/other" />;

  // 3. Rest of component
  return <div>...</div>;
}
```

### API Response Format
```typescript
// Success
{ data: T, meta?: { total, page, pageSize } }

// Error
{ error: { code: string, message: string, details?: object } }
```

### File Naming
- Components: PascalCase (`StoryEditor.tsx`)
- Hooks: camelCase with 'use' (`useProject.ts`)
- Services: PascalCase with 'Service' (`TranslationService.ts`)
- Routes: camelCase (`workitems.ts`)

---

## 10. DESIGN SYSTEM

### Colors (Toucan Labs)
```css
--toucan-orange: #FF6B35       /* Primary action */
--toucan-dark: #1A1A2E         /* Background */
--toucan-dark-lighter: #252542 /* Cards */
--toucan-dark-border: #3D3D5C  /* Borders */
--toucan-grey-100: #F5F5F7     /* Primary text */
--toucan-grey-400: #9999A5     /* Muted text */
--toucan-success: #4ADE80
--toucan-warning: #FBBF24
--toucan-error: #F87171
```

### Typography
- Primary: Inter
- Mono: JetBrains Mono

### Components
- Buttons: `btn btn-primary`, `btn btn-secondary`, `btn btn-ghost`
- Cards: `bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg`
- Inputs: `bg-toucan-dark border border-toucan-dark-border rounded-md`

---

## 11. ENVIRONMENT VARIABLES

```bash
# Required
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret"
ANTHROPIC_API_KEY="sk-..."

# Optional
PORT=3001
NODE_ENV=development
VITE_API_URL=/api
```

---

## 12. RUNNING THE PROJECT

```bash
# Install
npm install

# Database
cd backend && npx prisma db push && cd ..

# Development
npm run dev
# Frontend: http://localhost:3000
# Backend: http://localhost:3001

# Tests
npm test
```

---

## 13. CURRENT STATE

- All Wave 1-3 features implemented
- 99 tests passing
- Database: PostgreSQL on Supabase
- Auth: Test users only (no registration)
- Jira: Mock implementation (needs real OAuth)

### Known Issues
- No forgot password / registration flow
- No E2E tests for login flow

---

## 14. ADDING NEW FEATURES

### Checklist
1. Define database models in `prisma/schema.prisma`
2. Run `npx prisma db push` and `npx prisma generate`
3. Create service in `backend/src/services/`
4. Create routes in `backend/src/routes/`
5. Register routes in `backend/src/index.ts`
6. Add API client methods in `frontend/src/services/api.ts`
7. Create components/pages in frontend
8. Write tests

### Important Rules
- All hooks before conditional returns in React
- Services are deep, routes are thin
- Use existing atoms/molecules before creating new
- Follow Toucan design system colors
- No `any` types in TypeScript
