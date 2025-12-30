# Feature 4: Dependency Visualization

## Complete Build Specification

**Version**: 1.0  
**Last Updated**: December 2024  
**Estimated Build Time**: 3-4 hours  
**Complexity**: Medium

---

## 1. Overview

### What We're Building
An interactive graph visualization showing dependencies between work items using D3.js force-directed layout. Users can add/remove dependencies, view the critical path, and identify circular dependencies.

### Why We're Building It
After AI translation generates 50+ stories, understanding execution order is critical for sprint planning, risk identification, and project duration estimation. Dependencies are currently implicit in specs but not captured in work items.

**Reference**: Torres' opportunity mapping - visualizing relationships reveals patterns invisible in flat lists.

### Success Criteria
1. Add dependency between stories in < 3 clicks
2. Graph renders smoothly with 100+ nodes at 30+ FPS
3. Critical path highlighted automatically
4. Circular dependencies detected and flagged
5. Node positions persist across sessions

---

## 2. User Stories

### Must Have (P0)

**US-4.1: View Dependency Graph**
> As a project manager, I want to see dependencies as a visual graph, so that I can understand execution order.

*Acceptance Criteria:*
- Nodes represent work items, arrows show dependencies
- Node color indicates type (epic/feature/story)
- Can zoom, pan, and drag nodes
- Graph auto-layouts using force simulation

**US-4.2: Add Dependency**
> As a reviewer, I want to add a dependency between stories, so that I can capture execution constraints.

*Acceptance Criteria:*
- Click node → "Add Dependency" → click target
- Dependency saved immediately
- Arrow appears on graph
- Cannot add self-dependency or create cycle

**US-4.3: Remove Dependency**
> As a reviewer, I want to remove a dependency, so that I can correct mistakes.

*Acceptance Criteria:*
- Click dependency arrow → "Remove"
- Deleted immediately, arrow removed

**US-4.4: Critical Path Highlighting**
> As a PM, I want the critical path highlighted, so that I know which stories determine project duration.

*Acceptance Criteria:*
- Critical path (longest chain) shown in red
- Calculated automatically, updates when dependencies change

**US-4.5: Circular Dependency Detection**
> As a reviewer, I want warnings about circular dependencies, so that I can fix impossible execution orders.

*Acceptance Criteria:*
- Cycles detected automatically
- Warning banner with involved nodes
- Cycle-creating dependency rejected before save

### Should Have (P1)

**US-4.6: Filter by Epic**
> As a reviewer, I want to filter to one epic's stories.

**US-4.7: Node Details on Click**
> As a reviewer, I want to see story details when clicking a node.

---

## 3. Functional Requirements

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-4.01 | D3.js force-directed layout | E2E test |
| FR-4.02 | Node color: Epic=blue, Feature=green, Story=orange | E2E test |
| FR-4.03 | Directed arrows show dependencies | E2E test |
| FR-4.04 | Zoom (scroll), Pan (drag background), Drag nodes | E2E test |
| FR-4.05 | Node positions persist in localStorage | Integration |
| FR-4.06 | Add dependency via API with cycle check | Integration |
| FR-4.07 | Critical path = longest path (topological sort + DP) | Unit test |
| FR-4.08 | Detect cycles using DFS | Unit test |
| FR-4.09 | Block save if dependency creates cycle | Integration |
| FR-4.10 | Render 100+ nodes at 30+ FPS | Performance |

---

## 4. Architecture

### Algorithm: Critical Path

```typescript
function calculateCriticalPath(nodes: Node[], edges: Edge[]): string[] {
  // Build adjacency list, compute in-degrees
  // Topological sort (Kahn's algorithm)
  // DP for longest path: dist[v] = max(dist[u] + weight) for all u → v
  // Backtrack from max-dist node to reconstruct path
}
```

### Algorithm: Cycle Detection

```typescript
function wouldCreateCycle(fromId: string, toId: string, edges: Edge[]): boolean {
  // BFS from toId: can we reach fromId?
  // If yes, adding fromId → toId creates cycle
}
```

---

## 5. Data Model

### Modify WorkItem

```prisma
model WorkItem {
  // Add:
  dependsOnIds    String[] @default([]) @map("depends_on_ids")
}
```

### Migration

```sql
ALTER TABLE "work_items" ADD COLUMN "depends_on_ids" UUID[] NOT NULL DEFAULT '{}';
CREATE INDEX "work_items_depends_on_ids_idx" ON "work_items" USING GIN ("depends_on_ids");
```

---

## 6. API Design

### GET /api/specs/:specId/dependencies

```json
{
  "data": {
    "nodes": [{ "id": "...", "title": "...", "type": "story", "sizeEstimate": "M" }],
    "edges": [{ "from": "item-2", "to": "item-1", "isCritical": true }],
    "criticalPath": ["item-1", "item-2", "item-4"],
    "cycles": []
  }
}
```

### POST /api/workitems/:id/dependencies

```json
{ "dependsOnId": "item-1" }
// Returns 400 CYCLE_DETECTED if would create cycle
```

### DELETE /api/workitems/:id/dependencies/:dependsOnId

---

## 7. UI/UX Specification

### Component Hierarchy

```
DependencyGraphPage
├── GraphControls (filter, legend, export)
├── DependencyGraph (D3.js SVG)
│   ├── Nodes layer
│   ├── Edges layer (with arrowhead markers)
│   └── Labels layer
├── NodeDetailPanel (on click)
│   ├── Item summary
│   ├── "Blocked By" list
│   ├── "Blocks" list
│   └── Actions (add dependency, open editor)
└── CycleWarning (if cycles detected)
```

### D3.js Setup

```typescript
const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(edges).id(d => d.id).distance(100))
  .force('charge', d3.forceManyBody().strength(-300))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide().radius(30));
```

---

## 8. Testing Strategy

### Unit Tests
- `calculateCriticalPath()` - various graph shapes
- `detectCycles()` - DAG vs cyclic graphs
- `wouldCreateCycle()` - before/after adding edge

### Integration Tests
- GET returns correct graph structure
- POST adds dependency, updates dependsOnIds
- POST rejects cycle-creating dependency
- DELETE removes dependency

### E2E Tests
- Graph renders, nodes draggable
- Click node opens panel
- Add dependency via UI

---

## 9. Implementation Plan

### Build Order

```
Phase 1: Backend (90 min)
├── Migration
├── DependencyService (graph, add, remove, critical path, cycles)
├── Routes
└── Tests

Phase 2: Frontend (120 min)
├── DependencyGraph component (D3)
├── NodeDetailPanel
├── GraphControls
└── Page integration

Phase 3: Polish (30 min)
├── Critical path highlighting
├── Cycle warning UI
└── Position persistence
```

### Dependencies
```bash
npm install d3 @types/d3
```

---

## 10. Open Questions

1. **Cross-spec dependencies?** Keep single-spec for v1.
2. **Jira export?** Add dependencies to description as text.

---

*End of Feature 4 Specification*
