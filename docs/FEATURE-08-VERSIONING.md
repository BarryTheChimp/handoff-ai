# Feature 8: Spec Versioning & Diff

## Complete Build Specification

**Version**: 1.0  
**Last Updated**: December 2024  
**Estimated Build Time**: 3-4 hours  
**Complexity**: Medium-High  
**Dependencies**: Feature 1 (Multi-File Upload) recommended

---

## 1. Overview

### What We're Building
Version control for spec documents allowing users to upload new versions, view version history, and see diffs between versions. When a new spec version is uploaded, AI identifies which work items need updating based on what changed.

### Why We're Building It
Specs evolve during development:
- Requirements clarified after stakeholder feedback
- Scope changes mid-project
- Technical constraints discovered

Currently, re-uploading a spec creates new work items, losing all edits. Teams need to see what changed and selectively update work items.

### Success Criteria
1. Upload new version of existing spec
2. View version history with timestamps
3. Visual diff between any two versions
4. AI identifies impacted work items
5. Selective update: keep some items, regenerate others

---

## 2. User Stories

### Must Have (P0)

**US-8.1: Upload New Version**
> As a PM, I want to upload a new version of my spec, so that I can update requirements without losing work.

*Acceptance Criteria:*
- "Upload New Version" on spec page
- Validates same format as original
- Creates new version record
- Preserves all existing work items

**US-8.2: View Version History**
> As a PM, I want to see all versions of a spec, so that I can track changes over time.

*Acceptance Criteria:*
- List of versions with timestamps and uploader
- Current version indicated
- Can view/download any version
- Shows change summary per version

**US-8.3: Visual Diff**
> As a PM, I want to see what changed between versions, so that I understand the impact.

*Acceptance Criteria:*
- Select two versions to compare
- Side-by-side diff view
- Additions in green, deletions in red
- Section-level and line-level diff
- Can export diff as PDF

**US-8.4: Impact Analysis**
> As a PM, I want AI to identify which stories are affected by changes, so that I know what to update.

*Acceptance Criteria:*
- After version upload, AI analyzes changes
- Lists work items likely affected
- Confidence indicator per item
- Shows which changes impact each item

**US-8.5: Selective Regeneration**
> As a PM, I want to regenerate specific stories based on changes, so that I update only what's needed.

*Acceptance Criteria:*
- Checkbox to select items for regeneration
- "Regenerate Selected" button
- Uses new spec version as context
- Creates new version of work item (preserves history)

### Should Have (P1)

**US-8.6: Revert to Previous Version**
> As a PM, I want to revert to a previous spec version.

**US-8.7: Version Notes**
> As a PM, I want to add notes explaining what changed in each version.

---

## 3. Data Model

### New Tables

```prisma
model SpecVersion {
  id            String   @id @default(uuid())
  specId        String   @map("spec_id")
  versionNumber Int      @map("version_number")
  filePath      String   @map("file_path")
  extractedText String?  @db.Text @map("extracted_text")
  notes         String?  @db.Text
  uploadedBy    String   @map("uploaded_by")
  createdAt     DateTime @default(now()) @map("created_at")
  
  spec          Spec     @relation(fields: [specId], references: [id], onDelete: Cascade)
  
  @@unique([specId, versionNumber])
  @@map("spec_versions")
}

model ImpactAnalysis {
  id            String   @id @default(uuid())
  specId        String   @map("spec_id")
  fromVersion   Int      @map("from_version")
  toVersion     Int      @map("to_version")
  impactedItems Json     @map("impacted_items")  // [{itemId, confidence, reason}]
  createdAt     DateTime @default(now()) @map("created_at")
  
  @@unique([specId, fromVersion, toVersion])
  @@map("impact_analyses")
}
```

### Modify Spec

```prisma
model Spec {
  // ... existing ...
  currentVersion Int @default(1) @map("current_version")
  versions       SpecVersion[]
}
```

---

## 4. API Design

### POST /api/specs/:specId/versions
Upload new version.

