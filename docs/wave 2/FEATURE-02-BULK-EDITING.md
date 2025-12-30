# Feature 2: Bulk Editing

## Complete Build Specification

**Version**: 1.0  
**Last Updated**: December 2024  
**Estimated Build Time**: 2-3 hours  
**Complexity**: Medium

---

## 1. Overview

### What We're Building
A selection and bulk operation system that allows users to select multiple work items (stories, features, epics) and apply changes to all of them simultaneously. This includes field updates (size, status), AI-powered enhancements that generate unique content per item, and full undo capability for bulk operations.

### Why We're Building It
After AI translation, teams typically need to clean up the generated work items:
- Set consistent T-shirt sizes across related stories
- Move all stories to "ready for review" status
- Add team-specific notes (security considerations, accessibility requirements)
- Apply labels or tags

Currently, this requires editing each work item individually. With 50+ stories, this takes hours. Bulk editing reduces this to minutes.

**Reference**: This follows Krug's usability principle of reducing "mindless choices" - once you've decided to set size M, you shouldn't have to repeat that decision 30 times.

### Success Criteria
1. Select multiple items via checkbox or shift-click range
2. Apply field changes to all selected in under 2 seconds
3. AI enhance generates unique content per item (not copy-paste)
4. Single undo reverts entire bulk operation
5. Selection persists across tree expand/collapse

---

## 2. User Stories

### Must Have (P0)

**US-2.1: Individual Selection**
> As a reviewer, I want to select individual work items via checkbox, so that I can build up a set of items to modify.

*Acceptance Criteria:*
- Checkbox appears on hover/focus of each work item in tree
- Clicking checkbox toggles selection (visual highlight)
- Selected count shown in floating action bar
- Selection persists when scrolling
- Can select items across different parents (epics/features)

**US-2.2: Range Selection**
> As a reviewer, I want to shift-click to select a range of items, so that I can quickly select consecutive items.

*Acceptance Criteria:*
- Shift+click selects all items between last selected and current
- Works within a single parent's children
- Works across tree levels (mixed epics, features, stories)
- Visual feedback during shift-click (range preview)

**US-2.3: Bulk Field Update**
> As a reviewer, I want to change a field value for all selected items at once, so that I don't have to edit each one individually.

*Acceptance Criteria:*
- Can set size (S/M/L/XL) for all selected
- Can set status (draft/ready_for_review/approved) for all selected
- Change applies immediately with loading indicator
- Toast confirmation: "Updated 12 items"
- History records created for each item

**US-2.4: Bulk Undo**
> As a reviewer, I want to undo a bulk operation with a single action, so that I can recover from mistakes.

*Acceptance Criteria:*
- "Undo" button appears in action bar after bulk operation
- Undo reverts all items to their previous state
- Works for field updates and AI enhancements
- Undo token expires after 1 hour or next bulk operation
- Toast confirmation: "Reverted 12 items"

**US-2.5: AI Bulk Enhancement**
> As a reviewer, I want AI to add content to multiple items at once, with unique additions per item, so that I can enrich stories efficiently.

*Acceptance Criteria:*
- "AI Enhance" option in action bar
- Prompt input: "What should be added?"
- Context input: "Project context" (optional)
- Each item gets unique AI-generated content
- Content added to technical notes (not replacing)
- Progress indicator during generation
- Can undo entire enhancement

### Should Have (P1)

**US-2.6: Select All**
> As a reviewer, I want to select all visible items with one action, so that I can quickly apply changes to everything.

*Acceptance Criteria:*
- "Select All" checkbox in tree header
- Selects all currently visible items
- Respects any active filters
- Clear selection on second click

**US-2.7: Clear Selection**
> As a reviewer, I want to clear my selection with one action, so that I can start over.

*Acceptance Criteria:*
- "Clear" button in floating action bar
- Keyboard shortcut: Escape
- Clears all selections immediately

### Nice to Have (P2)

**US-2.8: Bulk Delete**
> As a reviewer, I want to delete multiple items at once, so that I can quickly remove unwanted stories.

*Acceptance Criteria:*
- "Delete" option in action bar (with confirmation)
- Confirmation modal: "Delete 5 items? This cannot be undone."
- Success toast with count

---

## 3. Functional Requirements

### Selection Mechanics

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-2.01 | Checkbox visible on tree node hover/focus | E2E test |
| FR-2.02 | Checkbox always visible when item is selected | E2E test |
| FR-2.03 | Click checkbox toggles selection state | Unit test |
| FR-2.04 | Selection state stored in Zustand store | Unit test |
| FR-2.05 | Selected items highlighted with bg-toucan-orange/20 | E2E test |
| FR-2.06 | Shift+click selects range from last selected | Unit test |
| FR-2.07 | Range determined by visual/DOM order | Unit test |
| FR-2.08 | Ctrl/Cmd+click same as checkbox click | E2E test |
| FR-2.09 | Selection count updates in real-time | Unit test |
| FR-2.10 | Selection persists across tree expand/collapse | E2E test |
| FR-2.11 | Maximum 100 items selectable (soft limit with warning) | Unit test |

