# Feature 1: Multi-File Upload & Stitching

## Complete Build Specification

**Version**: 1.0  
**Last Updated**: December 2024  
**Estimated Build Time**: 3-4 hours  
**Complexity**: Medium-High

---

## 1. Overview

### What We're Building
A system that allows users to upload multiple specification documents simultaneously, automatically detects conflicts and overlaps between documents, guides users through conflict resolution, and produces a unified context that feeds into the AI translation pipeline.

### Why We're Building It
Real-world projects don't have a single spec document. They have:
- Product Requirements Document (PRD)
- API Specification (OpenAPI/Swagger)
- Technical Design Document
- UX Wireframes with annotations
- Architecture Decision Records

When these are processed separately, the AI loses crucial cross-document context. A feature mentioned in the PRD might have implementation details in the technical doc and API contracts in the OpenAPI spec. Without stitching, the translation produces fragmented, inconsistent work items.

**Reference**: This follows Ousterhout's principle of "information hiding" - the complexity of multi-document reconciliation is hidden behind a simple interface. Users upload files; the system handles the messy business of detecting and resolving conflicts internally.

### Success Criteria
1. Users can drag-and-drop 2-10 spec files in a single action
2. System processes all files and detects conflicts within 60 seconds
3. Users can resolve conflicts with clear, understandable UI
4. Unified context produces 15-25% better story coverage than separate processing
5. Zero data loss - all content from all documents preserved or explicitly discarded

---

## 2. User Stories

### Must Have (P0)

**US-1.1: Batch File Upload**
> As a product manager, I want to upload multiple spec documents at once, so that I don't have to process each file separately.

*Acceptance Criteria:*
- Can drag-drop 2-10 files onto upload zone
- Supported formats: PDF, DOCX, YAML, JSON, MD
- Total upload size limit: 50MB
- Progress indicator shows per-file status
- Can remove files before confirming upload
- Upload continues if one file fails (with error shown)

**US-1.2: Automatic Conflict Detection**
> As a product manager, I want the system to identify where my documents contradict or overlap, so that I can ensure consistency before generating work items.

*Acceptance Criteria:*
- System identifies three conflict types: duplicates, contradictions, overlaps
- Each conflict shows the specific text/section from both documents
- Conflicts are ranked by severity (contradiction > duplicate > overlap)
- Detection completes within 60 seconds for typical document sets
- Zero false positives on clearly unrelated content

**US-1.3: Conflict Resolution**
> As a product manager, I want to choose how to resolve each conflict, so that I maintain control over the final unified spec.

*Acceptance Criteria:*
- Four resolution options: Use Doc A, Use Doc B, Merge Both, Ignore
- "Merge Both" shows preview of combined content
- Can resolve conflicts in any order
- Progress tracker shows resolved vs. remaining
- Can change resolution before finalizing
- "Auto-resolve" option for teams that trust the AI

**US-1.4: Unified Context Generation**
> As a product manager, I want a coherent merged document created from my uploads, so that AI translation has complete context.

*Acceptance Criteria:*
- Generated after all conflicts resolved
- Preserves structure from primary document
- Incorporates supplementary content in logical locations
- Eliminates true duplicates (same information stated twice)
- Resulting context is visible/downloadable for review

### Should Have (P1)

**US-1.5: Spec Group Management**
> As a product manager, I want to manage my uploaded document groups, so that I can add/remove documents or re-process.

*Acceptance Criteria:*
- List view of all spec groups in project
- Can add documents to existing group
- Can remove documents (triggers re-analysis)
- Can delete entire group
- Shows last processing date and status

**US-1.6: Primary Document Selection**
> As a product manager, I want to designate one document as "primary", so that its structure takes precedence during stitching.

*Acceptance Criteria:*
- Can mark one document as primary
- Primary document's headings/structure preserved
- Other documents' content merged into primary structure
- Clear indicator of which document is primary

### Nice to Have (P2)

**US-1.7: Document Relationship Visualization**
> As a product manager, I want to see how my documents relate to each other, so that I understand the coverage and overlap.

*Acceptance Criteria:*
- Venn diagram or matrix showing document relationships
- Click on overlap to see specific sections
- Export as image for stakeholder communication

---

## 3. Functional Requirements

### File Handling

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-1.01 | Accept files via drag-drop or file picker | Playwright E2E test |
| FR-1.02 | Validate file type before upload (PDF, DOCX, YAML, JSON, MD) | Unit test |
| FR-1.03 | Validate total size ≤ 50MB | Unit test |
| FR-1.04 | Validate file count 2-10 | Unit test |
| FR-1.05 | Generate unique group name with timestamp | Unit test |
| FR-1.06 | Allow custom group name | Integration test |
| FR-1.07 | Process uploads in parallel (max 3 concurrent) | Integration test |
| FR-1.08 | Show per-file progress (queued → uploading → processing → done) | E2E test |
| FR-1.09 | Handle partial failure (continue with successful uploads) | Integration test |
| FR-1.10 | Store files in existing storage path structure | Integration test |

### Conflict Detection

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-1.11 | Trigger conflict detection after all files extracted | Integration test |
| FR-1.12 | Detect **duplicates**: Same topic covered identically in multiple docs | AI evaluation |
| FR-1.13 | Detect **contradictions**: Incompatible claims (e.g., "max 100 users" vs "unlimited users") | AI evaluation |
| FR-1.14 | Detect **overlaps**: Same topic with different details/perspectives | AI evaluation |
| FR-1.15 | Provide specific section references for each conflict | Unit test |
| FR-1.16 | Assign severity: Critical (contradiction), Warning (duplicate), Info (overlap) | Unit test |
| FR-1.17 | Complete detection within 60 seconds for ≤5 documents | Performance test |
| FR-1.18 | Store conflicts in database for later resolution | Integration test |
| FR-1.19 | Re-run detection if documents added/removed | Integration test |

### Conflict Resolution

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-1.20 | Display conflicts in severity order | E2E test |
| FR-1.21 | Show source text for both sides of conflict | E2E test |
| FR-1.22 | Offer four resolution types: use_spec1, use_spec2, merge, ignore | E2E test |
| FR-1.23 | For "merge", use AI to generate combined text | Integration test |
| FR-1.24 | Save resolution with timestamp | Integration test |
| FR-1.25 | Allow resolution changes before finalization | E2E test |
| FR-1.26 | Track resolver (user ID) for audit | Integration test |
| FR-1.27 | "Auto-resolve all" uses AI to pick best option for each | Integration test |
| FR-1.28 | Block translation until all conflicts resolved OR user overrides | E2E test |

