# Handoff AI: Wave 2 Features - Overnight Build Specification

> **Purpose**: Complete implementation-ready specs for 10 features. Feed to Claude Code for autonomous overnight builds.
>
> **Estimated Time**: 8-12 hours
>
> **Prerequisites**: Wave 1 complete (upload, translation, tree view, split/merge, Jira export)

---

## Codebase Context

**Read CLAUDE.md first** - it contains all project conventions.

### Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind, Zustand
- **Backend**: Node.js 20, Fastify, Prisma, PostgreSQL
- **AI**: Claude API (Haiku for analysis, Sonnet for generation)

### Existing Key Files

**Backend** (`backend/src/`):
- `services/TranslationService.ts` - 4-pass AI pipeline
- `services/ClaudeService.ts` - Claude API wrapper
- `routes/specs.ts` - Upload, extract, translate
- `routes/workitems.ts` - CRUD, move, split, merge

**Frontend** (`frontend/src/`):
- `components/organisms/WorkBreakdownTree.tsx` - Tree view
- `components/organisms/StoryEditor.tsx` - Edit work items
- `stores/treeStore.ts` - Tree state
- `services/api.ts` - API client

### Current Schema (key models)
- `Project` → `Spec` → `SpecSection`
- `WorkItem` (Epic/Feature/Story with self-referencing hierarchy)
- `WorkItemSource` (links work items to spec sections)
- `WorkItemHistory` (audit trail)
- `JiraConnection`, `Export`

---

## Build Order

| # | Feature | Time | Complexity |
|---|---------|------|------------|
| 1 | Multi-File Upload | 90 min | Medium |
| 2 | Bulk Editing | 60 min | Medium |
| 3 | Custom Templates | 75 min | Medium |
| 4 | Dependency Graph | 90 min | Medium |
| 5 | Estimation Helper | 60 min | Medium |
| 6 | Coverage Dashboard | 45 min | Low |
| 7 | AI Refinement Loop | 90 min | Medium |

Build 1-7 first. Features 8-10 (Versioning, Collaboration, Bi-directional Sync) are high complexity and have dependencies.

---

# FEATURE 1: Multi-File Upload & Stitching

## Overview
Upload multiple spec files at once. AI detects conflicts between documents, user resolves them, AI creates unified context for translation.

## Schema Changes

```prisma
// Add to schema.prisma

enum SpecGroupStatus {
  pending
  analyzing
  conflicts_detected
  ready
  error
}

model SpecGroup {
  id              String          @id @default(uuid())
  projectId       String          @map("project_id")
  name            String
  stitchedContext String?         @db.Text @map("stitched_context")
  status          SpecGroupStatus @default(pending)
  createdAt       DateTime        @default(now()) @map("created_at")
  
  project         Project         @relation(fields: [projectId], references: [id], onDelete: Cascade)
  specs           Spec[]
  conflicts       SpecConflict[]
  
  @@index([projectId])
  @@map("spec_groups")
}

model SpecConflict {
  id            String     @id @default(uuid())
  specGroupId   String     @map("spec_group_id")
  spec1Id       String     @map("spec1_id")
  spec1Section  String     @map("spec1_section")
  spec2Id       String     @map("spec2_id")
  spec2Section  String     @map("spec2_section")
  conflictType  String
  description   String     @db.Text
  resolution    String?
  resolvedAt    DateTime?  @map("resolved_at")
  
  specGroup     SpecGroup  @relation(fields: [specGroupId], references: [id], onDelete: Cascade)
  
  @@map("spec_conflicts")
}

// Modify existing Spec model - add:
  specGroupId   String?    @map("spec_group_id")
  specGroup     SpecGroup? @relation(fields: [specGroupId], references: [id])

// Modify existing Project model - add:
  specGroups    SpecGroup[]
```

## API Endpoints

```
POST /api/projects/:projectId/specs/batch  → 202 { specGroupId, statusUrl }
GET  /api/spec-groups/:id                  → group with specs and conflicts
POST /api/spec-groups/:id/resolve          → resolve conflicts
POST /api/spec-groups/:id/translate        → translate with unified context
```