### GET /api/specs/:specId/versions
List all versions.

### GET /api/specs/:specId/versions/:versionNumber
Get specific version content.

### GET /api/specs/:specId/diff?from=1&to=2
Get diff between versions.

### POST /api/specs/:specId/analyze-impact
Analyze impact of version change on work items.

### POST /api/specs/:specId/regenerate
Regenerate selected work items from new version.

---

## 5. Key Algorithms

### Diff Generation
Use `diff` library for text comparison:
```typescript
import { diffLines, diffWords } from 'diff';

function generateDiff(oldText: string, newText: string) {
  const changes = diffLines(oldText, newText);
  return changes.map(part => ({
    value: part.value,
    added: part.added || false,
    removed: part.removed || false
  }));
}
```

### Impact Analysis Prompt
```
## Old Spec (Version {{fromVersion}})
{{oldContent}}

## New Spec (Version {{toVersion}})
{{newContent}}

## Changes Summary
{{diffSummary}}

## Existing Work Items
{{workItems}}

## Task
Identify which work items are affected by the changes.

Output JSON:
{
  "impactedItems": [
    {
      "itemId": "...",
      "confidence": "high|medium|low",
      "reason": "Why this item is affected",
      "changedSections": ["2.1", "3.4"]
    }
  ]
}
```

---

## 6. UI Specification

### Version History Panel
```
Version History                    [Upload New Version]

v3 (Current) - Dec 30, 2024, 2:30 PM
   "Updated authentication requirements"
   Uploaded by: john@example.com

v2 - Dec 28, 2024, 10:00 AM
   "Added payment section"
   [View] [Compare with Current]

v1 - Dec 25, 2024, 9:00 AM
   "Initial upload"
   [View] [Compare with Current]
```

### Diff View
```
┌─────────────────────────────────────────────────────────────────┐
│  Compare: v2 ↔ v3                                               │
├─────────────────────────────────────────────────────────────────┤
│  v2                          │  v3                              │
│  ─────────────────────────── │ ──────────────────────────────── │
│  2.1 Authentication          │  2.1 Authentication              │
│                              │                                  │
│  Users must log in with      │  Users must log in with          │
│- email and password          │+ email and password or SSO ←NEW  │
│                              │+ (SAML 2.0 required)     ←NEW    │
│                              │                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Impact Analysis Results
```
┌─────────────────────────────────────────────────────────────────┐
│  Impact Analysis: v2 → v3                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  3 work items likely affected:                                   │
│                                                                  │
│  [✓] User Login (HIGH confidence)                               │
│      Section 2.1 changed - SSO requirement added                │
│                                                                  │
│  [✓] Session Management (MEDIUM confidence)                     │
│      May be affected by authentication changes                  │
│                                                                  │
│  [ ] Password Reset (LOW confidence)                            │
│      Minor overlap with auth section                            │
│                                                                  │
│                     [Regenerate Selected (2)]                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Implementation Plan

```
Phase 1: Backend (2 hours)
├── Migration (SpecVersion, ImpactAnalysis, modify Spec)
├── VersionService
│   ├── createVersion()
│   ├── getVersions()
│   ├── getVersionContent()
│   └── revertToVersion()
├── DiffService
│   └── generateDiff()
├── ImpactService
│   ├── analyzeImpact()
│   └── regenerateItems()
└── Routes

Phase 2: Frontend (1.5 hours)
├── VersionHistoryPanel
├── DiffViewer (side-by-side)
├── ImpactAnalysisModal
├── RegenerateConfirmation
└── Integration
```

### Dependencies
```bash
npm install diff
```

---

## 8. Open Questions

1. **Storage for multiple versions?**
   - Current: Store extracted text in database
   - Alternative: Keep files, extract on demand
   - **Recommendation**: Store extracted text (fast diff)

2. **Regeneration approach?**
   - Option A: Create new work items, archive old
   - Option B: Update in place with history
   - **Recommendation**: Option B (preserve relationships)

---

*End of Feature 8 Specification*
