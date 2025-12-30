# Handoff AI Wave 3 - Overnight Build Instructions

## For Claude Code

You are building Wave 3 features for Handoff AI - a Smart Context Engine that makes AI translations intelligent and contextually aware.

## Build Order (Critical)

Execute features in this exact order - each depends on the previous:

```
1. Feature 11: User Session & Logout (2h)
2. Feature 12: Project Management (4h)
3. Feature 13: Global Navigation (2h)
4. Feature 14: Knowledge Base (6h)
5. Feature 15: Context Sources (6h)
6. Feature 16: Smart Context Builder (8h)
7. Feature 17: Learning Loop (6h)
8. Feature 18: Setup Wizard & Health (4h)
```

**Total: ~38 hours**

## Quick Start

```bash
# 1. Read all specs first
cat features/*.md

# 2. Run database migration
cd backend
npx prisma migrate dev --name wave3_smart_context

# 3. Build features in order
# Start with Feature 11...
```

## File Structure to Create

```
backend/src/
├── routes/
│   ├── projects.ts          # Update with description
│   ├── knowledge.ts         # NEW: Brief API
│   ├── glossary.ts          # NEW: Glossary API
│   ├── preferences.ts       # NEW: Team prefs API
│   ├── context-sources.ts   # NEW: Sources API
│   ├── learning.ts          # NEW: Patterns API
│   └── health.ts            # NEW: Health score API
├── services/
│   ├── ContextBuilder.ts    # NEW: Smart context
│   ├── EditTracker.ts       # NEW: Track edits
│   ├── PatternDetector.ts   # NEW: Find patterns
│   ├── HealthScoreService.ts # NEW: Calculate health
│   ├── SpecContextExtractor.ts # NEW: Extract from specs
│   └── DocumentProcessor.ts # NEW: Process docs

frontend/src/
├── pages/
│   ├── ProjectsPage.tsx     # NEW
│   └── ProjectSettingsPage.tsx # NEW
├── components/
│   ├── molecules/
│   │   ├── UserDropdown.tsx      # NEW
│   │   ├── ProjectCard.tsx       # NEW
│   │   ├── ProjectSelector.tsx   # NEW
│   │   ├── Breadcrumbs.tsx       # NEW
│   │   └── HealthScoreWidget.tsx # NEW
│   ├── organisms/
│   │   ├── Header.tsx            # UPDATE
│   │   ├── Navigation.tsx        # NEW
│   │   ├── ProjectBriefEditor.tsx # NEW
│   │   ├── GlossaryManager.tsx   # NEW
│   │   ├── PreferencesEditor.tsx # NEW
│   │   ├── ContextSourcesManager.tsx # NEW
│   │   ├── ContextPreview.tsx    # NEW
│   │   ├── LearningSuggestions.tsx # NEW
│   │   └── SetupWizard.tsx       # NEW
│   └── templates/
│       └── PageLayout.tsx        # NEW
└── hooks/
    ├── useAuth.ts               # NEW
    └── useProject.ts            # NEW
```

## Database Schema (Complete)

Add to `schema.prisma`:

```prisma
// ============= KNOWLEDGE BASE =============

model ProjectKnowledge {
  id          String   @id @default(uuid())
  projectId   String   @unique @map("project_id")
  brief       String?  @db.Text
  briefUpdatedAt DateTime? @map("brief_updated_at")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  @@map("project_knowledge")
}

model GlossaryTerm {
  id          String   @id @default(uuid())
  projectId   String   @map("project_id")
  term        String
  definition  String   @db.Text
  aliases     String[] @default([])
  category    String?
  useInstead  String?  @map("use_instead")
  avoidTerms  String[] @default([]) @map("avoid_terms")
  isManual    Boolean  @default(true) @map("is_manual")
  sourceSpecId String? @map("source_spec_id")
  confidence  Float?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  @@unique([projectId, term])
  @@index([projectId])
  @@map("glossary_terms")
}

model ReferenceDocument {
  id          String   @id @default(uuid())
  projectId   String   @map("project_id")
  name        String
  fileName    String   @map("file_name")
  filePath    String   @map("file_path")
  fileType    String   @map("file_type")
  fileSize    Int      @map("file_size")
  extractedText String? @db.Text @map("extracted_text")
  summary     String?  @db.Text
  docType     DocumentType @default(other) @map("doc_type")
  isActive    Boolean  @default(true) @map("is_active")
  uploadedAt  DateTime @default(now()) @map("uploaded_at")
  uploadedBy  String   @map("uploaded_by")
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  chunks      DocumentChunk[]
  @@index([projectId])
  @@map("reference_documents")
}

enum DocumentType {
  architecture
  process
  technical
  business
  other
}

model DocumentChunk {
  id          String   @id @default(uuid())
  documentId  String   @map("document_id")
  content     String   @db.Text
  chunkIndex  Int      @map("chunk_index")
  heading     String?
  summary     String?
  document    ReferenceDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  @@index([documentId])
  @@map("document_chunks")
}

model TeamPreferences {
  id          String   @id @default(uuid())
  projectId   String   @unique @map("project_id")
  acFormat    ACFormat @default(bullets) @map("ac_format")
  requiredSections String[] @default([]) @map("required_sections")
  maxAcCount  Int      @default(8) @map("max_ac_count")
  verbosity   Verbosity @default(balanced)
  technicalDepth TechnicalDepth @default(moderate) @map("technical_depth")
  customPrefs Json     @default("[]") @map("custom_prefs")
  updatedAt   DateTime @updatedAt @map("updated_at")
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  @@map("team_preferences")
}

enum ACFormat {
  gherkin
  bullets
  checklist
  numbered
}

enum Verbosity {
  concise
  balanced
  detailed
}

enum TechnicalDepth {
  high_level
  moderate
  implementation
}

// ============= CONTEXT SOURCES =============

model ContextSource {
  id          String   @id @default(uuid())
  projectId   String   @map("project_id")
  sourceType  ContextSourceType @map("source_type")
  name        String
  isEnabled   Boolean  @default(true) @map("is_enabled")
  config      Json     @default("{}")
  lastSyncAt  DateTime? @map("last_sync_at")
  lastError   String?  @map("last_error")
  itemCount   Int      @default(0) @map("item_count")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  @@index([projectId])
  @@map("context_sources")
}

enum ContextSourceType {
  specs
  jira
  document
  confluence
  github
}

model ContextChunk {
  id          String   @id @default(uuid())
  projectId   String   @map("project_id")
  sourceType  ContextSourceType @map("source_type")
  sourceId    String   @map("source_id")
  content     String   @db.Text
  summary     String?  @db.Text
  metadata    Json     @default("{}")
  heading     String?
  keywords    String[] @default([])
  createdAt   DateTime @default(now()) @map("created_at")
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  @@index([projectId])
  @@index([sourceType])
  @@map("context_chunks")
}

// ============= LEARNING LOOP =============

model StoryEdit {
  id          String   @id @default(uuid())
  projectId   String   @map("project_id")
  workItemId  String   @map("work_item_id")
  field       EditField
  beforeValue String   @db.Text @map("before_value")
  afterValue  String   @db.Text @map("after_value")
  editType    EditType @map("edit_type")
  specId      String   @map("spec_id")
  userId      String   @map("user_id")
  createdAt   DateTime @default(now()) @map("created_at")
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  workItem    WorkItem @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  @@index([projectId])
  @@map("story_edits")
}

enum EditField {
  title
  description
  acceptanceCriteria
  technicalNotes
  size
  priority
}

enum EditType {
  addition
  removal
  modification
  complete
}

model LearnedPattern {
  id          String   @id @default(uuid())
  projectId   String   @map("project_id")
  pattern     String   @db.Text
  description String   @db.Text
  confidence  Float
  occurrences Int      @default(1)
  field       EditField
  context     String?
  suggestion  String   @db.Text
  suggestionType SuggestionType @map("suggestion_type")
  status      PatternStatus @default(pending)
  reviewedAt  DateTime? @map("reviewed_at")
  reviewedBy  String?  @map("reviewed_by")
  appliedAt   DateTime? @map("applied_at")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  @@index([projectId])
  @@map("learned_patterns")
}

enum SuggestionType {
  addToPreferences
  addToGlossary
  updateTemplate
  addRequiredSection
}

enum PatternStatus {
  pending
  suggested
  accepted
  dismissed
  applied
}

// ============= HEALTH SCORE =============

model ProjectHealth {
  id          String   @id @default(uuid())
  projectId   String   @unique @map("project_id")
  score       Int
  level       HealthLevel
  briefScore  Int      @map("brief_score")
  glossaryScore Int    @map("glossary_score")
  prefsScore  Int      @map("prefs_score")
  specsScore  Int      @map("specs_score")
  sourcesScore Int     @map("sources_score")
  learningScore Int    @map("learning_score")
  recommendations Json @default("[]")
  calculatedAt DateTime @map("calculated_at")
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  @@map("project_health")
}

enum HealthLevel {
  minimal
  basic
  good
  excellent
}

// ============= UPDATE PROJECT MODEL =============
// Add these relations to existing Project model:

model Project {
  // ... existing fields ...
  description String? @db.Text
  
  knowledge       ProjectKnowledge?
  glossary        GlossaryTerm[]
  referenceDocuments ReferenceDocument[]
  teamPreferences TeamPreferences?
  contextSources  ContextSource[]
  contextChunks   ContextChunk[]
  storyEdits      StoryEdit[]
  learnedPatterns LearnedPattern[]
  projectHealth   ProjectHealth?
}

// Add to WorkItem model:
model WorkItem {
  // ... existing fields ...
  edits StoryEdit[]
}
```

