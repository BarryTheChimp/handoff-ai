# Feature 5: Estimation Helper

## Complete Build Specification

**Version**: 1.0  
**Last Updated**: December 2024  
**Estimated Build Time**: 2 hours  
**Complexity**: Low-Medium

---

## 1. Overview

### What We're Building
An AI-powered estimation system that suggests T-shirt sizes (S/M/L/XL) for work items with confidence indicators and rationale. Supports both individual and batch estimation.

### Why We're Building It
After AI generates stories, they lack size estimates. Teams currently estimate manually during grooming, which is time-consuming. AI can provide initial estimates based on:
- Acceptance criteria count and complexity
- Technical notes indicating unknowns
- Dependencies on other stories
- Similar stories in the project

**Reference**: Axelrod's test pyramid thinking applies here - quick AI estimates for most stories, human review for edge cases.

### Success Criteria
1. AI estimates any story in < 5 seconds
2. Confidence indicator (high/medium/low) helps prioritize human review
3. Batch estimate 50 stories in < 60 seconds
4. Rationale explains the estimate reasoning
5. Estimates align with team's historical patterns

---

## 2. User Stories

### Must Have (P0)

**US-5.1: Estimate Single Story**
> As a reviewer, I want AI to suggest a size for a story, so that I have a starting point for estimation.

*Acceptance Criteria:*
- "Estimate" button on story editor
- AI returns S/M/L/XL suggestion
- Confidence indicator shown (high/medium/low)
- Rationale text explains the reasoning
- Can accept or override estimate

**US-5.2: Batch Estimate**
> As a reviewer, I want to estimate all stories at once, so that I can quickly size the entire spec.

*Acceptance Criteria:*
- "Estimate All" button on spec page
- Progress indicator during processing
- Shows summary: "45 stories estimated (12 high, 23 medium, 10 low confidence)"
- Low confidence items flagged for review
- Can undo batch estimation

**US-5.3: View Estimation Rationale**
> As a reviewer, I want to see why AI chose a particular size, so that I can validate the reasoning.

*Acceptance Criteria:*
- Rationale shown next to estimate
- Factors listed: AC count, complexity signals, dependencies
- Historical comparison if similar stories exist

### Should Have (P1)

**US-5.4: Calibration with Team History**
> As a project admin, I want AI to learn from our past estimates, so that suggestions match our team's sizing conventions.

*Acceptance Criteria:*
- Compare new stories to previously sized stories
- Adjust estimates based on team patterns
- Show "similar to X which was sized M"

### Nice to Have (P2)

**US-5.5: Estimate Confidence Threshold**
> As an admin, I want to set minimum confidence for auto-accepting estimates.

---

## 3. Functional Requirements

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-5.01 | Estimate single work item via API | Integration test |
| FR-5.02 | Return size: S, M, L, XL | Unit test |
| FR-5.03 | Return confidence: high, medium, low | Unit test |
| FR-5.04 | Return rationale text (2-4 sentences) | Unit test |
| FR-5.05 | Batch estimate up to 100 items | Integration test |
| FR-5.06 | Batch processes sequentially (not parallel) | Integration test |
| FR-5.07 | Batch returns summary statistics | Unit test |
| FR-5.08 | Store estimate on WorkItem.sizeEstimate | Integration test |
| FR-5.09 | Create history record for estimate changes | Integration test |
| FR-5.10 | Undo batch restores previous values | Integration test |

---

## 4. Non-Functional Requirements

### Performance

| Requirement | Target |
|-------------|--------|
| Single estimate | < 5 seconds |
| Batch estimate (50 items) | < 60 seconds |

### Costs

| Operation | Model | Est. Cost |
|-----------|-------|-----------|
| Single estimate | Haiku | ~$0.005 |
| Batch 50 | Haiku | ~$0.25 |

---

## 5. Data Model

No schema changes required. Uses existing:
- `WorkItem.sizeEstimate` (already exists)
- `WorkItemHistory` (for tracking changes)

---

## 6. API Design

### POST /api/workitems/:id/estimate

**Request**: Empty body (uses item data)

**Response 200 OK**:
```json
{
  "data": {
    "id": "item-123",
    "previousSize": null,
    "suggestedSize": "M",
    "confidence": "high",
    "rationale": "Story has 4 acceptance criteria of moderate complexity. No external integrations mentioned. Similar to 'User login' story which was sized M.",
    "factors": {
      "acCount": 4,
      "complexitySignals": ["form validation", "error handling"],
      "dependencies": 1,
      "unknowns": 0
    },
    "applied": true
  }
}
```

### POST /api/specs/:specId/estimate-all

**Request**:
```json
{
  "overwriteExisting": false,
  "minConfidence": "low"
}
```