### Unified Context Generation

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-1.29 | Trigger generation after all conflicts resolved | Integration test |
| FR-1.30 | Use primary document structure as skeleton | AI evaluation |
| FR-1.31 | Insert content from other documents in relevant sections | AI evaluation |
| FR-1.32 | Eliminate redundant content (exact duplicates) | AI evaluation |
| FR-1.33 | Preserve source attribution (which doc each piece came from) | Integration test |
| FR-1.34 | Store stitched context in database | Integration test |
| FR-1.35 | Allow download of stitched context as Markdown | E2E test |
| FR-1.36 | Context used by TranslationService instead of single spec | Integration test |

### Error Handling

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-1.37 | If conflict detection fails, set group status to 'error' | Integration test |
| FR-1.38 | Store error message for debugging | Integration test |
| FR-1.39 | Allow retry of failed operations | E2E test |
| FR-1.40 | If one document fails extraction, continue with others | Integration test |

---

## 4. Non-Functional Requirements

### Performance

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| File upload throughput | ≤ 5 seconds per 5MB file | Load test |
| Conflict detection latency | ≤ 60 seconds for 5 documents | Integration test |
| Context generation latency | ≤ 90 seconds | Integration test |
| Concurrent group processing | Support 10 simultaneous groups | Load test |

### Scalability

| Requirement | Target |
|-------------|--------|
| Documents per group | 2-10 (hard limit) |
| Sections per document | Up to 200 |
| Total context size | Up to 500KB stitched |
| Groups per project | Unlimited |

### Security

| Requirement | Implementation |
|-------------|----------------|
| File type validation | Server-side magic byte checking, not just extension |
| Malware scanning | Defer to infrastructure (not in scope) |
| Access control | Same as existing spec access (project membership) |
| Encryption at rest | Existing storage encryption applies |

### Reliability

| Requirement | Implementation |
|-------------|----------------|
| Idempotency | Re-uploading same files creates new group (not error) |
| Partial failure handling | Continue processing valid files |
| State recovery | Group status persisted; can resume after restart |

---

## 5. Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ BatchUpload     │  │ ConflictPanel   │  │ GroupStatus     │  │
│  │ Dropzone        │  │                 │  │ Component       │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
└───────────┼────────────────────┼────────────────────┼───────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                                │
│  POST /api/projects/:id/specs/batch                             │
│  GET  /api/spec-groups/:id                                      │
│  POST /api/spec-groups/:id/resolve                              │
│  POST /api/spec-groups/:id/translate                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Service Layer                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   SpecGroupService                       │    │
│  │  • createGroup()      - Create group, link specs         │    │
│  │  • analyzeConflicts() - AI conflict detection            │    │
│  │  • resolveConflicts() - Save resolutions                 │    │
│  │  • generateContext()  - AI stitching                     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │ DocumentService│  │ ClaudeService │  │ PrismaClient  │       │
│  │ (extraction)  │  │ (AI calls)    │  │ (persistence) │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ SpecGroup   │  │ SpecConflict│  │    Spec     │              │
│  │             │◄─┤             │  │ (modified)  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Component Interactions

**Upload Flow:**
```
User drops files
    │
    ▼
BatchUploadDropzone validates locally (type, size, count)
    │
    ▼
POST /api/projects/:id/specs/batch (multipart/form-data)
    │
    ▼
For each file:
    ├─► DocumentService.upload() (existing)
    │       └─► Returns specId
    │
    ▼
SpecGroupService.createGroup(projectId, name, specIds[])
    │
    ├─► Creates SpecGroup record (status: 'pending')
    ├─► Links Specs to group via specGroupId
    └─► Returns groupId immediately (202 Accepted)
    │
    ▼ (async, non-blocking)
For each spec:
    └─► DocumentService.extract() (if not already extracted)
    │
    ▼ (when all extracted)
SpecGroupService.analyzeConflicts(groupId)
    │
    ├─► Update status to 'analyzing'
    ├─► Call Claude with conflict detection prompt
    ├─► Create SpecConflict records
    └─► Update status to 'conflicts_detected' or 'ready'
```

**Resolution Flow:**
```
User views conflicts
    │
    ▼
GET /api/spec-groups/:id (includes conflicts array)
    │
    ▼
User selects resolution for each conflict
    │
    ▼
POST /api/spec-groups/:id/resolve
    │
    ▼
SpecGroupService.resolveConflicts()
    │
    ├─► Update SpecConflict records with resolution
    ├─► Check if all resolved
    │       └─► If yes: generateContext()
    │
    ▼ (if all resolved)
SpecGroupService.generateContext()
    │
    ├─► Call Claude with stitching prompt
    ├─► Store stitchedContext in SpecGroup
    └─► Update status to 'ready'
```

### Design Decisions

**Decision 1: Async Processing with Status Polling**
- **Choice**: Return 202 immediately, client polls for status
- **Rationale**: Conflict detection can take 30-60 seconds. HTTP request would timeout.
- **Alternative considered**: WebSocket push. Rejected for complexity; polling is simpler and HTTP-based.
- **Reference**: This follows the pattern from existing translation endpoint.

**Decision 2: Claude Haiku for Detection, Sonnet for Stitching**
- **Choice**: Use Haiku (cheaper, faster) for conflict detection; Sonnet (higher quality) for stitching
- **Rationale**: Detection is classification task (simpler). Stitching requires nuanced merging (harder).
- **Cost impact**: ~$0.02 per detection, ~$0.15 per stitching operation

**Decision 3: Conflicts as Separate Table**
- **Choice**: SpecConflict as dedicated table with foreign key to SpecGroup
- **Rationale**: Conflicts have their own lifecycle (created, resolved). Storing in JSON blob would complicate queries.
- **Reference**: Follows Kleppmann's guidance on modeling relationships explicitly for queryability.

**Decision 4: Stitched Context Stored, Not Computed**
- **Choice**: Store stitchedContext as text in SpecGroup, not regenerate each time
- **Rationale**: Stitching is expensive ($0.15) and slow (30+ seconds). Cache the result.
- **Invalidation**: If documents added/removed, clear stitchedContext and require re-resolution.

---

## 6. Data Model

### New Tables

