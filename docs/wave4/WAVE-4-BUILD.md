# Wave 4 Build Instructions

> **Overnight Build Prompt for Claude Code**

This document contains the prompts for executing Wave 4 features using Claude Code overnight sessions.

---

## Pre-Build Checklist

Before starting any build session:

1. **Pull latest code:** `git pull origin main`
2. **Install dependencies:** `npm install` in both `/backend` and `/frontend`
3. **Check database:** `npx prisma migrate status`
4. **Verify dev server:** `npm run dev` works
5. **Create branch:** `git checkout -b wave-4-session-X`

---

## Session 1: Fixes & Foundation (10 hours)

### Features: F19, F20, F21, F22, F23

**Paste this prompt into Claude Code:**

```
I need you to implement Wave 4 Session 1 features for Handoff AI. This is a monorepo with /backend (Fastify, Prisma, PostgreSQL) and /frontend (React, Vite, Zustand, Tailwind).

## Context
- This is an existing codebase with Wave 1-3 already implemented
- Use existing patterns: deep modules, thin routes, Toucan color scheme (#FF6B35 orange, #1A1A2E dark)
- ALL HOOKS BEFORE CONDITIONAL RETURNS in React components
- Named exports only, no default exports
- Responses use { data: T } format

## Features to Implement

### F19: PDF/DOCX Upload Fix
1. Update ExtractionService to properly handle PDF extraction errors
2. Add detection for encrypted PDFs (show clear error message)
3. Add detection for image-only PDFs (show clear error message)
4. Add DOCX extraction using mammoth with markdown output
5. Add preview endpoint: GET /api/specs/:id/preview
6. Add SpecPreviewModal component for viewing original files
7. Add errorMessage field to Spec model

### F20: Sync Feedback & Progress
1. Create /frontend/src/stores/loadingStore.ts (Zustand store for operation states)
2. Create useLoading hook for components
3. Create ProgressBar atom component
4. Create SyncButton molecule with spinner and status
5. Create TranslateProgress molecule showing phases
6. Update context source sync to show progress

### F21: Branding & Settings
1. Add placeholder logo SVGs to /frontend/public/assets/
2. Update Header component to show logo linking to dashboard
3. Create UserDropdown molecule with Settings link
4. Create SettingsPage with account info and preferences
5. Add /settings route

### F22: Save Confirmation (Toast System)
1. Create /frontend/src/stores/toastStore.ts
2. Create Toast molecule component
3. Create ToastContainer organism
4. Create useAutoSave hook with debouncing
5. Create AutoSaveStatus molecule
6. Add ToastContainer to App.tsx
7. Update BriefEditor to use AutoSaveStatus

### F23: Seed Data
1. Create /backend/prisma/seed.ts with Moorfields test project
2. Include: project, knowledge base, 12 glossary terms, preferences
3. Include: 2 specs (Patient Demographics, Allergy Exchange) with work items
4. Include: reference documents, context sources
5. Add seed scripts to package.json

## Implementation Order
1. F22 first (toast system used by others)
2. F19 (extraction fix)
3. F20 (sync feedback)
4. F21 (branding)
5. F23 (seed data)

## Testing
After each feature:
- Run npm run lint in both directories
- Run npm run build to verify no TS errors
- Test manually: upload PDF, click sync, check toasts

## Git
Commit after each feature: git commit -m "feat(wave4): F{XX} - {description}"
```

---

## Session 2: Visual Intelligence (28 hours)

### Features: F24, F25, F26

**Paste this prompt into Claude Code:**