### Bulk Operations

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-2.12 | Floating action bar appears when selection > 0 | E2E test |
| FR-2.13 | Action bar positioned fixed bottom center | E2E test |
| FR-2.14 | Action bar shows "{n} selected" badge | E2E test |
| FR-2.15 | "Set Size" button opens size selection modal | E2E test |
| FR-2.16 | "Set Status" button opens status selection modal | E2E test |
| FR-2.17 | "AI Enhance" button opens enhancement modal | E2E test |
| FR-2.18 | "Clear" button clears selection | E2E test |
| FR-2.19 | Updates sent as single batch API call | Integration test |
| FR-2.20 | Loading spinner shown during API call | E2E test |
| FR-2.21 | Success toast shows count of updated items | E2E test |
| FR-2.22 | Selection cleared after successful operation | E2E test |
| FR-2.23 | Tree data refreshed after operation | Integration test |

### Undo Functionality

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-2.24 | Bulk operation returns undoToken | Integration test |
| FR-2.25 | undoToken stored in selectionStore | Unit test |
| FR-2.26 | "Undo" button visible when undoToken exists | E2E test |
| FR-2.27 | Undo API reverts all items to previous values | Integration test |
| FR-2.28 | undoToken invalidated after successful undo | Integration test |
| FR-2.29 | undoToken expires after 1 hour | Integration test |
| FR-2.30 | New bulk operation replaces previous undoToken | Unit test |

### AI Enhancement

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-2.31 | Enhancement modal has "What to add" textarea | E2E test |
| FR-2.32 | Enhancement modal has "Context" input (optional) | E2E test |
| FR-2.33 | Enhancement prompt minimum 10 characters | Unit test |
| FR-2.34 | Each item gets individual AI call | Integration test |
| FR-2.35 | AI generates unique content per item based on item's title/description | AI evaluation |
| FR-2.36 | Content appended to technicalNotes with separator | Integration test |
| FR-2.37 | Progress indicator: "Enhancing 3 of 12..." | E2E test |
| FR-2.38 | Partial failure continues processing remaining items | Integration test |
| FR-2.39 | Failed items reported in response | Integration test |
| FR-2.40 | Undo reverts technicalNotes to pre-enhancement state | Integration test |

---

## 4. Non-Functional Requirements

### Performance

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| Selection toggle | < 50ms perceived | Manual testing |
| Bulk update (50 items) | < 2 seconds | Integration test |
| AI enhancement (10 items) | < 30 seconds | Integration test |
| Undo operation | < 2 seconds | Integration test |

### Scalability

| Requirement | Target |
|-------------|--------|
| Max items per selection | 100 (warn at 50) |
| Max items per API call | 100 |
| Concurrent AI calls | 3 (to avoid rate limits) |

### Reliability

| Requirement | Implementation |
|-------------|----------------|
| Partial failure | Report failed items, continue with successful |
| Undo persistence | Database-stored, survives page refresh |
| Optimistic UI | Selection updates immediately |

---

## 5. Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    ReviewPage                             │   │
│  │  ┌────────────────┐  ┌────────────────────────────────┐  │   │
│  │  │ WorkBreakdown  │  │        StoryEditor             │  │   │
│  │  │ Tree           │  │                                │  │   │
│  │  │ ┌────────────┐ │  │                                │  │   │
│  │  │ │ TreeNode   │ │  │                                │  │   │
│  │  │ │ +checkbox  │ │  │                                │  │   │
│  │  │ └────────────┘ │  │                                │  │   │
│  │  └────────────────┘  └────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              BulkActionBar (fixed position)               │   │
│  │  [12 selected] [Set Size ▼] [Set Status ▼] [AI Enhance]  │   │
│  │  [Clear] [Undo]                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    SelectionStore                         │   │
│  │  • selectedIds: Set<string>                               │   │
│  │  • lastSelectedId: string                                 │   │
│  │  • undoToken: string | null                               │   │
│  │  • toggleItem(), selectRange(), clearSelection()          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  bulk.ts routes                           │   │
│  │  POST /api/workitems/bulk                                 │   │
│  │  POST /api/workitems/bulk/ai-enhance                      │   │
│  │  POST /api/workitems/bulk/undo                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                BulkOperationService                       │   │
│  │  • updateFields(itemIds, updates, userId)                 │   │
│  │  • aiEnhance(itemIds, enhancement, context, userId)       │   │
│  │  • undo(undoToken)                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │ ClaudeService │  │ HistoryService│  │ PrismaClient  │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow: Bulk Update

