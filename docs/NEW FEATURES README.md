# Handoff AI: Wave 2 Features

## Specification Index

This folder contains complete build specifications for 10 features. Each specification is implementation-ready for Claude Code overnight builds.

---

## Feature List

| # | Feature | Spec File | Est. Time | Complexity | Dependencies |
|---|---------|-----------|-----------|------------|--------------|
| 1 | [Multi-File Upload & Stitching](./features/FEATURE-01-MULTI-FILE-UPLOAD.md) | ✅ Complete | 3-4 hours | Medium-High | None |
| 2 | [Bulk Editing](./features/FEATURE-02-BULK-EDITING.md) | ✅ Complete | 2-3 hours | Medium | None |
| 3 | [Custom Templates](./features/FEATURE-03-CUSTOM-TEMPLATES.md) | ✅ Complete | 2-3 hours | Medium | None |
| 4 | [Dependency Visualization](./features/FEATURE-04-DEPENDENCY-GRAPH.md) | ✅ Complete | 3-4 hours | Medium | None |
| 5 | [Estimation Helper](./features/FEATURE-05-ESTIMATION-HELPER.md) | ✅ Complete | 2 hours | Low-Medium | None |
| 6 | [Coverage Dashboard](./features/FEATURE-06-COVERAGE-DASHBOARD.md) | ✅ Complete | 1.5 hours | Low | None |
| 7 | [AI Refinement Loop](./features/FEATURE-07-AI-REFINEMENT.md) | ✅ Complete | 2-3 hours | Medium | None |
| 8 | [Spec Versioning & Diff](./features/FEATURE-08-VERSIONING.md) | ✅ Complete | 3-4 hours | Medium-High | Feature 1 |
| 9 | [Team Collaboration](./features/FEATURE-09-COLLABORATION.md) | ✅ Complete | 4-5 hours | High | None |
| 10 | [Bi-Directional Jira Sync](./features/FEATURE-10-JIRA-SYNC.md) | ✅ Complete | 4-5 hours | High | Jira Export |

**Total Estimated Time**: 28-36 hours

---

## Build Order Recommendations

### Overnight Build 1 (Features 1-3)
Estimated time: 8-10 hours

```
Feature 1: Multi-File Upload & Stitching
    └─► Feature 2: Bulk Editing
        └─► Feature 3: Custom Templates
```

These are independent and can be built in any order, but this sequence makes sense because:
- Feature 1 is the largest, start fresh
- Feature 2 builds UI patterns (selection, bulk actions) useful for Feature 3
- Feature 3 touches TranslationService, good to do after getting familiar with codebase

### Overnight Build 2 (Features 4-6)
Estimated time: 6-8 hours

```
Feature 4: Dependency Visualization
Feature 5: Estimation Helper
Feature 6: Coverage Dashboard
```

These are all "read-heavy" features that analyze existing data. Good for a second session.

### Overnight Build 3 (Feature 7 + 8)
Estimated time: 6-7 hours

```
Feature 7: AI Refinement Loop
    └─► Feature 8: Spec Versioning & Diff
```

Feature 7 modifies TranslationService prompts. Feature 8 depends on Feature 1's SpecGroup infrastructure.

### Overnight Build 4 (Features 9-10)
Estimated time: 8-10 hours

```
Feature 9: Team Collaboration (WebSocket + CRDT)
Feature 10: Bi-Directional Jira Sync (Webhooks)
```

These are the most complex features. Save for last when comfortable with codebase.

---

## How to Use These Specs

### For Claude Code

Each feature spec contains an **Implementation Prompt** section. Copy this to Claude Code:

```
Read CLAUDE.md first.

Then read the complete specification for Feature X at:
/path/to/FEATURE-XX-NAME.md

Implement the feature following the spec exactly. Build in this order:
1. Database migration
2. Backend service
3. Backend routes
4. Frontend components
5. Integration
6. Tests

Commit after completing the feature:
git add -A && git commit -m "feat: [feature name]"
```

### Specification Structure

Each spec follows this structure:

1. **Overview** - What and why
2. **User Stories** - Prioritized with acceptance criteria
3. **Functional Requirements** - Numbered, testable
4. **Non-Functional Requirements** - Performance, security, reliability
5. **Architecture** - System design with diagrams
6. **Data Model** - Prisma schema changes
7. **API Design** - Endpoints with request/response examples
8. **AI/ML Components** - Prompts, evaluation criteria, fallbacks
9. **UI/UX Specification** - Screens, flows, component hierarchy
10. **Testing Strategy** - Unit, integration, E2E with examples
11. **Implementation Plan** - Build order, dependencies
12. **Open Questions** - Decisions needed

---

## Codebase Context

All specs assume the existing Handoff AI foundation:

**Backend Stack**:
- Fastify 4.x
- Prisma 5.x with PostgreSQL
- ClaudeService for AI (Haiku + Sonnet)
- JWT authentication

**Frontend Stack**:
- React 18 with TypeScript
- Zustand for state
- Tailwind with Toucan theme
- Atomic design (atoms → molecules → organisms)

**Key Existing Services**:
- `TranslationService` - 4-pass AI pipeline
- `DocumentService` - File upload/extraction
- `JiraExportService` - Jira integration
- `HistoryService` - Undo/redo

---

## Reference Sources

These specs draw from project knowledge:

| Topic | Source |
|-------|--------|
| Deep modules, information hiding | Ousterhout - Philosophy of Software Design |
| Testing strategy, pyramid | Axelrod - Complete Guide to Test Automation |
| Visual hierarchy, usability | Krug - Don't Make Me Think |
| UI patterns, spacing, color | Wathan/Schoger - Refactoring UI |

---

*Last Updated: December 2024*