```prisma
// Add to schema.prisma

enum SpecGroupStatus {
  pending           // Just created, waiting for extraction
  analyzing         // AI conflict detection in progress
  conflicts_detected // Conflicts found, awaiting resolution
  ready             // All resolved, stitched context available
  error             // Something failed
}

model SpecGroup {
  id              String          @id @default(uuid())
  projectId       String          @map("project_id")
  name            String          // User-provided or auto-generated
  primarySpecId   String?         @map("primary_spec_id") // Optional: designated primary doc
  stitchedContext String?         @db.Text @map("stitched_context")
  status          SpecGroupStatus @default(pending)
  errorMessage    String?         @db.Text @map("error_message")
  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt @map("updated_at")
  
  // Relations
  project         Project         @relation(fields: [projectId], references: [id], onDelete: Cascade)
  specs           Spec[]          // One-to-many: group contains specs
  conflicts       SpecConflict[]  // One-to-many: group has conflicts
  
  @@index([projectId])
  @@index([status])
  @@map("spec_groups")
}

model SpecConflict {
  id            String    @id @default(uuid())
  specGroupId   String    @map("spec_group_id")
  
  // Source 1
  spec1Id       String    @map("spec1_id")
  spec1Section  String    @map("spec1_section")  // Section ref like "3.2" or heading
  spec1Text     String    @db.Text @map("spec1_text") // Actual conflicting text
  
  // Source 2  
  spec2Id       String    @map("spec2_id")
  spec2Section  String    @map("spec2_section")
  spec2Text     String    @db.Text @map("spec2_text")
  
  // Classification
  conflictType  String    @map("conflict_type") // 'duplicate', 'contradiction', 'overlap'
  severity      String    @default("warning")   // 'critical', 'warning', 'info'
  description   String    @db.Text              // AI-generated explanation
  
  // Resolution
  resolution    String?   // 'use_spec1', 'use_spec2', 'merge', 'ignore'
  mergedText    String?   @db.Text @map("merged_text") // If resolution is 'merge'
  resolvedBy    String?   @map("resolved_by")   // User ID
  resolvedAt    DateTime? @map("resolved_at")
  
  // Relations
  specGroup     SpecGroup @relation(fields: [specGroupId], references: [id], onDelete: Cascade)
  
  @@index([specGroupId])
  @@index([resolution])
  @@map("spec_conflicts")
}
```

### Modifications to Existing Tables

```prisma
// Modify existing Spec model
model Spec {
  // ... existing fields ...
  
  // Add: optional link to a group
  specGroupId   String?    @map("spec_group_id")
  specGroup     SpecGroup? @relation(fields: [specGroupId], references: [id], onDelete: SetNull)
  
  @@index([specGroupId])
}

// Modify existing Project model
model Project {
  // ... existing fields ...
  
  // Add: relation to groups
  specGroups    SpecGroup[]
}
```

### Field Specifications

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| SpecGroup.name | String | Max 200 chars | Auto: "Batch Upload - Dec 30, 2024" |
| SpecGroup.stitchedContext | Text | Max 500KB | Nullable until generated |
| SpecConflict.conflictType | String | Enum: duplicate, contradiction, overlap | Set by AI |
| SpecConflict.severity | String | Enum: critical, warning, info | Derived from type |
| SpecConflict.resolution | String | Enum: use_spec1, use_spec2, merge, ignore | Nullable until resolved |
| SpecConflict.spec1Text | Text | Max 10KB per side | Excerpt, not full section |

### Migration

```sql
-- Migration: add_spec_groups

-- Create enum
CREATE TYPE "SpecGroupStatus" AS ENUM ('pending', 'analyzing', 'conflicts_detected', 'ready', 'error');

-- Create SpecGroup table
CREATE TABLE "spec_groups" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "name" VARCHAR(200) NOT NULL,
    "primary_spec_id" UUID,
    "stitched_context" TEXT,
    "status" "SpecGroupStatus" NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "spec_groups_project_id_idx" ON "spec_groups"("project_id");
CREATE INDEX "spec_groups_status_idx" ON "spec_groups"("status");

-- Create SpecConflict table
CREATE TABLE "spec_conflicts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "spec_group_id" UUID NOT NULL REFERENCES "spec_groups"("id") ON DELETE CASCADE,
    "spec1_id" UUID NOT NULL,
    "spec1_section" VARCHAR(100) NOT NULL,
    "spec1_text" TEXT NOT NULL,
    "spec2_id" UUID NOT NULL,
    "spec2_section" VARCHAR(100) NOT NULL,
    "spec2_text" TEXT NOT NULL,
    "conflict_type" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'warning',
    "description" TEXT NOT NULL,
    "resolution" VARCHAR(50),
    "merged_text" TEXT,
    "resolved_by" UUID,
    "resolved_at" TIMESTAMP(3)
);

CREATE INDEX "spec_conflicts_spec_group_id_idx" ON "spec_conflicts"("spec_group_id");
CREATE INDEX "spec_conflicts_resolution_idx" ON "spec_conflicts"("resolution");

-- Add specGroupId to specs table
ALTER TABLE "specs" ADD COLUMN "spec_group_id" UUID REFERENCES "spec_groups"("id") ON DELETE SET NULL;
CREATE INDEX "specs_spec_group_id_idx" ON "specs"("spec_group_id");
```

---

## 7. API Design

### Endpoints Overview

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | /api/projects/:projectId/specs/batch | Upload multiple files | Required |
| GET | /api/projects/:projectId/spec-groups | List groups in project | Required |
| GET | /api/spec-groups/:id | Get group with specs and conflicts | Required |
| POST | /api/spec-groups/:id/resolve | Resolve conflicts | Required |
| POST | /api/spec-groups/:id/translate | Translate using stitched context | Required |
| DELETE | /api/spec-groups/:id | Delete group (and unlink specs) | Required |
| POST | /api/spec-groups/:id/specs | Add spec to existing group | Required |
| DELETE | /api/spec-groups/:id/specs/:specId | Remove spec from group | Required |

### POST /api/projects/:projectId/specs/batch

**Description**: Upload multiple specification files and create a spec group.

**Request**:
```
Content-Type: multipart/form-data

Fields:
- files: File[] (2-10 files, max 50MB total)
- groupName: string (optional, max 200 chars)
- primarySpecIndex: number (optional, 0-indexed)
```