```
1. User selects items via checkboxes
   └─► selectionStore.selectedIds updated

2. User clicks "Set Size" → "M"
   └─► BulkActionBar dispatches

3. POST /api/workitems/bulk
   {
     itemIds: ["id1", "id2", "id3"],
     updates: { sizeEstimate: "M" }
   }

4. BulkOperationService.updateFields()
   ├─► Fetch current values for all items
   ├─► Store in BulkOperation record (for undo)
   ├─► prisma.workItem.updateMany()
   ├─► Create WorkItemHistory records
   └─► Return { updated: 3, undoToken: "..." }

5. Frontend receives response
   ├─► selectionStore.setUndoToken()
   ├─► selectionStore.clearSelection()
   ├─► treeStore.refresh()
   └─► Show toast "Updated 3 items"
```

### Data Flow: AI Enhancement

```
1. User selects items, clicks "AI Enhance"
   └─► Enhancement modal opens

2. User enters:
   - Enhancement: "Add security considerations"
   - Context: "Healthcare app with PHI"

3. POST /api/workitems/bulk/ai-enhance
   {
     itemIds: ["id1", "id2"],
     enhancement: "Add security considerations",
     context: "Healthcare app with PHI"
   }

4. BulkOperationService.aiEnhance()
   ├─► Store current technicalNotes (for undo)
   │
   ├─► For each item (sequential):
   │   ├─► Build prompt with item's title, description
   │   ├─► Call ClaudeService.completeJSON()
   │   ├─► Append result to technicalNotes
   │   └─► Update progress
   │
   ├─► Create BulkOperation record
   └─► Return { enhanced: 2, undoToken: "..." }

5. Frontend shows progress, then result
```

### Design Decisions

**Decision 1: Zustand Store for Selection**
- **Choice**: Dedicated `selectionStore` separate from `treeStore`
- **Rationale**: Selection is cross-cutting (affects tree, action bar, potentially other components). Separation of concerns.
- **Reference**: Follows existing pattern of specialized stores (editorStore, historyStore)

**Decision 2: Fixed Position Action Bar**
- **Choice**: Action bar fixed at bottom center, appears when selection > 0
- **Rationale**: Always visible regardless of scroll position. Common pattern (Gmail, Figma).
- **Reference**: Wathan/Schoger - "UI controls that apply to selected items should remain visible"

**Decision 3: Database-Stored Undo**
- **Choice**: Store previous values in BulkOperation table, not localStorage
- **Rationale**: 
  - Survives page refresh
  - Server can validate undo request
  - Automatic cleanup via expiration
- **Trade-off**: Extra database write, but reliability worth it

**Decision 4: Sequential AI Processing**
- **Choice**: Process items one at a time, not parallel
- **Rationale**:
  - Avoid Claude rate limits
  - Show meaningful progress
  - Handle partial failures gracefully
- **Trade-off**: Slower (10 items ≈ 20-30 seconds vs 5-10 seconds parallel)

---

## 6. Data Model

### New Table

```prisma
model BulkOperation {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  specId          String   @map("spec_id")
  operation       String   // 'update_fields' | 'ai_enhance'
  itemIds         String[] @map("item_ids")
  payload         Json     // What was applied
  previousValues  Json     @map("previous_values") // For undo
  createdAt       DateTime @default(now()) @map("created_at")
  expiresAt       DateTime @map("expires_at")
  
  @@index([userId])
  @@index([specId])
  @@index([expiresAt])
  @@map("bulk_operations")
}
```

### Field Specifications

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| operation | String | 'update_fields' or 'ai_enhance' | Determines undo logic |
| itemIds | String[] | Max 100 | PostgreSQL array type |
| payload | Json | - | `{sizeEstimate: 'M'}` or `{enhancement: '...', context: '...'}` |
| previousValues | Json | - | Array of per-item previous state |
| expiresAt | DateTime | createdAt + 1 hour | For cleanup |

### previousValues Schema

**For update_fields:**
```json
[
  {
    "itemId": "uuid-1",
    "fields": {
      "sizeEstimate": "S",
      "status": "draft"
    }
  },
  {
    "itemId": "uuid-2", 
    "fields": {
      "sizeEstimate": null,
      "status": "draft"
    }
  }
]
```

**For ai_enhance:**
```json
[
  {
    "itemId": "uuid-1",
    "technicalNotes": "Original notes before enhancement"
  },
  {
    "itemId": "uuid-2",
    "technicalNotes": null
  }
]
```

### Migration

