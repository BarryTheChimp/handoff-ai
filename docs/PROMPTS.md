# Implementation Prompts

> Phase-by-phase prompts for Claude Code. Copy each prompt into a Claude Code session to build Handoff AI incrementally.

---

## How to Use This Document

1. Start each Claude Code session by saying: "Read CLAUDE.md first"
2. Then paste the specific prompt from this document
3. Let Claude Code implement according to the standards in CLAUDE.md
4. Verify acceptance criteria before moving to next prompt
5. Commit after each successful prompt

---

## Phase 1: Foundation

### Prompt 1.1: Project Scaffolding

```
Read CLAUDE.md first.

# Task: Set up the Handoff AI project structure

Create the monorepo with:
1. Root package.json with npm workspaces for backend/ and frontend/
2. Backend: Node.js + TypeScript + Fastify setup
3. Frontend: React + Vite + TypeScript + Tailwind setup
4. Docker Compose for PostgreSQL

Requirements:
- Backend runs on port 3001
- Frontend runs on port 3000  
- Tailwind uses the Toucan theme from CLAUDE.md
- TypeScript strict mode enabled
- ESLint + Prettier configured

Create these files:
- package.json (root workspace)
- backend/package.json
- backend/tsconfig.json
- backend/src/index.ts (hello world endpoint)
- frontend/package.json  
- frontend/vite.config.ts
- frontend/tailwind.config.js (with Toucan colours)
- frontend/tsconfig.json
- frontend/src/main.tsx
- frontend/src/App.tsx
- frontend/index.html
- docker-compose.yml (PostgreSQL only)

Acceptance Criteria:
- [ ] npm install works from root
- [ ] npm run dev starts both services
- [ ] GET http://localhost:3001/ returns { status: 'ok' }
- [ ] http://localhost:3000 shows React app
- [ ] Tailwind colours work (test with bg-toucan-orange)
```

---

### Prompt 1.2: Database Schema

```
Read CLAUDE.md first.

# Task: Set up Prisma and database schema

Based on docs/SPEC.md section 6 (Data Model), create:

1. Install Prisma in backend
2. Create prisma/schema.prisma with all entities:
   - Project
   - Spec (with spec_type field for extensibility)
   - SpecSection
   - WorkItem (self-referencing for parent)
   - WorkItemSource (junction table)
   - WorkItemHistory
3. Define all enums (SpecStatus, WorkItemType, etc.)
4. Set up relations correctly

Then:
- Create initial migration
- Generate Prisma client

Acceptance Criteria:
- [ ] npx prisma migrate dev succeeds
- [ ] All tables created in PostgreSQL
- [ ] Self-referencing parent_id works
- [ ] Prisma client generates with types
- [ ] Can connect to DB from backend code
```

---

### Prompt 1.3: Authentication

```
Read CLAUDE.md first.

# Task: Implement JWT authentication

Create simple auth for internal use:

1. Install @fastify/jwt
2. Create auth service with:
   - users stored in config (3 test users)
   - login(username, password) → JWT
   - validateToken(token) → user
3. Create auth routes:
   - POST /api/auth/login
   - GET /api/auth/me
4. Create auth middleware for protected routes
5. JWT expires in 24 hours

Test users (in config):
- admin / admin123
- tech.lead / lead123  
- developer / dev123

Acceptance Criteria:
- [ ] POST /api/auth/login returns token
- [ ] Invalid credentials return 401
- [ ] GET /api/auth/me returns user with valid token
- [ ] Protected route returns 401 without token
- [ ] Token contains user info (id, username, role)
```

---

## Phase 2: Document Processing

### Prompt 2.1: File Upload

```
Read CLAUDE.md first.

# Task: Implement file upload endpoint

Create DocumentService and upload route:

1. POST /api/specs endpoint (multipart/form-data)
   - file: binary
   - projectId: string
   - specType: string (default: 'api-spec')
   
2. Validation:
   - Accept: .pdf, .docx, .yaml, .json
   - Max size: 50MB (10MB for yaml/json)
   - Reject others with 400
   
3. Storage:
   - Store in ./uploads/{specId}/{filename}
   - Abstract behind StorageService interface
   
4. Database:
   - Create Spec record with status 'uploaded'
   - Return spec ID

Response format per API conventions in CLAUDE.md.

Acceptance Criteria:
- [ ] Uploads PDF successfully
- [ ] Uploads DOCX successfully
- [ ] Uploads YAML/JSON successfully
- [ ] Rejects .exe with 400
- [ ] Rejects >50MB with 400
- [ ] Creates Spec record in DB
- [ ] File saved to disk
- [ ] Returns spec ID
```