```
I need you to implement Wave 4 Session 2 - Visual Intelligence features for Handoff AI.

## Context
- Session 1 (F19-F23) is complete with toast system, fixed uploads, seed data
- Use D3.js for visualizations: npm install d3 @types/d3 html2canvas
- Existing CoverageService and WorkItemSource model provide traceability data

## Features to Implement

### F24: Spec Coverage View (Priority - Start Here)
This is the "wow factor" feature. Side-by-side spec and stories with visual connections.

1. Create CoverageVisualizationService:
   - getCoverageVisualization(specId) returns sections with coverage status
   - Each section has: covered | partial | uncovered | intentional status
   - Calculate coverage percentage

2. Create API endpoints:
   - GET /api/specs/:id/coverage/visual
   - POST /api/specs/:specId/sections/:sectionId/mark-uncovered

3. Create frontend components:
   - CoverageViewPage (/coverage/:specId)
   - SpecPanel (left side - spec sections)
   - StoriesPanel (right side - work items)
   - SectionCard (section with coverage indicator)
   - ConnectionLines (SVG bezier curves between section and stories)
   - CoverageBar (summary with stacked progress bar)

4. Add route and navigation link from Review page

### F25: Project Relationship Map
Interactive graph showing how specs relate via shared entities.

1. Create RelationshipService:
   - getRelationshipGraph(projectId) returns nodes and edges
   - Extract entities from spec text (systems, data types)
   - Calculate shared entities between specs

2. Create API endpoint:
   - GET /api/projects/:id/relationships

3. Create frontend components:
   - RelationshipMapPage (/relationships/:projectId)
   - RelationshipGraph (D3 force-directed graph)
   - SpecDetailPanel (sidebar when node selected)

4. Graph features:
   - Nodes: specs, size = story count
   - Edges: shared entities, thickness = count
   - Zoom/pan with D3
   - Click node to select
   - Export as PNG using html2canvas

### F26: Work Breakdown Treemap
Visual hierarchy of epics → features → stories.

1. Create WorkBreakdownService:
   - getWorkBreakdown(projectId) returns tree structure
   - Calculate value (story count) for sizing
   - Include status for coloring

2. Create API endpoint:
   - GET /api/projects/:id/work-breakdown

3. Create frontend components:
   - WorkBreakdownPage (/work-breakdown/:projectId)
   - WorkBreakdownTreemap (D3 treemap layout)
   - Breadcrumbs for drill-down navigation
   - Summary cards (epic/feature/story counts)

4. Features:
   - Click to drill down
   - Color by status (grey=draft, orange=review, green=approved)
   - Size by count or effort toggle

## Database Changes
- Add intentionallyUncovered boolean to SpecSection model
- Run migration

## Implementation Order
1. F24 (most important, reusable patterns)
2. F25 (uses similar D3 patterns)
3. F26 (simpler than F25)

## Testing
- Navigate to coverage view, click sections, verify highlights
- Check relationship graph renders, export works
- Check treemap drill-down works

## Git
Commit after each feature with clear messages.
```

---

## Session 3: Quality Engine (24 hours)

### Features: F27, F28, F29, F30

**Paste this prompt into Claude Code:**