```sql
-- Migration: add_bulk_operations

CREATE TABLE "bulk_operations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" VARCHAR(255) NOT NULL,
    "spec_id" UUID NOT NULL,
    "operation" VARCHAR(50) NOT NULL,
    "item_ids" UUID[] NOT NULL,
    "payload" JSONB NOT NULL,
    "previous_values" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "bulk_operations_user_id_idx" ON "bulk_operations"("user_id");
CREATE INDEX "bulk_operations_spec_id_idx" ON "bulk_operations"("spec_id");
CREATE INDEX "bulk_operations_expires_at_idx" ON "bulk_operations"("expires_at");
```

---

## 7. API Design

### POST /api/workitems/bulk

**Description**: Apply field updates to multiple work items.

**Request**:
```json
{
  "itemIds": ["uuid-1", "uuid-2", "uuid-3"],
  "updates": {
    "sizeEstimate": "M"
  }
}
```

**Allowed update fields:**
- `sizeEstimate`: "S" | "M" | "L" | "XL"
- `status`: "draft" | "ready_for_review" | "approved"

**Response 200 OK**:
```json
{
  "data": {
    "updated": 3,
    "failed": 0,
    "failures": [],
    "undoToken": "bulk_abc123",
    "undoExpiresAt": "2024-12-30T12:30:00Z"
  }
}
```

**Response 200 OK (partial failure)**:
```json
{
  "data": {
    "updated": 2,
    "failed": 1,
    "failures": [
      {
        "itemId": "uuid-3",
        "error": "Item not found"
      }
    ],
    "undoToken": "bulk_abc123",
    "undoExpiresAt": "2024-12-30T12:30:00Z"
  }
}
```

**Response 400 Bad Request**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "itemIds array required with 1-100 items"
  }
}
```

### POST /api/workitems/bulk/ai-enhance

**Description**: Generate AI content for multiple items.

**Request**:
```json
{
  "itemIds": ["uuid-1", "uuid-2"],
  "enhancement": "Add security considerations for PHI data handling",
  "context": "Healthcare SaaS application"
}
```

**Response 200 OK**:
```json
{
  "data": {
    "enhanced": 2,
    "failed": 0,
    "failures": [],
    "enhancements": [
      {
        "itemId": "uuid-1",
        "addedContent": "**Security Considerations:**\n- Encrypt PHI at rest using AES-256..."
      },
      {
        "itemId": "uuid-2", 
        "addedContent": "**Security Considerations:**\n- Implement role-based access control..."
      }
    ],
    "undoToken": "bulk_xyz789",
    "undoExpiresAt": "2024-12-30T12:30:00Z"
  }
}
```

### POST /api/workitems/bulk/undo

**Description**: Revert a bulk operation.

**Request**:
```json
{
  "undoToken": "bulk_abc123"
}
```

**Response 200 OK**:
```json
{
  "data": {
    "reverted": 3,
    "operation": "update_fields"
  }
}
```

**Response 404 Not Found**:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Undo token not found or expired"
  }
}
```

---

## 8. AI/ML Components

### Enhancement Prompt

**Model**: Claude Haiku (cost-effective for short generations)  
**Temperature**: 0.3 (some creativity, but consistent)  
**Max Tokens**: 500

```
You are enhancing a software development work item with additional technical notes.

## Work Item
- **Title**: {{title}}
- **Type**: {{type}}
- **Description**: {{description}}
- **Current Technical Notes**: {{technicalNotes}}

## Project Context
{{context}}

## Enhancement Request
{{enhancement}}

## Instructions
Generate a concise addition (2-4 sentences, max 150 words) that:
1. Is specific to THIS work item (not generic boilerplate)
2. Adds actionable technical guidance
3. Relates to the enhancement request
4. Complements (not duplicates) existing technical notes

## Output Format
Return JSON only:
{
  "addition": "Your generated content here..."
}
```

### Evaluation Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Uniqueness | Each item gets different content | Manual review |
| Relevance | Content relates to item's title/description | Manual review |
| Conciseness | 50-150 words | Automated check |
| Actionability | Contains specific guidance | Manual review |

### Fallback Behavior

1. **If AI call fails for one item**: Log error, continue with next item, report in response
2. **If AI returns invalid JSON**: Retry once, then skip item
3. **If all items fail**: Return error response, no BulkOperation created

---

## 9. UI/UX Specification

### Component Hierarchy

