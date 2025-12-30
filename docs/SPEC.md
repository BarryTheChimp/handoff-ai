# Handoff AI - Technical Specification

**Version:** 1.0  
**Date:** December 2024  
**Status:** Approved for Implementation

---

## 1. Overview

### What We're Building
Handoff AI - the bridge between product specifications and developer-ready work. An internal tool that uses AI to translate spec documents into structured Jira tickets (Epics → Features → Stories).

### Why We're Building It
The handoff between product/management and engineering is a universal pain point:
- Specs written in product language need translation to technical tasks
- Manual breakdown is time-consuming (4+ hours per spec)
- Context gets lost, leading to rework
- Inconsistent structure across teams

Handoff AI automates the translation while preserving human judgment for refinement.

### Success Criteria
1. **Time reduction:** 80% faster (from ~4 hours to <1 hour)
2. **Quality:** 90%+ of generated stories need no structural changes
3. **Traceability:** Every story links back to spec sections
4. **Adoption:** Used for all new work within 2 weeks of launch

---

## 2. User Stories

### Must Have (P0)

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US-001 | As a Tech Lead, I want to upload spec documents so the system can analyze them | Accepts PDF, DOCX, YAML, JSON up to 50MB; shows progress; confirms successful parsing |
| US-002 | As a Tech Lead, I want to configure translation settings | Can select structure (Epic/Feature/Story vs Epic/Story); story template; settings persist |
| US-003 | As a Tech Lead, I want AI to translate the spec into work items | Generates hierarchy with AC, technical notes, dependencies; completes in <5 min |
| US-004 | As a Tech Lead, I want to review and edit items interactively | Tree view; inline editing; add/remove/reorder; drag-drop; auto-save |
| US-005 | As a Tech Lead, I want traceability to original spec | Each story shows source section; click to view original text; coverage report |
| US-006 | As a Tech Lead, I want to export to Jira | Creates items with correct links; maps fields; handles rate limits; shows progress |

### Should Have (P1)

| ID | Story |
|----|-------|
| US-007 | Dashboard view of all translated specs |
| US-008 | Technical context in stories (API schemas, dependencies) |
| US-009 | Approval workflow before export |
| US-010 | Feedback on AI quality for improvement |

---

## 3. Functional Requirements

### Document Processing

| ID | Requirement |
|----|-------------|
| FR-001 | Accept PDF up to 50MB |
| FR-002 | Accept DOCX up to 50MB |
| FR-003 | Accept OpenAPI (YAML/JSON) up to 10MB |
| FR-004 | Extract text preserving structure |
| FR-005 | Identify sections and headings |
| FR-006 | Handle errors gracefully with clear messages |

### AI Translation

| ID | Requirement |
|----|-------------|
| FR-007 | Generate Epics (1 per major capability) |
| FR-008 | Generate Features (grouped functionality) |
| FR-009 | Generate Stories with: summary, description, AC, technical notes |
| FR-010 | Maintain spec section → story traceability |
| FR-011 | Identify cross-story dependencies |
| FR-012 | Generate AC in Given/When/Then format |
| FR-013 | Flag ambiguous sections for human review |
| FR-014 | Estimate relative complexity (S/M/L/XL) |

### Review Interface

| ID | Requirement |
|----|-------------|
| FR-015 | Display hierarchical tree view |
| FR-016 | Inline editing of all text fields |
| FR-017 | Drag-drop reordering within level |
| FR-018 | Drag-drop reparenting |
| FR-019 | Split story (one → many) |
| FR-020 | Merge stories (many → one) |
| FR-021 | Split-pane spec viewer |
| FR-022 | Highlight source when story selected |
| FR-023 | Auto-save within 2s of edit |
| FR-024 | Undo/redo support |

### Jira Integration

| ID | Requirement |
|----|-------------|
| FR-025 | OAuth 2.0 authentication with Jira Cloud |
| FR-026 | Create Epics with correct issue type |
| FR-027 | Create Features/Stories with parent links |
| FR-028 | Map fields: summary, description, AC, labels |
| FR-029 | Handle rate limits with backoff |
| FR-030 | Provide export progress |
| FR-031 | Support dry-run mode |

---

## 4. Non-Functional Requirements

### Performance

| Metric | Target |
|--------|--------|
| Upload | <10s for 10MB |
| Translation | <5 min for 50 pages |
| UI page load | <2s initial |
| Jira export | <30s for 50 stories |

### Scalability

| Aspect | Target |
|--------|--------|
| Concurrent users | 10 |
| Specs stored | 100+ |
| Stories per spec | 500 |

### Security

| Requirement |
|-------------|
| Authentication required |
| API keys encrypted at rest |
| HTTPS everywhere |
| Audit logging |

---