**Response 202 Accepted**:
```json
{
  "data": {
    "specGroupId": "grp_abc123def456",
    "name": "API Spec + Requirements - Dec 30, 2024",
    "status": "pending",
    "specs": [
      {
        "id": "spec_111",
        "filename": "api-spec.yaml",
        "status": "uploaded",
        "isPrimary": true
      },
      {
        "id": "spec_222",
        "filename": "requirements.pdf",
        "status": "uploaded",
        "isPrimary": false
      }
    ],
    "statusUrl": "/api/spec-groups/grp_abc123def456"
  }
}
```

**Response 400 Bad Request**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "At least 2 files required for batch upload",
    "details": {
      "fileCount": 1,
      "minRequired": 2
    }
  }
}
```

**Response 413 Payload Too Large**:
```json
{
  "error": {
    "code": "PAYLOAD_TOO_LARGE",
    "message": "Total upload size exceeds 50MB limit",
    "details": {
      "totalSize": 52428800,
      "maxSize": 52428800
    }
  }
}
```

### GET /api/spec-groups/:id

**Description**: Get spec group details including specs and conflicts.

**Response 200 OK**:
```json
{
  "data": {
    "id": "grp_abc123def456",
    "name": "API Spec + Requirements - Dec 30, 2024",
    "status": "conflicts_detected",
    "createdAt": "2024-12-30T10:30:00Z",
    "updatedAt": "2024-12-30T10:31:45Z",
    "specs": [
      {
        "id": "spec_111",
        "name": "api-spec.yaml",
        "fileType": "yaml",
        "status": "ready",
        "isPrimary": true,
        "sectionCount": 24
      },
      {
        "id": "spec_222",
        "name": "requirements.pdf",
        "fileType": "pdf",
        "status": "ready",
        "isPrimary": false,
        "sectionCount": 18
      }
    ],
    "conflicts": [
      {
        "id": "conf_001",
        "conflictType": "contradiction",
        "severity": "critical",
        "description": "Documents specify different user limits for the API",
        "spec1": {
          "id": "spec_111",
          "name": "api-spec.yaml",
          "section": "2.3 Rate Limiting",
          "text": "Maximum 100 requests per minute per user"
        },
        "spec2": {
          "id": "spec_222",
          "name": "requirements.pdf",
          "section": "Performance Requirements",
          "text": "Users should be able to make unlimited API calls"
        },
        "resolution": null,
        "resolvedAt": null
      },
      {
        "id": "conf_002",
        "conflictType": "overlap",
        "severity": "info",
        "description": "Both documents describe authentication but with different levels of detail",
        "spec1": {
          "id": "spec_111",
          "name": "api-spec.yaml",
          "section": "3.1 Authentication",
          "text": "OAuth 2.0 with JWT tokens, 1-hour expiry"
        },
        "spec2": {
          "id": "spec_222",
          "name": "requirements.pdf",
          "section": "Security",
          "text": "Must support single sign-on via OAuth"
        },
        "resolution": "merge",
        "mergedText": "OAuth 2.0 with JWT tokens, 1-hour expiry. Must support enterprise SSO integration.",
        "resolvedAt": "2024-12-30T10:35:00Z"
      }
    ],
    "conflictSummary": {
      "total": 2,
      "resolved": 1,
      "unresolved": 1,
      "bySeverity": {
        "critical": 1,
        "warning": 0,
        "info": 1
      }
    },
    "stitchedContext": null
  }
}
```

### POST /api/spec-groups/:id/resolve

**Description**: Resolve one or more conflicts.

**Request**:
```json
{
  "resolutions": [
    {
      "conflictId": "conf_001",
      "resolution": "use_spec1"
    },
    {
      "conflictId": "conf_003",
      "resolution": "merge",
      "mergedText": "Custom merged content provided by user (optional)"
    }
  ]
}
```

**Response 200 OK** (all now resolved, stitching triggered):
```json
{
  "data": {
    "resolved": 2,
    "remaining": 0,
    "status": "ready",
    "stitchedContext": "# Unified Specification\n\n## Authentication\nOAuth 2.0 with JWT tokens..."
  }
}
```

**Response 200 OK** (some still unresolved):
```json
{
  "data": {
    "resolved": 1,
    "remaining": 3,
    "status": "conflicts_detected",
    "stitchedContext": null
  }
}
```

### POST /api/spec-groups/:id/translate

**Description**: Trigger AI translation using the stitched context.

**Request**:
```json
{
  "options": {
    "useStitchedContext": true
  }
}
```

**Response 200 OK** (same format as existing /api/specs/:id/translate):
```json
{
  "data": {
    "specGroupId": "grp_abc123def456",
    "epicsCreated": 4,
    "featuresCreated": 12,
    "storiesCreated": 47,
    "qualityScore": 8.5,
    "coveragePercent": 94,
    "warnings": [],
    "durationMs": 45230
  }
}
```

**Response 400 Bad Request** (not ready):
```json
{
  "error": {
    "code": "NOT_READY",
    "message": "Spec group has 3 unresolved conflicts. Resolve conflicts before translating.",
    "details": {
      "unresolvedCount": 3
    }
  }
}
```

---

## 8. AI/ML Components

### Conflict Detection Prompt

**Model**: Claude Haiku (claude-3-haiku-20240307)  
**Temperature**: 0.1 (high consistency)  
**Max Tokens**: 4096

```
You are analyzing multiple specification documents for potential conflicts.

## Documents