```
ReviewPage (existing)
├── ... existing components ...
│
├── WorkBreakdownTree (modify)
│   └── TreeNode (modify)
│       ├── SelectionCheckbox (new atom)
│       │   └── Checkbox input
│       └── ... existing node content ...
│
└── BulkActionBar (new organism)
    ├── SelectionBadge (molecule)
    │   └── "{n} selected" text
    ├── ActionButtons (molecule)
    │   ├── SetSizeButton (atom) → opens SetSizeModal
    │   ├── SetStatusButton (atom) → opens SetStatusModal
    │   ├── AIEnhanceButton (atom) → opens AIEnhanceModal
    │   └── ClearButton (atom)
    └── UndoButton (atom) - conditional

SetSizeModal (organism)
├── ModalHeader
├── SizeButtonGroup (molecule)
│   └── SizeButton (atom) × 4 (S, M, L, XL)
└── ModalFooter (Cancel only - selection triggers close)

SetStatusModal (organism)
├── ModalHeader
├── StatusButtonGroup (molecule)
│   └── StatusButton (atom) × 3
└── ModalFooter

AIEnhanceModal (organism)
├── ModalHeader ("AI Enhance {n} Items")
├── EnhancementTextarea (molecule)
│   ├── Label "What should be added?"
│   └── Textarea (required, min 10 chars)
├── ContextInput (molecule)
│   ├── Label "Project context (optional)"
│   └── TextInput
├── ProgressIndicator (molecule) - during processing
│   ├── ProgressBar
│   └── "Enhancing 3 of 12..."
└── ModalFooter
    ├── CancelButton
    └── EnhanceButton (disabled while processing)
```

### Visual Design

**Selection Checkbox**:
```tsx
// Appears on hover, always visible when selected
<div className="absolute left-0 top-1/2 -translate-y-1/2 
  opacity-0 group-hover:opacity-100 
  data-[selected=true]:opacity-100">
  <input 
    type="checkbox"
    className="w-4 h-4 rounded border-toucan-dark-border 
      bg-toucan-dark checked:bg-toucan-orange 
      focus:ring-2 focus:ring-toucan-orange"
  />
</div>
```

**Selected Item Highlight**:
```tsx
<div className={cn(
  "pl-8 pr-3 py-2 rounded",
  isSelected && "bg-toucan-orange/20 border-l-2 border-toucan-orange"
)}>
```

**Floating Action Bar**:
```tsx
<div className="fixed bottom-6 left-1/2 -translate-x-1/2 
  bg-toucan-dark-lighter border border-toucan-dark-border 
  rounded-lg shadow-xl px-4 py-3 flex items-center gap-4 z-50">
```

### Interactions

**Checkbox Click**:
1. Toggle selection state
2. Update selectionStore
3. Store lastSelectedId for range selection

**Shift+Click**:
1. Get lastSelectedId from store
2. Find both items in flattened tree
3. Select all items between (inclusive)
4. Update lastSelectedId

**Action Button Click**:
1. Open respective modal
2. On confirm, call API
3. Show loading state in modal
4. On success: close modal, clear selection, show toast
5. On error: show error in modal, keep selection

**Undo Click**:
1. Call undo API
2. On success: clear undoToken, refresh tree, show toast
3. On error: show error toast, keep undoToken

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Escape | Clear selection |
| Ctrl/Cmd+A | Select all visible (when tree focused) |
| Space | Toggle selection on focused item |

### Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| Desktop (≥1024px) | Action bar shows all buttons inline |
| Tablet (768-1023px) | Action bar shows icons only, tooltips on hover |
| Mobile (<768px) | Action bar becomes bottom sheet with stacked buttons |

---

## 10. Testing Strategy

### Unit Tests

**selectionStore.test.ts**:
```typescript
import { useSelectionStore } from './selectionStore';
import { act, renderHook } from '@testing-library/react';

describe('selectionStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useSelectionStore());
    act(() => result.current.clearSelection());
  });

  describe('toggleItem', () => {
    it('adds item to selection when not selected', () => {
      const { result } = renderHook(() => useSelectionStore());
      
      act(() => result.current.toggleItem('item-1'));
      
      expect(result.current.selectedIds.has('item-1')).toBe(true);
      expect(result.current.lastSelectedId).toBe('item-1');
    });

    it('removes item from selection when already selected', () => {
      const { result } = renderHook(() => useSelectionStore());
      
      act(() => {
        result.current.toggleItem('item-1');
        result.current.toggleItem('item-1');
      });
      
      expect(result.current.selectedIds.has('item-1')).toBe(false);
    });
  });

  describe('selectRange', () => {
    it('selects all items between last selected and current', () => {
      const { result } = renderHook(() => useSelectionStore());
      const allIds = ['item-1', 'item-2', 'item-3', 'item-4', 'item-5'];
      
      act(() => {
        result.current.toggleItem('item-2'); // Last selected
        result.current.selectRange('item-2', 'item-4', allIds);
      });
      
      expect(result.current.selectedIds.size).toBe(3);
      expect(result.current.selectedIds.has('item-2')).toBe(true);
      expect(result.current.selectedIds.has('item-3')).toBe(true);
      expect(result.current.selectedIds.has('item-4')).toBe(true);
    });

    it('works in reverse direction', () => {
      const { result } = renderHook(() => useSelectionStore());
      const allIds = ['item-1', 'item-2', 'item-3', 'item-4', 'item-5'];
      
      act(() => {
        result.current.toggleItem('item-4');
        result.current.selectRange('item-4', 'item-2', allIds);
      });
      
      expect(result.current.selectedIds.size).toBe(3);
    });
  });

  describe('clearSelection', () => {
    it('clears all selections and lastSelectedId', () => {
      const { result } = renderHook(() => useSelectionStore());
      
      act(() => {
        result.current.toggleItem('item-1');
        result.current.toggleItem('item-2');
        result.current.clearSelection();
      });
      
      expect(result.current.selectedIds.size).toBe(0);
      expect(result.current.lastSelectedId).toBe(null);
    });

    it('preserves undoToken', () => {
      const { result } = renderHook(() => useSelectionStore());
      
      act(() => {
        result.current.toggleItem('item-1');
        result.current.setUndoToken('token-123', new Date());
        result.current.clearSelection();
      });
      
      expect(result.current.undoToken).toBe('token-123');
    });
  });
});
```