---

### Prompt 2.2: Text Extraction

```
Read CLAUDE.md first.

# Task: Extract text from uploaded documents

Extend DocumentService:

1. Install pdf-parse, mammoth, yaml
2. Create extractContent(specId) method:
   - Load file from storage
   - Extract text based on file type
   - Identify sections (headings, numbered items)
   - Store extracted_text in Spec
   - Create SpecSection records
   - Update status to 'ready'

3. Section identification:
   - PDF: numbered headings (1., 1.1, etc.)
   - DOCX: heading styles
   - YAML/JSON: top-level keys

4. POST /api/specs/:id/extract endpoint:
   - Triggers async extraction
   - Returns 202 Accepted
   - Updates status throughout

Acceptance Criteria:
- [ ] Extracts text from PDF with structure
- [ ] Extracts text from DOCX with headings
- [ ] Parses YAML/JSON correctly
- [ ] Creates SpecSection records
- [ ] Updates spec status
- [ ] Handles errors gracefully
```

---

## Phase 3: AI Translation

### Prompt 3.1: Claude Integration

```
Read CLAUDE.md first.

# Task: Set up Claude API integration

Create:

1. ClaudeService:
   - complete(prompt, options) → string
   - completeJSON<T>(prompt, options) → T
   - Retry logic (3x with backoff)
   - Error handling
   - Logging (prompt + response)

2. PromptService:
   - loadPrompt(specType, passName) → template
   - renderPrompt(template, variables) → string
   - Prompts stored in backend/src/prompts/

3. Create prompt templates for api-spec:
   - structure.txt (Pass 1)
   - epics.txt (Pass 2)
   - stories.txt (Pass 3)
   - enrichment.txt (Pass 4)

Use claude-sonnet-4-20250514, temperature 0.2, JSON mode.

Acceptance Criteria:
- [ ] ClaudeService connects to API
- [ ] Returns valid JSON in JSON mode
- [ ] Retries on timeout
- [ ] Prompts load from files
- [ ] Variables substitute correctly
- [ ] Errors logged with context
```

---

### Prompt 3.2: Translation Pipeline

```
Read CLAUDE.md first.

# Task: Implement 4-pass translation

Create TranslationService.translate(specId):

Pass 1 - Structure:
- Analyse document structure
- Identify main themes, entities, capabilities
- Output: analysis JSON

Pass 2 - Epics:
- Generate 1-5 epics based on analysis
- Include title, description, scope, spec sections
- Output: epics array

Pass 3 - Features/Stories:
- For each epic, generate features and stories
- Stories include: title, description, AC (Given/When/Then), technical notes, size
- Output: features with nested stories

Pass 4 - Enrichment:
- Add dependencies between stories
- Check coverage (all spec sections mapped?)
- Flag issues (XL stories, missing AC)
- Output: dependencies, gaps, warnings

Store all WorkItems with:
- Correct parent-child relationships
- Links to SpecSections
- Status 'draft'

POST /api/specs/:id/translate:
- Returns 202 immediately
- Processes async
- Updates spec status

Acceptance Criteria:
- [ ] All 4 passes execute
- [ ] WorkItems created with hierarchy
- [ ] Parent-child links correct
- [ ] Source sections linked
- [ ] Completes in <5 min
- [ ] Status updates correctly
```

---

## Phase 4: Review Interface

### Prompt 4.1: Tree Component