## Files to Create

1. `backend/src/services/SpecGroupService.ts`
2. `backend/src/routes/specGroups.ts`
3. `frontend/src/components/organisms/BatchUploadDropzone.tsx`
4. `frontend/src/components/organisms/ConflictResolutionPanel.tsx`

## Implementation Prompt

```
Read CLAUDE.md first.

# Feature 1: Multi-File Upload

1. Create migration adding SpecGroup, SpecConflict, and specGroupId to Spec
2. Create SpecGroupService with:
   - createGroup(projectId, name, specIds)
   - analyzeConflicts(groupId) - uses Claude Haiku
   - resolveConflicts(groupId, resolutions)
   - generateStitchedContext(groupId) - uses Claude Sonnet
3. Create routes in specGroups.ts
4. Register routes in index.ts
5. Create frontend components for batch upload flow
6. Add "Batch Upload" option to DashboardPage

Test: Upload 2 files, see conflicts, resolve, get stitched context
```

---

# FEATURE 2: Bulk Editing

## Overview
Select multiple work items, apply changes to all. Includes AI enhancement per item.

## Schema Changes

```prisma
model BulkOperation {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  operation       String
  itemIds         String[] @map("item_ids")
  payload         Json
  previousValues  Json     @map("previous_values")
  createdAt       DateTime @default(now()) @map("created_at")
  
  @@index([userId])
  @@map("bulk_operations")
}
```

## API Endpoints

```
POST /api/workitems/bulk           → { itemIds, operation, payload }
POST /api/workitems/bulk/ai-enhance → { itemIds, enhancement, context }
POST /api/workitems/bulk/undo      → { undoToken }
```

## Files to Create

1. `backend/src/services/BulkOperationService.ts`
2. `backend/src/routes/bulk.ts`
3. `frontend/src/stores/selectionStore.ts`
4. `frontend/src/components/organisms/BulkActionBar.tsx`

## Implementation Prompt

```
Read CLAUDE.md first.

# Feature 2: Bulk Editing

1. Add BulkOperation to schema, run migration
2. Create BulkOperationService:
   - updateFields(itemIds, changes, userId) - stores undo data
   - aiEnhance(itemIds, enhancement, context, userId) - unique per item
   - undo(undoToken)
3. Create bulk.ts routes
4. Create selectionStore with toggle, range select, select all
5. Create BulkActionBar (floating bar when selection > 0)
6. Add checkboxes to TreeNode, shift+click for range

Test: Select 3 items, set size M, undo, verify all reverted
```

---

# FEATURE 3: Custom Templates

## Overview
Team-specific story templates with AC formats and custom fields.

## Schema Changes

```prisma
model StoryTemplate {
  id              String   @id @default(uuid())
  projectId       String   @map("project_id")
  name            String
  isDefault       Boolean  @default(false) @map("is_default")
  acFormat        String   @default("bullets") @map("ac_format")
  requiredSections String[] @map("required_sections")
  customFields    Json     @default("[]") @map("custom_fields")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  project         Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@unique([projectId, name])
  @@map("story_templates")
}

// Add to WorkItem:
  templateId      String?  @map("template_id")
  customFields    Json     @default("{}") @map("custom_fields")

// Add to Project:
  templates       StoryTemplate[]
```

## Implementation Prompt

```
Read CLAUDE.md first.

# Feature 3: Custom Templates

1. Add StoryTemplate, modify WorkItem and Project
2. Create TemplateService (CRUD, set default)
3. Create templates.ts routes
4. Create TemplateBuilder component
5. Modify TranslationService to use template when generating
6. Show custom fields in StoryEditor

Test: Create Gherkin template, translate spec, verify AC format
```

---

# FEATURE 4: Dependency Visualization

## Overview
D3.js graph showing work item dependencies with critical path.

## Schema Changes

```prisma
// Add to WorkItem:
  dependsOnIds    String[] @map("depends_on_ids")
```