**BulkOperationService.test.ts**:
```typescript
describe('BulkOperationService', () => {
  describe('updateFields', () => {
    it('updates all items with provided fields', async () => {
      const itemIds = [await createWorkItem(), await createWorkItem()];
      
      const result = await service.updateFields(
        itemIds,
        { sizeEstimate: 'M' },
        userId
      );
      
      expect(result.updated).toBe(2);
      
      const items = await prisma.workItem.findMany({
        where: { id: { in: itemIds } }
      });
      expect(items.every(i => i.sizeEstimate === 'M')).toBe(true);
    });

    it('creates BulkOperation record for undo', async () => {
      const itemIds = [await createWorkItem({ sizeEstimate: 'S' })];
      
      const result = await service.updateFields(
        itemIds,
        { sizeEstimate: 'M' },
        userId
      );
      
      const bulkOp = await prisma.bulkOperation.findUnique({
        where: { id: result.undoToken }
      });
      
      expect(bulkOp).toBeDefined();
      expect(bulkOp.operation).toBe('update_fields');
      expect(bulkOp.previousValues[0].fields.sizeEstimate).toBe('S');
    });

    it('creates WorkItemHistory records', async () => {
      const itemId = await createWorkItem({ sizeEstimate: 'S' });
      
      await service.updateFields([itemId], { sizeEstimate: 'M' }, userId);
      
      const history = await prisma.workItemHistory.findMany({
        where: { workItemId: itemId }
      });
      
      expect(history).toHaveLength(1);
      expect(history[0].fieldChanged).toBe('sizeEstimate');
      expect(history[0].oldValue).toBe('S');
      expect(history[0].newValue).toBe('M');
    });

    it('handles partial failure gracefully', async () => {
      const validId = await createWorkItem();
      const invalidId = 'non-existent-id';
      
      const result = await service.updateFields(
        [validId, invalidId],
        { sizeEstimate: 'M' },
        userId
      );
      
      expect(result.updated).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.failures[0].itemId).toBe(invalidId);
    });
  });

  describe('aiEnhance', () => {
    it('generates unique content per item', async () => {
      const item1 = await createWorkItem({ title: 'User login' });
      const item2 = await createWorkItem({ title: 'Payment processing' });
      
      const result = await service.aiEnhance(
        [item1, item2],
        'Add security notes',
        'E-commerce app',
        userId
      );
      
      expect(result.enhancements[0].addedContent).not.toBe(
        result.enhancements[1].addedContent
      );
    });

    it('appends to existing technical notes', async () => {
      const itemId = await createWorkItem({ 
        technicalNotes: 'Existing notes here' 
      });
      
      await service.aiEnhance([itemId], 'Add more', '', userId);
      
      const item = await prisma.workItem.findUnique({ 
        where: { id: itemId } 
      });
      
      expect(item.technicalNotes).toContain('Existing notes here');
      expect(item.technicalNotes).toContain('---');
    });
  });

  describe('undo', () => {
    it('reverts items to previous values', async () => {
      const itemId = await createWorkItem({ sizeEstimate: 'S' });
      
      const { undoToken } = await service.updateFields(
        [itemId],
        { sizeEstimate: 'M' },
        userId
      );
      
      await service.undo(undoToken);
      
      const item = await prisma.workItem.findUnique({ 
        where: { id: itemId } 
      });
      expect(item.sizeEstimate).toBe('S');
    });

    it('deletes BulkOperation record after undo', async () => {
      const itemId = await createWorkItem();
      const { undoToken } = await service.updateFields(
        [itemId],
        { sizeEstimate: 'M' },
        userId
      );
      
      await service.undo(undoToken);
      
      const bulkOp = await prisma.bulkOperation.findUnique({
        where: { id: undoToken }
      });
      expect(bulkOp).toBeNull();
    });

    it('throws for expired/invalid token', async () => {
      await expect(service.undo('invalid-token'))
        .rejects.toThrow('not found');
    });
  });
});
```