{{#each specs}}
### Document: {{this.name}} (ID: {{this.id}})
{{#each this.sections}}
#### Section {{this.sectionRef}}: {{this.heading}}
{{this.content}}

{{/each}}
{{/each}}

## Instructions

Analyze these documents for conflicts. Identify:

1. **DUPLICATE**: Same requirement or feature described in multiple documents with identical or near-identical meaning. These are redundant and one source should be chosen.

2. **CONTRADICTION**: Documents make incompatible claims. Examples:
   - Different numeric limits (100 users vs unlimited)
   - Conflicting timelines (launch Q1 vs launch Q3)
   - Mutually exclusive features (must support X vs must not support X)

3. **OVERLAP**: Same topic covered with different details or perspectives. Not contradictory, but needs merging for completeness.

## Output Format

Return a JSON array of conflicts. For each conflict:

```json
[
  {
    "spec1Id": "uuid of first document",
    "spec1Section": "section reference or heading",
    "spec1Text": "relevant excerpt (max 500 chars)",
    "spec2Id": "uuid of second document", 
    "spec2Section": "section reference or heading",
    "spec2Text": "relevant excerpt (max 500 chars)",
    "type": "duplicate|contradiction|overlap",
    "description": "1-2 sentence explanation of the conflict"
  }
]
```

If no conflicts are found, return an empty array: []

## Rules

- Only report genuine conflicts. Unrelated content in different documents is NOT a conflict.
- For duplicates, only flag if the content is substantively the same, not just topically related.
- For contradictions, there must be an actual incompatibility, not just different emphasis.
- Limit excerpts to 500 characters. Include the most relevant portion.
- Return valid JSON only. No markdown, no explanations outside the JSON.
```

### Context Stitching Prompt

**Model**: Claude Sonnet (claude-sonnet-4-20250514)  
**Temperature**: 0.2 (balanced creativity for writing)  
**Max Tokens**: 8192

```
You are creating a unified specification document from multiple sources.

## Source Documents

{{#each specs}}
### Document: {{this.name}} ({{this.role}})
{{this.extractedText}}

{{/each}}

## Conflict Resolutions

The following conflicts were identified and resolved:

{{#each conflicts}}
### Conflict {{@index}}: {{this.type}}
- Document 1 ({{this.spec1Name}}): "{{this.spec1Text}}"
- Document 2 ({{this.spec2Name}}): "{{this.spec2Text}}"
- Resolution: {{this.resolution}}
{{#if this.mergedText}}- Merged Content: "{{this.mergedText}}"{{/if}}

{{/each}}

## Instructions

Create a single, coherent specification document that:

1. Uses the structure of the PRIMARY document ({{primarySpecName}}) as the skeleton
2. Incorporates relevant content from other documents into appropriate sections
3. Respects all conflict resolutions:
   - For "use_spec1": Use only the content from document 1
   - For "use_spec2": Use only the content from document 2  
   - For "merge": Use the provided merged content
   - For "ignore": Omit the conflicting content entirely
4. Eliminates true duplicates (same information from multiple sources)
5. Maintains source attribution where helpful (e.g., "[From API Spec]")
6. Produces a readable, professional document

## Output Format

Return JSON with a single field:

```json
{
  "stitchedContext": "# Unified Specification\n\n## Section 1...\n\n## Section 2..."
}
```

The stitchedContext should be valid Markdown. Include:
- Clear section headings
- Bullet points for lists
- Code blocks for technical content
- Source attributions in brackets where multiple sources contributed

Return valid JSON only.
```

### Evaluation Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Conflict detection precision | ≥ 90% | Manual review of 50 random conflicts |
| Conflict detection recall | ≥ 85% | Compare AI-found vs human-found conflicts |
| Stitched context coherence | ≥ 4/5 | Human rating of readability |
| Content preservation | 100% | Verify all resolved content appears |
| Processing latency | ≤ 60s detection, ≤ 90s stitching | Timing logs |

### Fallback Behavior

1. **If conflict detection fails** (API error, timeout):
   - Set group status to 'error'
   - Store error message
   - Allow retry via POST /api/spec-groups/:id/analyze

2. **If stitching fails**:
   - Set group status to 'error'
   - Allow retry after conflicts re-confirmed
   - Fallback: Concatenate documents with separators (degraded mode)

3. **If AI returns invalid JSON**:
   - Retry once with same prompt
   - If still invalid, log raw response and fail gracefully

---

## 9. UI/UX Specification

### Screen List

| Screen | Purpose | Entry Point |
|--------|---------|-------------|
| Batch Upload Modal | Upload multiple files | "Batch Upload" button on Dashboard |
| Group Status Page | View processing status, resolve conflicts | Click on group from Dashboard |
| Conflict Resolution Panel | Resolve individual conflicts | Within Group Status Page |
| Stitched Context Preview | Review unified document | After all conflicts resolved |

### User Flow

```
Dashboard
    │
    ├─► Click "Batch Upload" button
    │       │
    │       ▼
    │   BatchUploadModal opens
    │       │
    │       ├─► Drag files onto dropzone
    │       ├─► Files appear in list with remove buttons
    │       ├─► Click "Upload X Files"
    │       │       │
    │       │       ▼
    │       │   Modal shows uploading progress
    │       │       │
    │       │       ▼
    │       │   Success: Navigate to Group Status Page
    │       │   
    │       └─► Or click Cancel
    │
    ▼
Group Status Page
    │
    ├─► Status: "Analyzing..." (spinner)
    │       │
    │       ▼
    ├─► Status: "Conflicts Detected" 
    │       │
    │       ├─► Conflict list appears
    │       │       │
    │       │       ├─► Click conflict to expand
    │       │       │       │
    │       │       │       ├─► See side-by-side comparison
    │       │       │       ├─► Select resolution (4 buttons)
    │       │       │       └─► Conflict collapses, marked resolved
    │       │       │
    │       │       └─► "Auto-resolve All" button (optional)
    │       │
    │       ▼
    │   All conflicts resolved
    │       │
    │       ▼
    ├─► Status: "Ready"
    │       │
    │       ├─► "Preview Unified Spec" button
    │       │       │
    │       │       ▼
    │       │   Stitched Context Preview (modal or drawer)
    │       │
    │       └─► "Translate" button
    │               │
    │               ▼
    │           Navigate to Review Page (existing)
    │
    └─► Status: "Error" 
            │
            └─► Show error message, "Retry" button
```

### Component Hierarchy

```
BatchUploadModal (organism)
├── ModalHeader (molecule)
│   ├── Title: "Upload Multiple Specs"
│   └── CloseButton (atom)
├── DropzoneArea (molecule)
│   ├── DropzoneIcon (atom)
│   ├── DropzoneText (atom)
│   └── FileInput (hidden atom)
├── FileList (molecule)
│   └── FileListItem (molecule) × N
│       ├── FileIcon (atom)
│       ├── FileName (atom)
│       ├── FileSize (atom)
│       ├── PrimaryBadge (atom) - if marked primary
│       └── RemoveButton (atom)
├── GroupNameInput (molecule)
│   ├── Label (atom)
│   └── TextInput (atom)
└── ModalFooter (molecule)
    ├── CancelButton (atom)
    └── UploadButton (atom) - disabled if < 2 files

GroupStatusPage (template)
├── PageHeader (molecule)
│   ├── BackButton (atom)
│   ├── GroupName (atom)
│   └── StatusBadge (atom)
├── SpecList (organism)
│   └── SpecCard (molecule) × N
│       ├── FileTypeIcon (atom)
│       ├── SpecName (atom)
│       ├── SectionCount (atom)
│       └── PrimaryIndicator (atom)
├── ConflictResolutionPanel (organism) - if conflicts exist
│   ├── ConflictSummary (molecule)
│   │   ├── TotalCount (atom)
│   │   ├── ResolvedCount (atom)
│   │   └── SeverityBreakdown (molecule)
│   ├── AutoResolveButton (atom)
│   └── ConflictList (molecule)
│       └── ConflictCard (organism) × N
│           ├── ConflictHeader (molecule)
│           │   ├── SeverityIcon (atom)
│           │   ├── ConflictType (atom)
│           │   └── ExpandButton (atom)
│           ├── ConflictDescription (atom)
│           └── ConflictDetail (molecule) - when expanded
│               ├── SourceComparison (molecule)
│               │   ├── SourcePanel (molecule) × 2
│               │   │   ├── DocName (atom)
│               │   │   ├── SectionRef (atom)
│               │   │   └── TextExcerpt (atom)
│               │   └── DiffHighlight (optional)
│               └── ResolutionButtons (molecule)
│                   ├── UseDoc1Button (atom)
│                   ├── UseDoc2Button (atom)
│                   ├── MergeButton (atom)
│                   └── IgnoreButton (atom)
├── StitchedContextPreview (organism) - if ready
│   ├── PreviewHeader (molecule)
│   ├── MarkdownRenderer (molecule)
│   └── DownloadButton (atom)
└── ActionBar (molecule)
    ├── DeleteGroupButton (atom)
    └── TranslateButton (atom) - disabled until ready
```

### Key Interactions

**Drag and Drop**:
- Visual feedback: Border color changes from grey to orange on dragover
- Invalid file type: Show toast "Unsupported file type: .exe"
- File limit exceeded: Show toast "Maximum 10 files allowed"
- Keyboard accessible: Tab to dropzone, Enter to open file picker

**Conflict Expansion**:
- Click anywhere on conflict card to expand/collapse
- Expanded state shows full source comparison
- Only one conflict expanded at a time (accordion behavior)
- Resolved conflicts show green checkmark, collapsed by default

**Resolution Selection**:
- Buttons highlight on hover
- Selected resolution shows filled state
- "Merge" option opens inline textarea for custom merge (optional)
- Selecting resolution auto-collapses the conflict card

**Progress Feedback**:
- Upload: Per-file progress bars
- Analysis: Indeterminate spinner with "Analyzing documents..."
- Stitching: Indeterminate spinner with "Creating unified specification..."

### Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| Desktop (≥1024px) | Full layout, side-by-side source comparison |
| Tablet (768-1023px) | Stacked source panels in conflict detail |
| Mobile (< 768px) | Full-width cards, bottom sheet for conflict detail |

### Accessibility Requirements

| Requirement | Implementation |
|-------------|----------------|
| Keyboard navigation | All actions reachable via Tab, Enter, Space |
| Screen reader | Conflict status announced on resolution |
| Focus management | Focus moves to next conflict after resolution |
| Color contrast | 4.5:1 for text, 3:1 for UI components |
| Error states | Described in aria-live region |

---

## 10. Testing Strategy

### Test Pyramid

Following Axelrod's guidance, we aim for the test pyramid shape:
- **70% Unit tests**: Service logic, validation, data transformation
- **20% Integration tests**: API endpoints, database operations, AI interactions
- **10% E2E tests**: Critical user journeys only

### Unit Tests

**SpecGroupService.test.ts**:
```typescript
describe('SpecGroupService', () => {
  describe('createGroup', () => {
    it('creates group with pending status', async () => {
      const group = await service.createGroup(projectId, 'Test', [specId1, specId2]);
      expect(group.status).toBe('pending');
      expect(group.specs).toHaveLength(2);
    });

    it('rejects group with fewer than 2 specs', async () => {
      await expect(service.createGroup(projectId, 'Test', [specId1]))
        .rejects.toThrow('At least 2 specs required');
    });

    it('rejects group with more than 10 specs', async () => {
      const tooMany = Array(11).fill(null).map(() => createSpec());
      await expect(service.createGroup(projectId, 'Test', tooMany))
        .rejects.toThrow('Maximum 10 specs allowed');
    });

    it('sets primary spec when specified', async () => {
      const group = await service.createGroup(projectId, 'Test', [specId1, specId2], specId1);
      expect(group.primarySpecId).toBe(specId1);
    });
  });

  describe('analyzeConflicts', () => {
    it('sets status to analyzing during processing', async () => {
      const promise = service.analyzeConflicts(groupId);
      const group = await prisma.specGroup.findUnique({ where: { id: groupId } });
      expect(group.status).toBe('analyzing');
      await promise;
    });

    it('creates conflict records from AI response', async () => {
      mockClaude.completeJSON.mockResolvedValue([
        { spec1Id, spec1Section: '1.1', spec2Id, spec2Section: '2.1', type: 'contradiction', description: 'Test' }
      ]);
      
      await service.analyzeConflicts(groupId);
      
      const conflicts = await prisma.specConflict.findMany({ where: { specGroupId: groupId } });
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictType).toBe('contradiction');
    });

    it('sets status to ready if no conflicts found', async () => {
      mockClaude.completeJSON.mockResolvedValue([]);
      
      await service.analyzeConflicts(groupId);
      
      const group = await prisma.specGroup.findUnique({ where: { id: groupId } });
      expect(group.status).toBe('ready');
    });

    it('handles AI failure gracefully', async () => {
      mockClaude.completeJSON.mockRejectedValue(new Error('API Error'));
      
      await service.analyzeConflicts(groupId);
      
      const group = await prisma.specGroup.findUnique({ where: { id: groupId } });
      expect(group.status).toBe('error');
      expect(group.errorMessage).toContain('API Error');
    });
  });

  describe('resolveConflicts', () => {
    it('updates conflict with resolution', async () => {
      await service.resolveConflicts(groupId, [
        { conflictId, resolution: 'use_spec1' }
      ]);
      
      const conflict = await prisma.specConflict.findUnique({ where: { id: conflictId } });
      expect(conflict.resolution).toBe('use_spec1');
      expect(conflict.resolvedAt).toBeDefined();
    });

    it('triggers stitching when all conflicts resolved', async () => {
      const generateSpy = jest.spyOn(service, 'generateContext');
      
      await service.resolveConflicts(groupId, [{ conflictId, resolution: 'use_spec1' }]);
      
      expect(generateSpy).toHaveBeenCalledWith(groupId);
    });

    it('does not trigger stitching with remaining conflicts', async () => {
      // Create second conflict
      await prisma.specConflict.create({ data: { specGroupId: groupId, ... } });
      const generateSpy = jest.spyOn(service, 'generateContext');
      
      await service.resolveConflicts(groupId, [{ conflictId, resolution: 'use_spec1' }]);
      
      expect(generateSpy).not.toHaveBeenCalled();
    });
  });

  describe('generateContext', () => {
    it('stores stitched context in database', async () => {
      mockClaude.completeJSON.mockResolvedValue({ 
        stitchedContext: '# Unified Spec\n...' 
      });
      
      await service.generateContext(groupId);
      
      const group = await prisma.specGroup.findUnique({ where: { id: groupId } });
      expect(group.stitchedContext).toContain('# Unified Spec');
      expect(group.status).toBe('ready');
    });
  });
});
```

### Integration Tests

**specGroups.routes.test.ts**:
```typescript
describe('POST /api/projects/:projectId/specs/batch', () => {
  it('uploads multiple files and creates group', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/specs/batch`,
      headers: { authorization: `Bearer ${token}` },
      payload: createMultipartPayload([
        { filename: 'api.yaml', content: apiYamlContent },
        { filename: 'requirements.pdf', content: pdfBuffer }
      ])
    });
    
    expect(response.statusCode).toBe(202);
    const { data } = response.json();
    expect(data.specGroupId).toBeDefined();
    expect(data.specs).toHaveLength(2);
  });

  it('rejects single file upload', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `/api/projects/${projectId}/specs/batch`,
      headers: { authorization: `Bearer ${token}` },
      payload: createMultipartPayload([
        { filename: 'api.yaml', content: apiYamlContent }
      ])
    });
    
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/spec-groups/:id', () => {
  it('returns group with conflicts', async () => {
    // Setup: create group with conflicts
    const groupId = await setupGroupWithConflicts();
    
    const response = await app.inject({
      method: 'GET',
      url: `/api/spec-groups/${groupId}`,
      headers: { authorization: `Bearer ${token}` }
    });
    
    expect(response.statusCode).toBe(200);
    const { data } = response.json();
    expect(data.conflicts).toBeInstanceOf(Array);
    expect(data.conflictSummary).toBeDefined();
  });
});

describe('POST /api/spec-groups/:id/resolve', () => {
  it('resolves conflicts and triggers stitching', async () => {
    const groupId = await setupGroupWithSingleConflict();
    
    const response = await app.inject({
      method: 'POST',
      url: `/api/spec-groups/${groupId}/resolve`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        resolutions: [{ conflictId, resolution: 'use_spec1' }]
      }
    });
    
    expect(response.statusCode).toBe(200);
    const { data } = response.json();
    expect(data.status).toBe('ready');
    expect(data.stitchedContext).toBeDefined();
  });
});
```

### E2E Tests

**batch-upload.spec.ts** (Playwright):
```typescript
import { test, expect } from '@playwright/test';

test.describe('Batch Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="username"]', 'testuser');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('uploads multiple files and shows conflicts', async ({ page }) => {
    // Click batch upload button
    await page.click('[data-testid="batch-upload-button"]');
    
    // Wait for modal
    await expect(page.locator('[data-testid="batch-upload-modal"]')).toBeVisible();
    
    // Upload files via file chooser
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('[data-testid="dropzone"]');
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([
      'fixtures/api-spec.yaml',
      'fixtures/requirements.pdf'
    ]);
    
    // Verify files shown
    await expect(page.locator('[data-testid="file-list-item"]')).toHaveCount(2);
    
    // Click upload
    await page.click('[data-testid="upload-button"]');
    
    // Wait for redirect to group status page
    await page.waitForURL(/\/spec-groups\/.+/);
    
    // Wait for analysis to complete (may take up to 60s)
    await expect(page.locator('[data-testid="status-badge"]'))
      .toHaveText(/conflicts_detected|ready/, { timeout: 70000 });
    
    // If conflicts detected, verify UI shows them
    const status = await page.locator('[data-testid="status-badge"]').textContent();
    if (status?.includes('conflicts')) {
      await expect(page.locator('[data-testid="conflict-card"]')).toHaveCount({ minimum: 1 });
    }
  });

  test('resolves conflict and generates stitched context', async ({ page }) => {
    // Navigate to pre-seeded group with conflicts
    await page.goto('/spec-groups/test-group-with-conflicts');
    
    // Expand first conflict
    await page.click('[data-testid="conflict-card"]:first-child');
    
    // Verify source comparison visible
    await expect(page.locator('[data-testid="source-panel"]')).toHaveCount(2);
    
    // Click resolution button
    await page.click('[data-testid="use-doc1-button"]');
    
    // Verify conflict marked resolved
    await expect(page.locator('[data-testid="conflict-card"]:first-child'))
      .toHaveClass(/resolved/);
    
    // If all resolved, verify stitched context appears
    const remaining = await page.locator('[data-testid="conflict-card"]:not(.resolved)').count();
    if (remaining === 0) {
      await expect(page.locator('[data-testid="stitched-preview"]')).toBeVisible({ timeout: 100000 });
    }
  });
});
```

### Test Data Requirements

**Fixtures needed**:
- `api-spec.yaml`: Valid OpenAPI spec with sections
- `requirements.pdf`: Requirements doc with some overlapping content
- `design-doc.md`: Design doc with contradictions to requirements
- Smaller variants for unit tests (mock content)

**Database seeds**:
- `test-group-pending`: Group in pending status
- `test-group-analyzing`: Group in analyzing status (for status polling tests)
- `test-group-with-conflicts`: Group with 3 conflicts, none resolved
- `test-group-ready`: Group with all conflicts resolved, stitched context present

---

## 11. Implementation Plan

### Technology Stack

| Component | Technology | Version | Notes |
|-----------|------------|---------|-------|
| Backend Framework | Fastify | 4.x | Existing |
| ORM | Prisma | 5.x | Existing |
| AI | Claude API | Haiku + Sonnet | Existing ClaudeService |
| File Handling | @fastify/multipart | 8.x | Already configured |
| Frontend | React | 18.x | Existing |
| State | Zustand | 4.x | Existing |
| Drag & Drop | Native HTML5 | - | No library needed |

### Build Order

```
Day 1 (Morning):
├── 1. Database migration (30 min)
│   ├── Add SpecGroup model
│   ├── Add SpecConflict model
│   ├── Modify Spec model
│   └── Run migration
│
├── 2. SpecGroupService - Part 1 (60 min)
│   ├── createGroup()
│   ├── getGroup()
│   └── Unit tests
│
├── 3. Routes - Part 1 (45 min)
│   ├── POST /api/projects/:id/specs/batch
│   ├── GET /api/spec-groups/:id
│   └── Integration tests

Day 1 (Afternoon):
├── 4. Conflict Detection (90 min)
│   ├── Create conflict detection prompt
│   ├── SpecGroupService.analyzeConflicts()
│   ├── Mock AI tests
│   └── Real AI integration test
│
├── 5. Conflict Resolution (60 min)
│   ├── SpecGroupService.resolveConflicts()
│   ├── POST /api/spec-groups/:id/resolve
│   └── Tests

Day 2 (Morning):
├── 6. Context Stitching (90 min)
│   ├── Create stitching prompt
│   ├── SpecGroupService.generateContext()
│   ├── Integration with TranslationService
│   └── Tests
│
├── 7. Frontend - Upload (90 min)
│   ├── BatchUploadModal component
│   ├── FileList component
│   ├── API integration
│   └── Unit tests

Day 2 (Afternoon):
├── 8. Frontend - Status & Conflicts (120 min)
│   ├── GroupStatusPage component
│   ├── ConflictResolutionPanel component
│   ├── ConflictCard component
│   ├── Status polling hook
│   └── Unit tests
│
├── 9. E2E Tests (60 min)
│   ├── Upload flow test
│   ├── Conflict resolution test
│   └── Translation trigger test
│
└── 10. Polish & Documentation (30 min)
    ├── Error handling review
    ├── Loading states
    └── Update API docs
```

### Environment Requirements

| Variable | Purpose | Example |
|----------|---------|---------|
| CLAUDE_API_KEY | AI calls | sk-ant-... (existing) |
| DATABASE_URL | Database | postgres://... (existing) |
| STORAGE_PATH | File storage | ./uploads (existing) |

### Configuration

No new environment variables required. Uses existing configuration.

### Dependencies

No new npm packages required. All functionality implemented with:
- Existing @fastify/multipart for file handling
- Existing Prisma for database
- Existing ClaudeService for AI
- Native HTML5 drag-and-drop

---

## 12. Open Questions

### Requiring Stakeholder Input

1. **What happens to work items if stitched context is regenerated?**
   - Option A: Delete and re-translate (clean slate)
   - Option B: Keep existing, add new (might create duplicates)
   - **Recommendation**: Option A with confirmation dialog
   - **Decision needed by**: Before frontend implementation

2. **Should users be able to edit stitched context manually?**
   - Risk: Edits lost if regenerated
   - Benefit: Final polish before translation
   - **Recommendation**: Allow viewing but not editing initially
   - **Decision needed by**: Before frontend implementation

3. **Maximum file size per document?**
   - Current proposal: 50MB total, no per-file limit
   - Issue: One 45MB PDF + one 10MB DOCX would fail
   - **Options**: 50MB total OR 25MB per file
   - **Decision needed by**: Before upload validation implementation

### Technical Unknowns

1. **AI prompt tuning for conflict detection accuracy**
   - Need real-world test with 10-20 diverse document sets
   - Budget: 2-3 hours of prompt iteration
   - Risk: Low (current prompt is functional, optimization is incremental)

2. **Large document handling (> 100 sections total)**
   - May need to chunk conflict detection into multiple API calls
   - Risk: Medium (affects latency and cost)
   - Mitigation: Implement pagination in conflict detection if needed

### External Dependencies

1. **Claude API rate limits**
   - Current: 1000 requests/min
   - Impact: Conflict detection + stitching = 2 calls per group
   - Risk: Low (10 concurrent groups = 20 calls/min)

2. **Database storage for stitched context**
   - Average size: 50-100KB per group
   - At 1000 groups: 50-100MB (negligible)
   - Risk: Very low

---

## Appendix A: Sample AI Prompts & Responses

### Conflict Detection Example

**Input** (truncated):
```
Document: api-spec.yaml
Section 2.3: Rate Limiting
Requests are limited to 100 per minute per API key.

Document: requirements.pdf
Section: Performance
The system must support unlimited API requests from enterprise customers.
```

**Output**:
```json
[
  {
    "spec1Id": "spec_api",
    "spec1Section": "2.3 Rate Limiting",
    "spec1Text": "Requests are limited to 100 per minute per API key.",
    "spec2Id": "spec_req",
    "spec2Section": "Performance",
    "spec2Text": "The system must support unlimited API requests from enterprise customers.",
    "type": "contradiction",
    "description": "API spec defines a hard limit of 100 requests/minute, while requirements specify unlimited requests for enterprise customers. Resolution needed to determine if enterprise tier bypasses rate limits."
  }
]
```

### Context Stitching Example

**Input** (after resolution: merge):
```
Resolution for rate limit conflict: merge
Merged content: "Standard API keys are limited to 100 requests per minute. Enterprise customers with dedicated API keys have no rate limits."
```

**Output** (in stitchedContext):
```markdown
## Rate Limiting

Standard API keys are limited to 100 requests per minute. Enterprise customers with dedicated API keys have no rate limits. [Merged from API Spec and Requirements]

Rate limit headers are returned with each response:
- X-RateLimit-Limit: Maximum requests allowed
- X-RateLimit-Remaining: Requests remaining in window
- X-RateLimit-Reset: Unix timestamp when limit resets
```

---

## Appendix B: Error Codes

| Code | HTTP Status | Meaning | User Message |
|------|-------------|---------|--------------|
| VALIDATION_ERROR | 400 | Invalid input | Check your input and try again |
| MIN_FILES_REQUIRED | 400 | < 2 files | Batch upload requires at least 2 files |
| MAX_FILES_EXCEEDED | 400 | > 10 files | Maximum 10 files per batch |
| PAYLOAD_TOO_LARGE | 413 | > 50MB total | Total file size exceeds 50MB limit |
| UNSUPPORTED_FILE_TYPE | 400 | Invalid file type | File type not supported |
| GROUP_NOT_FOUND | 404 | Invalid group ID | Spec group not found |
| GROUP_NOT_READY | 400 | Unresolved conflicts | Resolve all conflicts before translating |
| ANALYSIS_FAILED | 500 | AI detection failed | Analysis failed. Please retry. |
| STITCHING_FAILED | 500 | AI stitching failed | Context generation failed. Please retry. |

---

*End of Feature 1 Specification*