**Response 200 OK**:
```json
{
  "data": {
    "estimated": 45,
    "skipped": 5,
    "summary": {
      "S": 12,
      "M": 18,
      "L": 10,
      "XL": 5
    },
    "byConfidence": {
      "high": 20,
      "medium": 15,
      "low": 10
    },
    "lowConfidenceItems": [
      { "id": "item-1", "title": "Complex integration", "reason": "Multiple unknowns" }
    ],
    "undoToken": "est_abc123"
  }
}
```

### POST /api/specs/:specId/estimate-undo

**Request**:
```json
{
  "undoToken": "est_abc123"
}
```

---

## 7. AI/ML Components

### Estimation Prompt

**Model**: Claude Haiku  
**Temperature**: 0.2

```
You are estimating the complexity of a software development work item.

## Work Item
- **Title**: {{title}}
- **Type**: {{type}}
- **Description**: {{description}}
- **Acceptance Criteria**: {{acceptanceCriteria}}
- **Technical Notes**: {{technicalNotes}}
- **Dependencies**: {{dependencyCount}} items

## Sizing Guidelines
- **S (Small)**: Simple change, 1-2 acceptance criteria, no unknowns, few hours of work
- **M (Medium)**: Standard feature, 3-5 acceptance criteria, some complexity, 1-2 days
- **L (Large)**: Complex feature, 5+ acceptance criteria, integrations or unknowns, 3-5 days
- **XL (Extra Large)**: Major feature, significant unknowns, multiple integrations, 1+ week

## Complexity Signals to Look For
- External API integrations (+1 size)
- Database schema changes (+1 size)
- Security/authentication requirements (+1 size)
- Performance requirements (+1 size)
- Multiple user roles (+1 size)
- Unknowns or TBDs in description (+1 size, lower confidence)
- Vague acceptance criteria (lower confidence)

## Output Format
Return JSON only:
{
  "size": "S|M|L|XL",
  "confidence": "high|medium|low",
  "rationale": "2-3 sentence explanation",
  "factors": {
    "acCount": number,
    "complexitySignals": ["signal1", "signal2"],
    "dependencies": number,
    "unknowns": number
  }
}

## Confidence Guidelines
- **high**: Clear requirements, straightforward implementation, standard patterns
- **medium**: Some ambiguity, moderate complexity, some assumptions made
- **low**: Significant unknowns, vague requirements, needs clarification
```

### Evaluation

| Metric | Target |
|--------|--------|
| Agreement with human estimates | > 70% within 1 size |
| Confidence calibration | High confidence = > 80% accurate |

---

## 8. UI/UX Specification

### Story Editor Integration

```
┌─────────────────────────────────────────────────────────────────┐
│  Story: User Profile Page                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Size Estimate                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  [S] [M] [L] [XL]        [🤖 Estimate]                      ││
│  │       ▲                                                      ││
│  │       └── Currently selected                                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  AI Suggestion (after clicking Estimate):                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  💡 Suggested: M (High Confidence)                           ││
│  │                                                              ││
│  │  Rationale: 4 acceptance criteria with standard complexity.  ││
│  │  No external integrations. Similar to existing login story.  ││
│  │                                                              ││
│  │  Factors: 4 AC, 1 dependency, 0 unknowns                    ││
│  │                                                              ││
│  │  [Accept M] [Dismiss]                                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Batch Estimation Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  Estimate All Stories                                    [×]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [ ] Overwrite existing estimates (15 stories have sizes)        │
│                                                                  │
│  Minimum confidence: [Low ▼]                                     │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Progress: ████████████░░░░░░░░ 35/50 stories                   │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Results:                                                        │
│  • S: 12 stories                                                 │
│  • M: 18 stories                                                 │
│  • L: 8 stories                                                  │
│  • XL: 2 stories                                                 │
│                                                                  │
│  ⚠️ 5 stories with low confidence - review recommended          │
│  • "Complex payment integration" - Multiple unknowns             │
│  • "Admin dashboard" - Vague requirements                        │
│                                                                  │
│                                              [Undo] [Done]       │
└─────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
StoryEditor (modify)
└── SizeEstimateSection (new molecule)
    ├── SizeSelector (existing)
    ├── EstimateButton (atom)
    └── EstimateSuggestion (molecule) - conditional
        ├── SuggestedSize
        ├── ConfidenceBadge
        ├── RationaleText
        ├── FactorsList
        └── AcceptDismissButtons

BatchEstimateModal (new organism)
├── ModalHeader
├── OptionsSection
│   ├── OverwriteCheckbox
│   └── ConfidenceSelect
├── ProgressSection
│   └── ProgressBar
├── ResultsSection
│   ├── SizeSummary
│   └── LowConfidenceList
└── ModalFooter
    ├── UndoButton (conditional)
    └── DoneButton
```