## Critical Tasks Per Feature

### Feature 11: User Session (2h)
- [ ] Create `useAuth` hook with JWT decode
- [ ] Create `UserDropdown` component
- [ ] Add logout functionality (clear localStorage)
- [ ] Update Header to show user info

### Feature 12: Project Management (4h)
- [ ] Add `description` field to Project model
- [ ] Create project CRUD routes
- [ ] Create `ProjectsPage` with cards
- [ ] Create `ProjectSelector` dropdown
- [ ] Create `useProject` hook
- [ ] **CRITICAL**: Remove ALL hardcoded `default-project` references

### Feature 13: Navigation (2h)
- [ ] Create `Navigation` component with tabs
- [ ] Create `Breadcrumbs` component
- [ ] Create `PageLayout` template
- [ ] Update all pages to use PageLayout

### Feature 14: Knowledge Base (6h)
- [ ] Create knowledge/glossary/preferences models
- [ ] Create API routes for each
- [ ] Create `ProjectSettingsPage` with tabs
- [ ] Create `ProjectBriefEditor` with auto-save
- [ ] Create `GlossaryManager` with CRUD
- [ ] Create `PreferencesEditor`

### Feature 15: Context Sources (6h)
- [ ] Create context source models
- [ ] Create `SpecContextExtractor`
- [ ] Create `DocumentProcessor`
- [ ] Create `ContextSourcesManager` UI

### Feature 16: Smart Context Builder (8h)
- [ ] Create `ContextBuilder` service
- [ ] Implement spec analysis
- [ ] Implement token budget management
- [ ] Integrate with `TranslationService`
- [ ] Create `ContextPreview` component

### Feature 17: Learning Loop (6h)
- [ ] Create edit tracking models
- [ ] Create `EditTracker` service
- [ ] Create `PatternDetector` service
- [ ] Create `LearningSuggestions` component

### Feature 18: Setup Wizard (4h)
- [ ] Create `HealthScoreService`
- [ ] Create `SetupWizard` component
- [ ] Create `HealthScoreWidget`

## Verification Checklist

After each feature, verify:

### Feature 11
```
✓ Can see username in header
✓ Can click logout → redirected to /login
✓ localStorage cleared after logout
```

### Feature 12
```
✓ Can create new project
✓ Can switch between projects
✓ Selected project persists on refresh
✓ No "default-project" anywhere in code
```

### Feature 13
```
✓ Navigation visible on all pages
✓ Active tab highlighted
✓ Breadcrumbs show correct path
```

### Feature 14
```
✓ Can edit project brief
✓ Brief auto-saves
✓ Can add glossary terms
✓ Can set AC format preference
```

### Feature 15
```
✓ Translating spec creates context chunks
✓ Can see context sources list
```

### Feature 16
```
✓ Context preview shows before translation
✓ Token count under 2000
✓ Matching glossary terms included
```

### Feature 17
```
✓ Editing story creates StoryEdit record
✓ Patterns detected after multiple edits
✓ Accept → adds to preferences
```

### Feature 18
```
✓ New project → wizard appears
✓ Health score visible on dashboard
✓ Score increases when adding context
```

## Key Integration Points

### Translation Service Integration

```typescript
// In TranslationService.translateSpec()
const contextResult = await this.contextBuilder.buildContext(
  spec.projectId,
  spec.rawContent
);

const prompt = `
${contextResult.contextString}

---

${spec.rawContent}

---

Generate user stories...
`;
```

### Story Save Integration

```typescript
// After saving story
await editTracker.trackEdit(workItemId, field, oldValue, newValue, userId);
```

## Success Criteria

The Smart Context Engine is working when:

1. ✅ New project wizard guides users through setup
2. ✅ Health score shows 0% → increases as context added
3. ✅ Brief + Glossary visible in context preview
4. ✅ Translation quality improved with context
5. ✅ Learning suggestions appear after repeated edits
6. ✅ Accepted patterns appear in future translations

Good luck! 🚀