### Integration Tests

**bulk.routes.test.ts**:
```typescript
describe('POST /api/workitems/bulk', () => {
  it('updates multiple items', async () => {
    const items = await createTestWorkItems(3);
    
    const response = await app.inject({
      method: 'POST',
      url: '/api/workitems/bulk',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        itemIds: items.map(i => i.id),
        updates: { sizeEstimate: 'L' }
      }
    });
    
    expect(response.statusCode).toBe(200);
    expect(response.json().data.updated).toBe(3);
    expect(response.json().data.undoToken).toBeDefined();
  });

  it('rejects empty itemIds', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/workitems/bulk',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        itemIds: [],
        updates: { sizeEstimate: 'L' }
      }
    });
    
    expect(response.statusCode).toBe(400);
  });

  it('rejects more than 100 items', async () => {
    const itemIds = Array(101).fill('fake-id');
    
    const response = await app.inject({
      method: 'POST',
      url: '/api/workitems/bulk',
      headers: { authorization: `Bearer ${token}` },
      payload: { itemIds, updates: { sizeEstimate: 'L' } }
    });
    
    expect(response.statusCode).toBe(400);
  });
});

describe('POST /api/workitems/bulk/undo', () => {
  it('reverts bulk operation', async () => {
    const items = await createTestWorkItems(2, { sizeEstimate: 'S' });
    
    // First, do bulk update
    const updateResponse = await app.inject({
      method: 'POST',
      url: '/api/workitems/bulk',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        itemIds: items.map(i => i.id),
        updates: { sizeEstimate: 'XL' }
      }
    });
    
    const { undoToken } = updateResponse.json().data;
    
    // Then undo
    const undoResponse = await app.inject({
      method: 'POST',
      url: '/api/workitems/bulk/undo',
      headers: { authorization: `Bearer ${token}` },
      payload: { undoToken }
    });
    
    expect(undoResponse.statusCode).toBe(200);
    expect(undoResponse.json().data.reverted).toBe(2);
    
    // Verify items reverted
    const updatedItems = await prisma.workItem.findMany({
      where: { id: { in: items.map(i => i.id) } }
    });
    expect(updatedItems.every(i => i.sizeEstimate === 'S')).toBe(true);
  });
});
```

### E2E Tests

**bulk-editing.spec.ts**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Bulk Editing', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await navigateToSpecWithWorkItems(page);
  });

  test('select items via checkbox', async ({ page }) => {
    // Hover to reveal checkbox
    await page.locator('[data-testid="tree-node"]').first().hover();
    
    // Click checkbox
    await page.locator('[data-testid="selection-checkbox"]').first().click();
    
    // Verify action bar appears
    await expect(page.locator('[data-testid="bulk-action-bar"]')).toBeVisible();
    await expect(page.locator('[data-testid="selection-count"]')).toHaveText('1 selected');
  });

  test('shift-click range selection', async ({ page }) => {
    const nodes = page.locator('[data-testid="tree-node"]');
    
    // Click first item
    await nodes.nth(0).locator('[data-testid="selection-checkbox"]').click();
    
    // Shift-click fifth item
    await nodes.nth(4).click({ modifiers: ['Shift'] });
    
    // Verify 5 items selected
    await expect(page.locator('[data-testid="selection-count"]')).toHaveText('5 selected');
  });

  test('bulk set size', async ({ page }) => {
    // Select 3 items
    for (let i = 0; i < 3; i++) {
      await page.locator('[data-testid="tree-node"]').nth(i).hover();
      await page.locator('[data-testid="selection-checkbox"]').nth(i).click();
    }
    
    // Click Set Size
    await page.click('[data-testid="set-size-button"]');
    
    // Select M
    await page.click('[data-testid="size-option-M"]');
    
    // Wait for modal to close
    await expect(page.locator('[data-testid="set-size-modal"]')).not.toBeVisible();
    
    // Verify toast
    await expect(page.locator('[data-testid="toast"]')).toContainText('Updated 3 items');
    
    // Verify selection cleared
    await expect(page.locator('[data-testid="bulk-action-bar"]')).not.toBeVisible();
  });

  test('undo bulk operation', async ({ page }) => {
    // Select and update
    await page.locator('[data-testid="tree-node"]').first().hover();
    await page.locator('[data-testid="selection-checkbox"]').first().click();
    await page.click('[data-testid="set-size-button"]');
    await page.click('[data-testid="size-option-XL"]');
    
    // Click undo
    await page.click('[data-testid="undo-button"]');
    
    // Verify undo toast
    await expect(page.locator('[data-testid="toast"]')).toContainText('Reverted');
    
    // Verify undo button disappears
    await expect(page.locator('[data-testid="undo-button"]')).not.toBeVisible();
  });
});
```

---

## 11. Implementation Plan

### Build Order

```
Phase 1: Backend (60 min)
├── 1.1 Database migration (15 min)
│   └── Add BulkOperation table
├── 1.2 BulkOperationService (30 min)
│   ├── updateFields()
│   ├── aiEnhance()
│   └── undo()
└── 1.3 Routes (15 min)
    ├── POST /api/workitems/bulk
    ├── POST /api/workitems/bulk/ai-enhance
    └── POST /api/workitems/bulk/undo