```
I need you to implement Wave 4 Session 3 - Quality Engine features for Handoff AI.

## Context
- Sessions 1-2 complete
- Use existing ClaudeService for AI analysis
- INVEST criteria: Independent, Negotiable, Valuable, Estimable, Small, Testable

## Features to Implement

### F27: INVEST Quality Scoring
Auto-score stories against INVEST criteria.

1. Create QualityScore model in schema.prisma:
   - workItemId (unique)
   - overallScore (0-100)
   - Individual scores: independentScore, negotiableScore, etc. (0-20 each)
   - suggestions (JSON array)
   - analysisDetails (JSON)

2. Create QualityScoreService:
   - scoreWorkItem(id) - uses AI + heuristics
   - getSpecQualitySummary(specId) - aggregates scores
   - Apply heuristics: AC count > 8 reduces Small score, "and" in title reduces Independent

3. Create API endpoints:
   - POST /api/workitems/:id/quality
   - POST /api/workitems/:id/quality/refresh
   - GET /api/specs/:id/quality/summary
   - POST /api/specs/:id/quality/batch

4. Create frontend components:
   - QualityScoreBadge atom (colored circle with score)
   - QualityScorePanel molecule (breakdown bars, suggestions)
   - Add badge to StoryCard

### F28: Story Splitting Assistant
AI-suggested splits for large stories.

1. Create StorySplitService:
   - analyzeSplit(workItemId) - returns strategies
   - executeSplit(id, strategyId, customizations) - creates children
   - undoSplit(id) - reverts within 24 hours

2. Create API endpoints:
   - POST /api/workitems/:id/split/analyze
   - POST /api/workitems/:id/split/execute
   - POST /api/workitems/:id/split/undo

3. Create frontend components:
   - SplitSuggestionModal organism
   - Strategy selection cards
   - Preview of resulting stories
   - "Consider splitting" badge on cards with low Small score

### F29: Duplicate Detection
Find semantic duplicates before export.

1. Create DuplicateMatch model:
   - sourceWorkItemId, targetWorkItemId
   - similarityScore, matchType
   - status (pending/ignored/merged)

2. Create DuplicateDetectionService:
   - scanSpec(specId) - uses embedding similarity
   - ignoreDuplicate(matchId)
   - mergeDuplicates(matchId, keepId, mergeAC)

3. Create embedding utility (simple hash-based for MVP)

4. Create API endpoints:
   - POST /api/specs/:id/duplicates/scan
   - POST /api/duplicates/:id/ignore
   - POST /api/duplicates/:id/merge

5. Create frontend components:
   - DuplicateReviewPanel molecule (side-by-side comparison)

### F30: Flexible Ticket Templates
Custom ticket structures per type.

1. Create TicketTemplate model:
   - projectId, name, ticketType
   - descriptionFormat (user_story/imperative/outcome/custom)
   - acFormat (gherkin/checklist/prose)
   - bodySections (JSON array)
   - isDefault

2. Create TemplateBuilderService:
   - renderTemplate(templateId, workItem)
   - getDefaultTemplate(projectId, ticketType)
   - setAsDefault(templateId)

3. Create API endpoints:
   - GET/POST /api/projects/:id/ticket-templates
   - PATCH/DELETE /api/ticket-templates/:id
   - POST /api/ticket-templates/:id/preview

4. Create frontend:
   - TemplateBuilderPage (/templates/:projectId)

## Database Migrations
Run migrations for: QualityScore, DuplicateMatch, TicketTemplate

## Implementation Order
1. F27 (quality scoring - foundation for F28)
2. F28 (story splitting - uses quality scores)
3. F29 (duplicate detection)
4. F30 (templates)

## Git
Commit after each feature.
```

---

## Session 4: Analysis & Polish (8 hours)

### Features: F31 + Integration Testing

**Paste this prompt into Claude Code:**

```
I need you to implement Wave 4 Session 4 - Analysis features and polish for Handoff AI.

## Context
- Sessions 1-3 complete (fixes, visual, quality engine)
- This is the final session - focus on polish and integration

## Features to Implement

### F31: Pre-Translation Analysis Dashboard
Analysis before translation showing complexity, predictions, entities.

1. Create SpecAnalysis model:
   - specId (unique)
   - Predictions: estimatedEpics/Features/Stories, storyRange
   - Complexity: complexityScore (1-10), complexityReasons
   - Entities: detectedEntities, suggestedGlossary
   - Warnings: coverageWarnings, qualityWarnings
   - Confidence: confidenceScore, confidenceReasons

2. Create SpecAnalysisService:
   - analyzeSpec(specId) - runs all analyses
   - analyzeComplexity(text)
   - detectEntities(text, existingTerms)
   - predictStories(text, sections)
   - analyzeWarnings(text, sections)
   - calculateConfidence()

3. Create API endpoints:
   - POST /api/specs/:id/analyze
   - GET /api/specs/:id/analysis
   - POST /api/specs/:id/analysis/add-glossary

4. Create frontend:
   - SpecAnalysisDashboard organism
   - Add to spec upload flow

## Integration & Polish Tasks

1. Navigation Updates:
   - Add "Coverage" link on Review page cards
   - Add "Relationships" link in project navigation
   - Add "Work Breakdown" link in project navigation
   - Add "Templates" link in project settings

2. Error Handling:
   - Ensure all new endpoints have proper error responses
   - Add toast notifications for all operations

3. Seed Data Update:
   - Add quality scores to seeded work items
   - Add example templates

4. Code Quality:
   - Run npm run lint and fix issues
   - Run npm run build - zero errors

## Testing Checklist (Full Wave 4)
- [ ] Upload PDF → extracts correctly
- [ ] Upload encrypted PDF → clear error
- [ ] Sync context source → progress visible
- [ ] Toast appears on save
- [ ] Seed data creates Moorfields project
- [ ] Coverage view shows section-story links
- [ ] Click section → stories highlight
- [ ] Relationship map shows spec connections
- [ ] Treemap shows work hierarchy
- [ ] Quality score appears on stories
- [ ] Split suggestion works for large stories
- [ ] Duplicate detection finds similar stories
- [ ] Template builder creates custom formats
- [ ] Pre-analysis shows complexity and predictions

## Git
Final commit: git commit -m "feat(wave4): Complete Wave 4 implementation"
Push branch: git push origin wave-4-session-4
```