```
Read CLAUDE.md first.

# Task: Build the work breakdown tree view

Create frontend components following Atomic Design:

atoms/Icon.tsx - Icon component (use lucide-react)
atoms/Badge.tsx - Status badge with colours
molecules/TreeNode.tsx - Single tree node
organisms/WorkBreakdownTree.tsx - Full tree

TreeNode features:
- Expand/collapse with chevron
- Type icon (folder for epic, file for story)
- Title text
- Status badge
- Indentation based on depth
- Selection highlight (toucan-orange)
- Drag handle (visual only for now)

WorkBreakdownTree features:
- Renders nested WorkItems
- Tracks expanded nodes
- Tracks selected node
- Keyboard navigation (up/down arrows)

Create Zustand store (stores/treeStore.ts):
- items: WorkItem[]
- expandedIds: Set<string>
- selectedId: string | null
- toggleExpand, setSelected actions

Style per CLAUDE.md design system.

Acceptance Criteria:
- [ ] Tree renders 3-level hierarchy
- [ ] Click expands/collapses
- [ ] Click selects (orange highlight)
- [ ] Keyboard navigation works
- [ ] Correct visual hierarchy
- [ ] Smooth animations
```

---

### Prompt 4.2: Story Editor

```
Read CLAUDE.md first.

# Task: Build the story editor panel

Create components:

molecules/EditableText.tsx:
- Click to edit inline
- Blur or Enter to save
- Escape to cancel
- Shows unsaved indicator

molecules/MarkdownPreview.tsx:
- Toggle between edit/preview
- Renders markdown

molecules/SizeSelector.tsx:
- S/M/L/XL buttons
- Active state styling

organisms/StoryEditor.tsx:
- All WorkItem fields
- Title (EditableText)
- Type and Status (dropdowns)
- Size (SizeSelector)
- Description (MarkdownPreview)
- Acceptance Criteria (MarkdownPreview)
- Technical Notes (MarkdownPreview)
- Source References (list with links)

Auto-save:
- Debounce 2 seconds
- Show "Saving..." indicator
- Show "Saved ✓" confirmation
- PATCH /api/workitems/:id

Create stores/editorStore.ts:
- currentItem: WorkItem
- isDirty: boolean
- isSaving: boolean
- setField, save actions

Acceptance Criteria:
- [ ] All fields render
- [ ] Inline editing works
- [ ] Auto-saves after 2s
- [ ] Shows save status
- [ ] Markdown preview toggles
- [ ] Source refs clickable
```

---

### Prompt 4.3: Review Layout

```
Read CLAUDE.md first.

# Task: Build the split-pane review layout

Create:

templates/ReviewLayout.tsx:
- Header with spec name and actions
- Resizable split pane (tree | content)
- Footer with action buttons

organisms/ReviewHeader.tsx:
- Spec name and status
- Back button
- Export button

organisms/ReviewFooter.tsx:
- Add Story button
- Save All button
- Export to Jira button

organisms/SpecViewer.tsx:
- Tab alongside editor
- Renders extracted spec text
- Highlights section when story selected
- Click section → show linked stories

pages/ReviewPage.tsx:
- Fetches spec and workitems on mount
- Manages tab state (Editor/Spec Viewer)
- Connects tree selection to editor

Use react-split-pane or similar.
Store layout preferences in localStorage.

Acceptance Criteria:
- [ ] Split pane resizable
- [ ] Minimum widths enforced
- [ ] Tab switching works
- [ ] Selection syncs tree ↔ editor
- [ ] Spec viewer shows content
- [ ] Selected story highlights source
- [ ] Layout persists on refresh
```

---

## Phase 5: Advanced Editing

### Prompt 5.1: Drag and Drop

```
Read CLAUDE.md first.

# Task: Add drag-drop reordering and reparenting

Install @dnd-kit/core.

Update WorkBreakdownTree:
- Drag handle on each node
- Drag to reorder within same parent
- Drag to different parent to reparent

Rules:
- Stories can move between features
- Features can move between epics
- Epics can only reorder (no parent)
- Can't drop story directly under epic

Visual feedback:
- Dragging item semi-transparent
- Valid drop zones highlighted
- Invalid zones show red border
- Insertion line between items

API:
POST /api/workitems/:id/move
{ "newParentId": "uuid", "newOrderIndex": 3 }

Use optimistic updates (instant UI, async save).

Acceptance Criteria:
- [ ] Drag handle visible on hover
- [ ] Item follows cursor
- [ ] Valid drops highlighted
- [ ] Invalid drops rejected
- [ ] Order persists
- [ ] Parent changes persist
- [ ] Optimistic update works
```

---

### Prompt 5.2: Split and Merge

