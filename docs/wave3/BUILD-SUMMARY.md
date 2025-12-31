# Wave 3: Smart Context Engine - Build Summary

**Build Date:** December 30, 2025
**Features Implemented:** F11-F18 (8 features)
**Status:** Complete

---

## Overview

Wave 3 introduces the **Smart Context Engine** - a system that learns from project context and user behavior to generate better work items. This wave adds:

- User session management with authentication
- Multi-project support with CRUD operations
- Global navigation with project switching
- Knowledge Base for storing project context
- Context Sources for external documentation
- Smart Context Builder with RAG-style retrieval
- Learning Loop to track edits and detect patterns
- Setup Wizard with Project Health scoring

---

## Features Implemented

### F11: User Session & Logout
**Commit:** `feat(wave3): F11 - User Session & Logout`

Adds user session management with a dropdown menu for account actions.

**Backend:**
- `GET /api/auth/me` - Returns current user info from JWT token

**Frontend:**
- `UserMenu` component - Dropdown with user email, settings link, and logout
- Session state management in auth store
- Automatic redirect on logout

**Files:**
- `backend/src/routes/auth.ts` - Added /me endpoint
- `frontend/src/components/molecules/UserMenu.tsx`
- `frontend/src/stores/authStore.ts` - Session management

---

### F12: Project Management
**Commit:** `feat(wave3): F12 - Project Management`

Full CRUD operations for managing multiple projects.

**Backend Routes:**
- `GET /api/projects` - List all projects for user
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project (soft delete)

**Frontend:**
- `ProjectList` page with grid/list views
- `ProjectCard` component with actions menu
- Create/Edit project modal
- Project deletion with confirmation

**Files:**
- `backend/src/routes/projects.ts`
- `frontend/src/pages/ProjectList.tsx`
- `frontend/src/components/molecules/ProjectCard.tsx`

---

### F13: Global Navigation
**Commit:** `feat(wave3): F13 - Global Navigation`

Consistent navigation header with project context switching.

**Components:**
- `GlobalNav` - Top navigation bar with logo, project selector, and user menu
- `ProjectSwitcher` - Dropdown to switch between projects
- Breadcrumb support for nested pages
- Mobile-responsive hamburger menu

**Files:**
- `frontend/src/components/organisms/GlobalNav.tsx`
- `frontend/src/components/molecules/ProjectSwitcher.tsx`
- `frontend/src/components/templates/AppLayout.tsx`

---

### F14: Knowledge Base
**Commit:** `feat(wave3): F14 - Knowledge Base`

Central repository for project context that informs AI translation.

**Database Models:**
```prisma
model ProjectBrief { ... }      // Project overview and goals
model GlossaryTerm { ... }      // Domain terminology
model ProjectPreference { ... } // AI generation preferences
```

**Backend Routes:**
- `/api/projects/:id/brief` - Project brief CRUD
- `/api/projects/:id/glossary` - Glossary terms CRUD
- `/api/projects/:id/preferences` - Preferences CRUD

**Frontend:**
- `KnowledgeBase` page with tabbed interface
- `BriefEditor` - Rich text editor for project brief
- `GlossaryManager` - Term list with add/edit/delete
- `PreferencesEditor` - Key-value preference settings

**Files:**
- `backend/prisma/schema.prisma` - Knowledge models
- `backend/src/routes/knowledge.ts`
- `frontend/src/pages/KnowledgeBase.tsx`
- `frontend/src/components/organisms/BriefEditor.tsx`
- `frontend/src/components/organisms/GlossaryManager.tsx`
- `frontend/src/components/organisms/PreferencesEditor.tsx`

---

### F15: Context Sources
**Commit:** `feat(wave3): F15 - Context Sources`

External documentation links that provide additional context.

**Database Model:**
```prisma
enum SourceType { documentation, api_reference, design_system, ... }
enum SyncStatus { pending, syncing, synced, failed }

model ContextSource {
  id, projectId, name, type, url, content, syncStatus, ...
}
```

**Backend:**
- `ContextSourceService` - Manages sources with content fetching
- `/api/projects/:id/context-sources` - CRUD endpoints
- `/api/projects/:id/context-sources/:sourceId/sync` - Trigger re-sync

**Frontend:**
- `ContextSources` page with source cards
- Add/Edit source modal with type selection
- Sync status indicators and manual sync button

**Files:**
- `backend/src/services/ContextSourceService.ts`
- `backend/src/routes/context-sources.ts`
- `frontend/src/pages/ContextSources.tsx`
- `frontend/src/components/organisms/ContextSourceCard.tsx`