## 5. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  Upload │ Settings │ Review/Edit │ Export │ Dashboard       │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API
┌────────────────────────┼────────────────────────────────────┐
│                  Backend (Fastify)                          │
│  ┌──────────┐ ┌─────────────┐ ┌────────┐ ┌───────────┐     │
│  │ Document │ │ Translation │ │ Review │ │   Jira    │     │
│  │ Service  │ │   Service   │ │Service │ │  Service  │     │
│  └────┬─────┘ └──────┬──────┘ └───┬────┘ └─────┬─────┘     │
└───────┼──────────────┼────────────┼────────────┼────────────┘
        │              │            │            │
   ┌────┴────┐   ┌────┴────┐  ┌────┴────┐  ┌────┴────┐
   │  File   │   │  Claude │  │PostgreSQL│  │  Jira   │
   │ Storage │   │   API   │  │          │  │  Cloud  │
   └─────────┘   └─────────┘  └──────────┘  └─────────┘
```

---

## 6. Data Model

### Entities

**Project**
- id, name, jira_project_key, settings (JSON), created_at

**Spec**
- id, project_id, name, file_path, extracted_text, status, spec_type, uploaded_by, uploaded_at, metadata

**SpecSection**
- id, spec_id, section_ref, heading, content, order_index

**WorkItem**
- id, spec_id, parent_id (self-ref), type, title, description, acceptance_criteria, technical_notes, size_estimate, status, order_index, jira_key, created_at, updated_at

**WorkItemSource**
- work_item_id, section_id, relevance_score

**WorkItemHistory**
- id, work_item_id, field_changed, old_value, new_value, changed_by, changed_at

### Enums

- **SpecStatus:** uploaded, extracting, ready, translating, translated, error
- **WorkItemType:** epic, feature, story
- **WorkItemStatus:** draft, ready_for_review, approved, exported
- **SizeEstimate:** S, M, L, XL

---

## 7. API Design

### Endpoints

```
POST   /api/specs                    Upload spec
GET    /api/specs/:id                Get spec details
POST   /api/specs/:id/extract        Trigger extraction
POST   /api/specs/:id/translate      Trigger AI translation
GET    /api/specs/:id/workitems      Get work items tree
POST   /api/specs/:id/export         Export to Jira

PATCH  /api/workitems/:id            Update work item
POST   /api/workitems/:id/split      Split into multiple
POST   /api/workitems/:id/move       Change parent
POST   /api/workitems/merge          Merge multiple

POST   /api/auth/login               Get JWT
GET    /api/auth/me                  Current user

GET    /api/jira/auth                Start OAuth
GET    /api/jira/callback            OAuth callback
GET    /api/jira/status              Connection status
```

### Response Format

```json
// Success
{ "data": { ... }, "meta": { "total": 100 } }

// Error
{ "error": { "code": "NOT_FOUND", "message": "Spec not found" } }
```

---

## 8. AI Pipeline

### 4-Pass Translation

1. **Structure Analysis** - Understand document, identify sections
2. **Epic Generation** - Create top-level work items
3. **Feature/Story Generation** - Break down each epic
4. **Enrichment** - Add dependencies, validate coverage

### Configuration

| Parameter | Value |
|-----------|-------|
| Model | claude-sonnet-4-20250514 |
| Temperature | 0.2 |
| Max tokens | 4096 |
| JSON mode | Enabled |

### Fallback Handling

- Invalid JSON: Retry 3x
- Timeout: Exponential backoff
- Rate limit: Queue and wait
- Content filter: Flag for human review

---

## 9. UI Components

### Atomic Design Hierarchy

**Atoms:** Button, Input, Badge, Icon, Spinner, ProgressBar

**Molecules:** FormField, TreeNode, EditableText, StatusBadge, SpecReference

**Organisms:** WorkBreakdownTree, StoryEditor, SpecViewer, ExportProgress

**Templates:** DashboardLayout, ReviewLayout (split-pane), WizardLayout

---

## 10. Testing Strategy

### Pyramid

- 70% Unit (services, utils, components)
- 20% Integration (API, database)
- 10% E2E (upload → export flow)

### Critical Path

1. Login
2. Upload spec
3. Wait for translation
4. Edit one story
5. Export (dry run)
6. Verify results

---

## 11. Implementation Phases

| Phase | Focus | Duration |
|-------|-------|----------|
| 1 | Foundation (setup, DB, auth) | 1 week |
| 2 | Document Processing | 1 week |
| 3 | AI Translation | 1 week |
| 4 | Review Interface | 1 week |
| 5 | Advanced Editing | 1 week |
| 6 | Jira Export | 1 week |
| 7 | Polish & Dashboard | 1 week |
| 8 | Testing & Launch | 1 week |

---

## 12. Open Questions

| Question | Decision Needed By |
|----------|-------------------|
| Jira mandatory fields? | Phase 6 |
| Approval workflow details? | Phase 7 |
| Retention policy? | Launch |

---

*End of Specification*