```
Read CLAUDE.md first.

# Task: Implement story split and merge

Split flow:
1. User clicks Split on story
2. Modal: "Split into how many?" (2-5)
3. AI suggests division of AC
4. User adjusts
5. Confirm creates new stories, deletes original

Merge flow:
1. User multi-selects stories (checkboxes)
2. Click Merge
3. AI combines content
4. User reviews
5. Confirm creates merged story, deletes originals

API:
POST /api/workitems/:id/split
{ "count": 2, "suggestedTitles": ["Part 1", "Part 2"] }

POST /api/workitems/merge
{ "itemIds": ["id1", "id2"], "mergedTitle": "Combined" }

Create:
- organisms/SplitModal.tsx
- organisms/MergeModal.tsx
- Backend split/merge logic with AI assistance

Preserve source references on resulting items.

Acceptance Criteria:
- [ ] Split modal with count selector
- [ ] AI suggestion appears
- [ ] User can edit before confirm
- [ ] Split creates correct stories
- [ ] Merge checkboxes work
- [ ] Merge combines sensibly
- [ ] Source refs preserved
```

---

### Prompt 5.3: Undo/Redo

```
Read CLAUDE.md first.

# Task: Implement undo/redo for all edits

Track changes:
- Store in WorkItemHistory table
- In-memory stack for current session
- Max 50 items per work item

HistoryService:
- recordChange(itemId, field, oldValue, newValue)
- undo() → applies previous value
- redo() → re-applies undone value
- canUndo(), canRedo()

UI:
- Undo/Redo buttons in ReviewHeader
- Keyboard: Ctrl+Z, Ctrl+Y
- Toast notification on action

Create:
- backend/src/services/HistoryService.ts
- frontend stores/historyStore.ts
- Update editorStore to record changes

Acceptance Criteria:
- [ ] All edits recorded
- [ ] Ctrl+Z undoes last change
- [ ] Ctrl+Y redoes
- [ ] Buttons work
- [ ] Buttons disabled when empty
- [ ] History survives refresh
- [ ] Max 50 limit enforced
```

---

## Phase 6: Jira Export

### Prompt 6.1: Jira OAuth

```
Read CLAUDE.md first.

# Task: Implement Jira Cloud OAuth

Create JiraService:
- OAuth 2.0 flow with Atlassian
- Store tokens encrypted in DB
- Auto-refresh before expiry

Routes:
GET /api/jira/auth - Returns Atlassian auth URL
GET /api/jira/callback - Handles OAuth callback
GET /api/jira/status - Returns connection status
DELETE /api/jira/disconnect - Removes tokens

Store JiraConnection model:
- userId
- accessToken (encrypted)
- refreshToken (encrypted)
- expiresAt
- cloudId

Use crypto module for encryption.

Acceptance Criteria:
- [ ] OAuth flow completes
- [ ] Tokens stored encrypted
- [ ] Status shows connected/disconnected
- [ ] Token refresh works
- [ ] Disconnect removes data
```

---

### Prompt 6.2: Export Logic

```
Read CLAUDE.md first.

# Task: Export work items to Jira

JiraService.export(specId, projectKey, dryRun):

1. Load all WorkItems for spec
2. Map to Jira format:
   - title → summary
   - description + AC + notes → description (ADF)
   - type → issuetype
   - size → labels

3. Create in order:
   - All Epics first
   - Features with Epic links
   - Stories with Feature links

4. Handle rate limits:
   - Max 100/min
   - Exponential backoff on 429
   - Progress callback for UI

5. Update WorkItems with jira_key

API:
POST /api/specs/:id/export
{ "jiraProjectKey": "PROJ", "dryRun": false }

Response 202: { "exportId": "uuid" }

GET /api/exports/:id - Progress and results

Support dry-run mode (no creation, just preview).

Acceptance Criteria:
- [ ] Dry run shows preview
- [ ] Epics created correctly
- [ ] Hierarchy links correct
- [ ] Jira keys saved
- [ ] Rate limits handled
- [ ] Progress visible
- [ ] Partial failure allows retry
```

---

## Phase 7: Polish

### Prompt 7.1: Dashboard