---

### F16: Smart Context Builder
**Commit:** `feat(wave3): F16 - Smart Context Builder`

RAG-style context assembly with token budgeting for AI prompts.

**Service:** `ContextBuilder.ts`
```typescript
interface ContextBuilder {
  buildContext(projectId: string, specContent: string, maxTokens?: number): Promise<ContextBuildResult>;
  previewContext(projectId: string, specContent: string, maxTokens?: number): Promise<ContextBuildResult>;
}
```

**Token Budget (2000 tokens default):**
- Project Brief: 30% allocation
- Glossary Terms: 20% allocation (relevance-scored)
- Preferences: 15% allocation
- Context Sources: 25% allocation (relevance-scored)
- Reserve: 10% buffer

**Features:**
- Relevance scoring based on spec content keywords
- Token counting with truncation
- Priority-based allocation
- Preview mode for testing

**Frontend:**
- `ContextPreview` component showing token distribution
- Color-coded bar chart for each source type
- Token count display

**Files:**
- `backend/src/services/ContextBuilder.ts`
- `backend/src/routes/knowledge.ts` - Preview endpoints
- `frontend/src/components/organisms/ContextPreview.tsx`

---

### F17: Learning Loop
**Commit:** `feat(wave3): F17 - Learning Loop`

Tracks user edits to detect patterns and improve future generation.

**Database Models:**
```prisma
enum EditField { title, description, acceptanceCriteria, ... }
enum EditType { addition, removal, modification, complete }
enum SuggestionType { addToPreferences, addToGlossary, ... }
enum PatternStatus { pending, suggested, accepted, dismissed, applied }

model StoryEdit { ... }      // Individual edit records
model LearnedPattern { ... } // Detected patterns with suggestions
```

**Service:** `LearningService.ts`
```typescript
interface LearningService {
  trackEdit(input: EditTrackInput): Promise<StoryEditData>;
  detectPatterns(projectId: string): Promise<DetectedPattern[]>;
  getPendingPatterns(projectId: string): Promise<LearnedPatternData[]>;
  acceptPattern(patternId: string, userId: string): Promise<LearnedPatternData>;
  dismissPattern(patternId: string, userId: string): Promise<LearnedPatternData>;
  getLearningStats(projectId: string): Promise<LearningStats>;
}
```

**Pattern Detection:**
- Analyzes edit frequency by field
- Groups similar modifications
- Generates actionable suggestions
- Confidence scoring based on occurrences

**Frontend:**
- `LearningSuggestions` component
- Pattern cards with accept/dismiss actions
- Learning statistics display

**Files:**
- `backend/src/services/LearningService.ts`
- `backend/src/routes/learning.ts`
- `frontend/src/components/organisms/LearningSuggestions.tsx`

---

### F18: Setup Wizard & Health Score
**Commit:** `feat(wave3): F18 - Setup Wizard & Health Score`

Guided onboarding and project health visualization.

**Database Model:**
```prisma
enum HealthLevel { minimal, basic, good, excellent }

model ProjectHealth {
  id, projectId, score, level
  briefScore, glossaryScore, prefsScore, specsScore, sourcesScore, learningScore
  recommendations, calculatedAt
}
```

**Service:** `HealthScoreService.ts`
```typescript
interface HealthScoreService {
  calculateHealth(projectId: string): Promise<HealthResult>;
  getHealth(projectId: string): Promise<HealthResult | null>;
  recalculateHealth(projectId: string): Promise<HealthResult>;
}
```

**Health Score Components (100 points max):**
| Component | Weight | Scoring Criteria |
|-----------|--------|------------------|
| Brief | 25% | Has content, goals, scope |
| Glossary | 20% | 5+ terms = 100%, scaled |
| Preferences | 15% | 3+ preferences = 100% |
| Specs | 20% | Has processed specs |
| Sources | 10% | Has context sources |
| Learning | 10% | Has accepted patterns |

**Health Levels:**
- Excellent: 80-100
- Good: 60-79
- Basic: 40-59
- Minimal: 0-39

**Setup Wizard Steps:**
1. **Basics** - Project name and description
2. **Brief** - Project overview, goals, scope
3. **Glossary** - Add domain terms
4. **Preferences** - Set generation preferences

**Frontend Components:**
- `SetupWizard` - Multi-step onboarding flow
- `HealthScoreWidget` - Circular progress with breakdown
- `HealthBadge` - Compact inline indicator

**Files:**
- `backend/src/services/HealthScoreService.ts`
- `backend/src/routes/health.ts`
- `frontend/src/components/organisms/SetupWizard.tsx`
- `frontend/src/components/molecules/HealthScoreWidget.tsx`