---

## 9. Testing Strategy

### Unit Tests

```typescript
describe('EstimationService', () => {
  describe('estimateSingle', () => {
    it('returns size, confidence, and rationale', async () => {
      const item = await createWorkItem({
        title: 'Simple form',
        acceptanceCriteria: '- Validates email\n- Shows error',
        technicalNotes: 'Use existing form components'
      });
      
      const result = await service.estimateSingle(item.id);
      
      expect(['S', 'M', 'L', 'XL']).toContain(result.suggestedSize);
      expect(['high', 'medium', 'low']).toContain(result.confidence);
      expect(result.rationale.length).toBeGreaterThan(20);
    });

    it('applies estimate to work item when requested', async () => {
      const item = await createWorkItem({ sizeEstimate: null });
      
      await service.estimateSingle(item.id, { apply: true });
      
      const updated = await prisma.workItem.findUnique({ where: { id: item.id } });
      expect(updated.sizeEstimate).not.toBeNull();
    });
  });

  describe('estimateBatch', () => {
    it('estimates multiple items', async () => {
      const items = await createWorkItems(5);
      const specId = items[0].specId;
      
      const result = await service.estimateBatch(specId, { overwriteExisting: true });
      
      expect(result.estimated).toBe(5);
    });

    it('skips items with existing estimates when overwrite false', async () => {
      const items = await createWorkItems(5, { sizeEstimate: 'M' });
      const specId = items[0].specId;
      
      const result = await service.estimateBatch(specId, { overwriteExisting: false });
      
      expect(result.skipped).toBe(5);
      expect(result.estimated).toBe(0);
    });

    it('returns undo token', async () => {
      const items = await createWorkItems(3);
      
      const result = await service.estimateBatch(items[0].specId);
      
      expect(result.undoToken).toBeDefined();
    });
  });

  describe('undoBatch', () => {
    it('reverts estimates to previous values', async () => {
      const items = await createWorkItems(3, { sizeEstimate: 'S' });
      const { undoToken } = await service.estimateBatch(items[0].specId, { 
        overwriteExisting: true 
      });
      
      await service.undoBatch(undoToken);
      
      const reverted = await prisma.workItem.findMany({
        where: { id: { in: items.map(i => i.id) } }
      });
      expect(reverted.every(i => i.sizeEstimate === 'S')).toBe(true);
    });
  });
});
```

### Integration Tests

```typescript
describe('POST /api/workitems/:id/estimate', () => {
  it('returns estimation', async () => {
    const item = await createWorkItem();
    
    const response = await app.inject({
      method: 'POST',
      url: `/api/workitems/${item.id}/estimate`,
      headers: { authorization: `Bearer ${token}` }
    });
    
    expect(response.statusCode).toBe(200);
    expect(response.json().data.suggestedSize).toBeDefined();
  });
});

describe('POST /api/specs/:specId/estimate-all', () => {
  it('estimates all stories', async () => {
    const spec = await createSpecWithWorkItems(10);
    
    const response = await app.inject({
      method: 'POST',
      url: `/api/specs/${spec.id}/estimate-all`,
      headers: { authorization: `Bearer ${token}` },
      payload: { overwriteExisting: true }
    });
    
    expect(response.statusCode).toBe(200);
    expect(response.json().data.estimated).toBe(10);
  });
});
```

---

## 10. Implementation Plan

### Build Order

```
Phase 1: Backend (60 min)
├── EstimationService
│   ├── estimateSingle()
│   ├── estimateBatch()
│   └── undoBatch()
├── Routes
│   ├── POST /workitems/:id/estimate
│   ├── POST /specs/:specId/estimate-all
│   └── POST /specs/:specId/estimate-undo
└── Tests

Phase 2: Frontend (45 min)
├── SizeEstimateSection component
├── EstimateSuggestion component
├── BatchEstimateModal
└── Integration with StoryEditor

Phase 3: Polish (15 min)
├── Loading states
├── Error handling
└── Undo flow
```

### Files to Create

**Backend:**
- `backend/src/services/EstimationService.ts`
- `backend/src/routes/estimates.ts`
- `backend/src/prompts/estimation.txt`

**Frontend:**
- `frontend/src/components/molecules/SizeEstimateSection.tsx`
- `frontend/src/components/molecules/EstimateSuggestion.tsx`
- `frontend/src/components/organisms/BatchEstimateModal.tsx`

---

## 11. Open Questions

1. **Should estimates affect critical path calculation?**
   - Could weight by size instead of count
   - **Recommendation**: Keep simple (count) for v1

2. **Team calibration data source?**
   - Needs exported Jira data for historical comparison
   - **Recommendation**: Defer to v2

---

*End of Feature 5 Specification*