## Implementation Prompt

```
Read CLAUDE.md first.

# Feature 4: Dependency Graph

1. Add dependsOnIds to WorkItem
2. Create DependencyService:
   - getDependencyGraph(specId) → nodes, edges, critical path
   - Critical path: topological sort + longest path DP
   - Detect circular dependencies
3. Create dependencies.ts route
4. Create DependencyGraph component with D3.js force layout
5. Add to ReviewPage as tab

Test: Add dependencies between stories, view graph, verify critical path
```

---

# FEATURE 5: Estimation Helper

## Overview
AI suggests T-shirt sizes with confidence and rationale.

## Implementation Prompt

```
Read CLAUDE.md first.

# Feature 5: Estimation Helper

1. Create EstimationService:
   - estimate(workItemId) → { size, confidence, rationale }
   - estimateAll(specId) → batch estimates
   - Use Haiku for cost efficiency
2. Create estimates.ts routes
3. Create EstimationBadge (shows size + confidence)
4. Add "Estimate" button to StoryEditor
5. Add "Estimate All" to spec actions

Test: Estimate single story, verify rationale makes sense
```

---

# FEATURE 6: Coverage Dashboard

## Overview
Visual report of spec section coverage.

## Implementation Prompt

```
Read CLAUDE.md first.

# Feature 6: Coverage Dashboard

1. Create CoverageService:
   - getCoverage(specId) → sections with story counts
2. Create coverage.ts route
3. Create CoverageHeatmap component
4. Create CoveragePage
5. Link from spec card

Test: View coverage for translated spec, identify gaps
```

---

# FEATURE 7: AI Refinement Loop

## Overview
Feedback on generated stories to train team preferences.

## Schema Changes

```prisma
model AIFeedback {
  id          String   @id @default(uuid())
  workItemId  String   @map("work_item_id")
  userId      String   @map("user_id")
  rating      Int
  feedback    String?  @db.Text
  createdAt   DateTime @default(now()) @map("created_at")
  
  @@map("ai_feedback")
}

model TeamPreference {
  id          String   @id @default(uuid())
  projectId   String   @map("project_id")
  preference  String   @db.Text
  learnedFrom String[] @map("learned_from")
  active      Boolean  @default(true)
  createdAt   DateTime @default(now()) @map("created_at")
  
  @@map("team_preferences")
}
```

## Implementation Prompt

```
Read CLAUDE.md first.

# Feature 7: AI Refinement Loop

1. Add AIFeedback and TeamPreference models
2. Create FeedbackService:
   - submitFeedback(workItemId, rating, feedback)
   - extractPreferences() - analyze feedback patterns
3. Create feedback.ts routes
4. Create FeedbackButtons component (thumbs up/down)
5. Modify TranslationService to include preferences in prompt
6. Create PreferencesPanel for viewing/managing

Test: Give negative feedback, verify preference learned
```

---

# OVERNIGHT EXECUTION INSTRUCTIONS

```
Read CLAUDE.md completely first.

For each feature 1-7:
1. Create Prisma migration
2. Run: cd backend && npx prisma migrate dev
3. Create backend service
4. Create backend route  
5. Register in index.ts
6. Create frontend components
7. Integrate into pages
8. Commit: git add -A && git commit -m "feat: [name]"

On errors:
- Read message carefully
- Check similar working code
- Follow CLAUDE.md patterns
- Fix and continue

When done, summarize what was built.
```

## Quick Reference

### Register Route
```typescript
// index.ts
import { myRoutes } from './routes/myRoute.js';
await app.register(myRoutes);
```

### Service Pattern
```typescript
export function createMyService(): MyService {
  return {
    async doThing() { /* ... */ }
  };
}
```

### Use Claude
```typescript
const claude = getClaudeService();
const result = await claude.completeJSON<MyType>(prompt, {
  model: 'haiku', // or 'sonnet'
  temperature: 0.1
});
```

---

*Feed this document to Claude Code for autonomous overnight implementation.*