Phase 2: Frontend State (30 min)
├── 2.1 selectionStore (20 min)
│   ├── selectedIds, lastSelectedId, undoToken
│   └── toggleItem, selectRange, clearSelection
└── 2.2 API client additions (10 min)
    └── bulkApi functions

Phase 3: Frontend Components (60 min)
├── 3.1 SelectionCheckbox atom (15 min)
├── 3.2 Modify TreeNode (15 min)
│   └── Add checkbox, selection styling
├── 3.3 BulkActionBar organism (20 min)
└── 3.4 Modals (10 min)
    ├── SetSizeModal
    ├── SetStatusModal
    └── AIEnhanceModal

Phase 4: Integration & Testing (30 min)
├── 4.1 Wire up ReviewPage
├── 4.2 Unit tests
└── 4.3 Integration tests
```

### Files to Create/Modify

**New Files:**
- `backend/prisma/migrations/xxx_add_bulk_operations/migration.sql`
- `backend/src/services/BulkOperationService.ts`
- `backend/src/routes/bulk.ts`
- `frontend/src/stores/selectionStore.ts`
- `frontend/src/components/atoms/SelectionCheckbox.tsx`
- `frontend/src/components/organisms/BulkActionBar.tsx`
- `frontend/src/components/organisms/SetSizeModal.tsx`
- `frontend/src/components/organisms/SetStatusModal.tsx`
- `frontend/src/components/organisms/AIEnhanceModal.tsx`

**Modified Files:**
- `backend/src/index.ts` - Register bulk routes
- `frontend/src/components/molecules/TreeNode.tsx` - Add checkbox
- `frontend/src/pages/ReviewPage.tsx` - Add BulkActionBar
- `frontend/src/services/api.ts` - Add bulk API functions

### No New Dependencies

All functionality uses existing:
- Prisma for database
- ClaudeService for AI
- Zustand for state
- Existing UI components (Modal, Button, etc.)

---

## 12. Open Questions

### Requiring Stakeholder Input

1. **Should bulk delete be included in v1?**
   - Risk: Accidental deletion of many items
   - Mitigation: Confirmation modal, but no undo
   - **Recommendation**: Defer to v2, focus on non-destructive operations
   - **Decision needed by**: Before frontend implementation

2. **Maximum items for AI enhancement?**
   - Current proposal: 10 items (≈30 seconds processing)
   - Alternative: Allow up to 50 with "this may take several minutes" warning
   - **Recommendation**: Start with 10, increase based on feedback
   - **Decision needed by**: Before AI enhancement implementation

### Technical Unknowns

None significant - this feature uses well-established patterns.

### External Dependencies

- Claude API for AI enhancement (existing integration)
- Rate limits: ~10 requests/minute is safe

---

## Appendix A: AI Enhancement Prompt Examples

### Input
```
Work Item:
- Title: "Implement user password reset"
- Type: story
- Description: "Allow users to reset their password via email"
- Current Technical Notes: "Use existing email service"

Project Context: Healthcare application with PHI

Enhancement Request: Add security considerations
```

### Output
```json
{
  "addition": "**Security Considerations**: Password reset tokens must expire within 15 minutes and be single-use. Store tokens hashed (SHA-256) to prevent database compromise from exposing active tokens. Log all reset attempts for audit trail. Consider rate limiting to prevent enumeration attacks."
}
```

---

## Appendix B: Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| VALIDATION_ERROR | 400 | Invalid input (itemIds, updates) |
| UNAUTHORIZED | 401 | Missing/invalid auth token |
| NOT_FOUND | 404 | Undo token not found/expired |
| TOO_MANY_ITEMS | 400 | More than 100 items |
| ENHANCEMENT_REQUIRED | 400 | AI enhance missing prompt |

---

*End of Feature 2 Specification*