```
Read CLAUDE.md first.

# Task: Build the dashboard page

Create:

pages/DashboardPage.tsx:
- List all specs for project
- Filter by status
- Search by name
- Upload button

organisms/SpecCard.tsx:
- File icon by type
- Name and status badge
- Stats (epic/feature/story counts)
- "Uploaded X ago"
- Action buttons (View, Export, Delete)

molecules/SpecFilters.tsx:
- Status dropdown
- Search input

organisms/EmptyState.tsx:
- Shown when no specs
- "Upload your first spec" CTA

Features:
- Real-time status updates (poll or websocket)
- Delete with confirmation modal
- Click card → ReviewPage

Acceptance Criteria:
- [ ] Shows all specs
- [ ] Status updates live
- [ ] Stats accurate
- [ ] Filter works
- [ ] Search works
- [ ] Delete with confirm
- [ ] Empty state shows
```

---

### Prompt 7.2: Questionnaire

```
Read CLAUDE.md first.

# Task: Pre-translation questionnaire

Create modal shown after upload:

organisms/QuestionnaireModal.tsx:
1. Document type: API Spec | Requirements | Design | Other
2. Structure: Epic→Feature→Story | Epic→Story
3. Story size preference: Small | Medium | Large
4. AC format: Given/When/Then | Bullets | Checklist
5. Technical notes: [x] API schemas [x] DB changes [x] Dependencies

Store answers in spec.metadata JSON.
Use answers in translation prompts.

Features:
- Defaults pre-selected
- Skip uses all defaults
- Remember per project

Update TranslationService to read answers and customize prompts.

Acceptance Criteria:
- [ ] Modal after upload
- [ ] All questions render
- [ ] Defaults selected
- [ ] Answers saved to metadata
- [ ] Skip works
- [ ] Prompts use answers
```

---

## Phase 8: Testing & Launch

### Prompt 8.1: Test Suite

```
Read CLAUDE.md first.

# Task: Comprehensive test suite

Set up:
- Vitest for unit/integration
- Playwright for E2E

Unit tests (70%):
- TranslationService (prompt construction, parsing)
- DocumentService (extraction logic)
- All utility functions
- React components (isolated)

Integration tests (20%):
- All API endpoints
- Database operations
- Mock Claude responses

E2E tests (10%):
- Critical path: Upload → Translate → Edit → Export
- Auth flow
- Error recovery

Test data:
- Sample PDF (3 pages)
- Sample YAML OpenAPI
- Claude response fixtures

Coverage targets:
- 80% for services
- 60% for components
- All endpoints tested

Acceptance Criteria:
- [ ] npm test runs all tests
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E completes
- [ ] Coverage report generated
```

---

### Prompt 8.2: Production Build

```
Read CLAUDE.md first.

# Task: Production deployment setup

Create:

Docker:
- backend.Dockerfile (Node.js production)
- frontend.Dockerfile (nginx + built React)
- docker-compose.prod.yml

Build scripts:
- npm run build (both)
- npm run start (production)

Environment:
- Validate required env vars on startup
- Graceful degradation for optional features

Documentation:
- Update README with deployment steps
- Document all environment variables

Health checks:
- GET /api/health - backend status
- Database connectivity check

Acceptance Criteria:
- [ ] Docker build succeeds
- [ ] docker-compose up works
- [ ] App accessible at localhost
- [ ] Health check passes
- [ ] Env validation works
- [ ] README complete
```

---

## Prompt Checklist

Use this to track progress:

- [ ] 1.1 Project Scaffolding
- [ ] 1.2 Database Schema
- [ ] 1.3 Authentication
- [ ] 2.1 File Upload
- [ ] 2.2 Text Extraction
- [ ] 3.1 Claude Integration
- [ ] 3.2 Translation Pipeline
- [ ] 4.1 Tree Component
- [ ] 4.2 Story Editor
- [ ] 4.3 Review Layout
- [ ] 5.1 Drag and Drop
- [ ] 5.2 Split and Merge
- [ ] 5.3 Undo/Redo
- [ ] 6.1 Jira OAuth
- [ ] 6.2 Export Logic
- [ ] 7.1 Dashboard
- [ ] 7.2 Questionnaire
- [ ] 8.1 Test Suite
- [ ] 8.2 Production Build

---

*Estimated total: 40-50 hours of Claude Code time*