---

## Rollback Procedures

If any session fails catastrophically:

```bash
# Reset to last known good state
git stash
git checkout main
git pull

# Or reset specific files
git checkout HEAD -- backend/src/services/
git checkout HEAD -- frontend/src/components/

# Database rollback
npx prisma migrate reset
npx prisma migrate deploy
```

---

## New Dependencies

Install before building:

```bash
# Frontend
cd frontend
npm install d3 @types/d3 html2canvas

# Backend
cd backend
npm install mammoth
```

---

## File Structure Summary

### New Backend Files
```
backend/
├── prisma/
│   └── seed.ts                              # F23
├── src/services/
│   ├── CoverageVisualizationService.ts      # F24
│   ├── RelationshipService.ts               # F25
│   ├── WorkBreakdownService.ts              # F26
│   ├── QualityScoreService.ts               # F27
│   ├── StorySplitService.ts                 # F28
│   ├── DuplicateDetectionService.ts         # F29
│   ├── TemplateBuilderService.ts            # F30
│   └── SpecAnalysisService.ts               # F31
```

### New Frontend Files
```
frontend/src/
├── stores/
│   ├── toastStore.ts                        # F22
│   └── loadingStore.ts                      # F20
├── hooks/
│   ├── useAutoSave.ts                       # F22
│   └── useLoading.ts                        # F20
├── components/
│   ├── atoms/
│   │   ├── ProgressBar.tsx                  # F20
│   │   └── QualityScoreBadge.tsx            # F27
│   ├── molecules/
│   │   ├── Toast.tsx                        # F22
│   │   ├── SectionCard.tsx                  # F24
│   │   └── ConnectionLines.tsx              # F24
│   └── organisms/
│       ├── ToastContainer.tsx               # F22
│       ├── RelationshipGraph.tsx            # F25
│       ├── WorkBreakdownTreemap.tsx         # F26
│       └── SpecAnalysisDashboard.tsx        # F31
└── pages/
    ├── SettingsPage.tsx                     # F21
    ├── CoverageViewPage.tsx                 # F24
    ├── RelationshipMapPage.tsx              # F25
    ├── WorkBreakdownPage.tsx                # F26
    └── TemplateBuilderPage.tsx              # F30
```

---

## Estimated Session Times

| Session | Features | Est. Time | Focus |
|---------|----------|-----------|-------|
| 1 | F19-F23 | 10 hrs | Fixes & Foundation |
| 2 | F24-F26 | 28 hrs | Visual Intelligence |
| 3 | F27-F30 | 24 hrs | Quality Engine |
| 4 | F31 | 8 hrs | Analysis & Polish |
| **Total** | **13 features** | **~70 hrs** | |

---

*Wave 4 Build Instructions v1.0*