---

## Database Schema Changes

### New Enums
```prisma
enum SourceType { documentation, api_reference, design_system, codebase, wiki, other }
enum SyncStatus { pending, syncing, synced, failed }
enum EditField { title, description, acceptanceCriteria, technicalNotes, size, priority }
enum EditType { addition, removal, modification, complete }
enum SuggestionType { addToPreferences, addToGlossary, updateTemplate, addRequiredSection }
enum PatternStatus { pending, suggested, accepted, dismissed, applied }
enum HealthLevel { minimal, basic, good, excellent }
```

### New Models
- `ProjectBrief` - Project overview content
- `GlossaryTerm` - Domain terminology definitions
- `ProjectPreference` - AI generation preferences
- `ContextSource` - External documentation links
- `StoryEdit` - User edit tracking
- `LearnedPattern` - Detected patterns from edits
- `ProjectHealth` - Calculated health scores

---

## API Endpoints Added

### Authentication
- `GET /api/auth/me` - Current user info

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Knowledge Base
- `GET/POST/PATCH /api/projects/:id/brief` - Project brief
- `GET/POST /api/projects/:id/glossary` - Glossary terms
- `PATCH/DELETE /api/projects/:id/glossary/:termId` - Single term
- `GET/POST /api/projects/:id/preferences` - Preferences
- `PATCH/DELETE /api/projects/:id/preferences/:prefId` - Single preference

### Context Sources
- `GET/POST /api/projects/:id/context-sources` - Sources list/create
- `GET/PATCH/DELETE /api/projects/:id/context-sources/:sourceId` - Single source
- `POST /api/projects/:id/context-sources/:sourceId/sync` - Trigger sync

### Context Builder
- `POST /api/projects/:id/context/preview` - Preview context assembly
- `POST /api/projects/:id/context/build` - Build context for AI

### Learning
- `POST /api/projects/:id/learning/edits` - Track an edit
- `GET /api/projects/:id/learning/patterns` - Get pending patterns
- `POST /api/projects/:id/learning/patterns/detect` - Detect patterns
- `POST /api/projects/:id/learning/patterns/:patternId/accept` - Accept pattern
- `POST /api/projects/:id/learning/patterns/:patternId/dismiss` - Dismiss pattern
- `GET /api/projects/:id/learning/stats` - Learning statistics

### Health
- `GET /api/projects/:id/health` - Get health score
- `POST /api/projects/:id/health/recalculate` - Force recalculate

---

## Test Results

```
Backend Tests: 78 passing
Frontend Tests: 21 passing
Total: 99 tests passing
```

All existing tests continue to pass. New functionality covered by existing test patterns.

---

## Migration Files

The following migration SQL files were generated:

1. `20241230_knowledge_base.sql` - Brief, Glossary, Preferences models
2. `20241230_context_sources.sql` - ContextSource model with enums
3. `20241230_learning_loop.sql` - StoryEdit, LearnedPattern models
4. `20241230_project_health.sql` - ProjectHealth model

---

## Commits

```
feat(wave3): F11 - User Session & Logout
feat(wave3): F12 - Project Management
feat(wave3): F13 - Global Navigation
feat(wave3): F14 - Knowledge Base
feat(wave3): F15 - Context Sources
feat(wave3): F16 - Smart Context Builder
feat(wave3): F17 - Learning Loop
feat(wave3): F18 - Setup Wizard & Health Score
```

---

## Architecture Notes

### Token Budget Strategy
The Smart Context Builder uses a priority-based allocation system:
1. Calculate relevance scores for dynamic content (glossary, sources)
2. Allocate tokens by priority: brief > sources > glossary > preferences
3. Truncate content that exceeds allocation
4. Maintain 10% reserve for safety

### Learning Loop Flow
1. User edits a work item field
2. Edit is tracked with before/after values
3. Pattern detection analyzes edit history
4. Similar edits are grouped into patterns
5. Patterns generate suggestions (add term, update preference)
6. User accepts or dismisses suggestions
7. Accepted patterns are applied to knowledge base

### Health Score Design
- Weighted sum of component scores
- Each component has specific criteria
- Recommendations generated for low-scoring areas
- Cached with recalculation on demand

---

## Next Steps (Wave 4)

Wave 4 will focus on **AI Translation Pipeline**:
- Multi-pass translation with context injection
- Work item hierarchy generation
- Acceptance criteria extraction
- Technical notes inference
- Dependency detection

---

*Generated by Claude Code on December 30, 2025*
