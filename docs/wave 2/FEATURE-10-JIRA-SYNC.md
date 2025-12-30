# Feature 10: Bi-Directional Jira Sync

## Complete Build Specification

**Version**: 1.0  
**Last Updated**: December 2024  
**Estimated Build Time**: 4-5 hours  
**Complexity**: High  
**Dependencies**: Existing Jira OAuth and export functionality

---

## 1. Overview

### What We're Building
Full two-way synchronization between Handoff AI work items and Jira issues:
- **Push**: Changes in Handoff automatically update Jira
- **Pull**: Changes in Jira automatically update Handoff
- **Conflict Resolution**: When both sides change, prompt user to resolve
- **Field Mapping**: Configurable mapping between Handoff and Jira fields

### Why We're Building It
Current flow is one-way (export to Jira), causing problems:
- Teams edit in Jira, Handoff becomes stale
- Can't re-import Jira changes back to Handoff
- Duplicate effort keeping both in sync
- No source of truth

Bi-directional sync means either tool can be used, staying synchronized.

### Success Criteria
1. Changes in Jira appear in Handoff within 5 minutes
2. Changes in Handoff push to Jira within 1 minute
3. Conflicts detected and queued for resolution
4. Field mapping configurable per project
5. Sync status visible per work item

---

## 2. User Stories

### Must Have (P0)

**US-10.1: Push Changes to Jira**
> As a reviewer, I want edits in Handoff to sync to Jira automatically.

*Acceptance Criteria:*
- Changes to title, description, AC sync to Jira
- Sync happens within 1 minute of save
- Sync status indicator on work item
- Failed syncs queued for retry

**US-10.2: Pull Changes from Jira**
> As a reviewer, I want Jira edits to appear in Handoff.

*Acceptance Criteria:*
- Jira webhook triggers on issue update
- Changes pulled within 5 minutes
- "Updated from Jira" indicator
- History shows Jira as source

**US-10.3: Conflict Detection**
> As a reviewer, I want to be notified of sync conflicts.

*Acceptance Criteria:*
- Conflict detected if both sides changed same field
- Conflict queued, sync paused for that item
- Notification to user
- UI to view and resolve conflicts

**US-10.4: Conflict Resolution**
> As a reviewer, I want to choose which version to keep.

*Acceptance Criteria:*
- View both versions side-by-side
- Choose: "Use Handoff", "Use Jira", "Merge"
- Resolution syncs to both sides
- Conflict cleared

**US-10.5: Field Mapping**
> As an admin, I want to configure which fields sync.

*Acceptance Criteria:*
- Map Handoff fields to Jira fields
- Support custom Jira fields
- Choose sync direction per field
- Test mapping before saving

### Should Have (P1)

**US-10.6: Sync Status Dashboard**
> View sync health across all work items.

**US-10.7: Manual Sync Trigger**
> Force sync for individual items.

---

## 3. Architecture

### Sync Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Handoff AI                                │
│                                                                  │
│  WorkItem Change                                                 │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────┐                                            │
│  │  SyncService    │──────────────────────────────────────────┐ │
│  │  .pushToJira()  │                                          │ │
│  └─────────────────┘                                          │ │
│                                                                │ │
└────────────────────────────────────────────────────────────────┼─┘
                                                                  │
                                                                  ▼
                                                      ┌───────────────────┐
                                                      │   Jira Cloud API  │
                                                      │   PUT /issue/:id  │
                                                      └───────────────────┘
                                                                  │
                                   Webhook on issue.updated       │
                                                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Handoff AI                                        │
│                                                                          │
│  ┌─────────────────┐                                                    │
│  │ Webhook Handler │◄───────────────────────────────────────────────────│
│  │ POST /webhooks  │                                                    │
│  └────────┬────────┘                                                    │
│           │                                                              │
│           ▼                                                              │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐   │
│  │ SyncService     │────►│ ConflictService │────►│ SyncConflict    │   │
│  │ .pullFromJira() │     │ .detectConflict │     │ (if conflict)   │   │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘   │
│           │                                                              │
│           ▼ (no conflict)                                               │
│  ┌─────────────────┐                                                    │
│  │ Update WorkItem │                                                    │
│  └─────────────────┘                                                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Conflict Detection Logic

```typescript
function detectConflict(
  handoffItem: WorkItem,
  jiraIssue: JiraIssue,
  lastSync: SyncRecord
): ConflictResult {
  const conflicts: FieldConflict[] = [];
  
  for (const mapping of fieldMappings) {
    const handoffValue = handoffItem[mapping.handoffField];
    const jiraValue = jiraIssue.fields[mapping.jiraField];
    const lastSyncValue = lastSync.values[mapping.handoffField];
    
    const handoffChanged = handoffValue !== lastSyncValue;
    const jiraChanged = jiraValue !== lastSyncValue;
    
    if (handoffChanged && jiraChanged && handoffValue !== jiraValue) {
      conflicts.push({
        field: mapping.handoffField,
        handoffValue,
        jiraValue,
        lastSyncValue
      });
    }
  }
  
  return {
    hasConflict: conflicts.length > 0,
    conflicts
  };
}
```

---

## 4. Data Model

### New Tables

```prisma
model SyncMapping {
  id            String   @id @default(uuid())
  projectId     String   @map("project_id")
  handoffField  String   @map("handoff_field")
  jiraField     String   @map("jira_field")
  direction     String   @default("bidirectional")  // 'push', 'pull', 'bidirectional'
  transform     String?  // Optional transform function name
  
  project       Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@unique([projectId, handoffField])
  @@map("sync_mappings")
}

model SyncRecord {
  id            String   @id @default(uuid())
  workItemId    String   @map("work_item_id")
  jiraIssueId   String   @map("jira_issue_id")
  jiraIssueKey  String   @map("jira_issue_key")
  lastSyncedAt  DateTime @map("last_synced_at")
  lastSyncValues Json    @map("last_sync_values")  // Snapshot at last sync
  syncStatus    String   @default("synced")  // 'synced', 'pending_push', 'pending_pull', 'conflict', 'error'
  errorMessage  String?  @map("error_message")
  
  workItem      WorkItem @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  
  @@unique([workItemId])
  @@unique([jiraIssueId])
  @@index([syncStatus])
  @@map("sync_records")
}

model SyncConflict {
  id            String   @id @default(uuid())
  syncRecordId  String   @map("sync_record_id")
  field         String
  handoffValue  String?  @db.Text @map("handoff_value")
  jiraValue     String?  @db.Text @map("jira_value")
  resolution    String?  // 'use_handoff', 'use_jira', 'merge', 'ignore'
  resolvedBy    String?  @map("resolved_by")
  resolvedAt    DateTime? @map("resolved_at")
  createdAt     DateTime @default(now()) @map("created_at")
  
  syncRecord    SyncRecord @relation(fields: [syncRecordId], references: [id], onDelete: Cascade)
  
  @@map("sync_conflicts")
}
```

### Add to WorkItem

```prisma
model WorkItem {
  // ... existing ...
  syncRecord    SyncRecord?
}
```

---

## 5. API Design

### Webhook Endpoint

**POST /api/webhooks/jira**

Receives Jira webhooks. Must be publicly accessible.

```typescript
// Verify webhook signature
// Parse event type (issue_updated, issue_deleted, etc.)
// Queue for processing
```

### Sync Endpoints

**GET /api/workitems/:id/sync-status**
```json
{
  "data": {
    "status": "synced",
    "jiraIssueKey": "PROJ-123",
    "lastSyncedAt": "2024-12-30T10:00:00Z",
    "pendingConflicts": 0
  }
}
```

**POST /api/workitems/:id/sync**
Force sync for an item.

**GET /api/projects/:projectId/sync-conflicts**
List all unresolved conflicts.

**POST /api/sync-conflicts/:id/resolve**
```json
{
  "resolution": "use_handoff",  // or "use_jira", "merge"
  "mergedValue": "..."  // if resolution is "merge"
}
```

### Field Mapping Endpoints

**GET /api/projects/:projectId/sync-mappings**

**PUT /api/projects/:projectId/sync-mappings**
```json
{
  "mappings": [
    { "handoffField": "title", "jiraField": "summary", "direction": "bidirectional" },
    { "handoffField": "description", "jiraField": "description", "direction": "bidirectional" },
    { "handoffField": "acceptanceCriteria", "jiraField": "customfield_10001", "direction": "push" },
    { "handoffField": "sizeEstimate", "jiraField": "customfield_10002", "direction": "bidirectional" }
  ]
}
```

---

## 6. Jira Webhook Setup

### Required Webhooks

Register via Jira Admin → System → Webhooks:

- **URL**: `https://handoff.example.com/api/webhooks/jira`
- **Events**: `jira:issue_updated`, `jira:issue_deleted`
- **JQL Filter**: `project = PROJ` (scoped to relevant projects)

### Webhook Payload Processing

```typescript
interface JiraWebhook {
  webhookEvent: 'jira:issue_updated' | 'jira:issue_deleted';
  issue: {
    id: string;
    key: string;
    fields: Record<string, any>;
  };
  changelog?: {
    items: Array<{
      field: string;
      fieldId: string;
      from: string | null;
      fromString: string | null;
      to: string | null;
      toString: string | null;
    }>;
  };
  user: {
    accountId: string;
    displayName: string;
  };
}
```

---

## 7. UI Specification

### Sync Status Badge

```
┌─────────────────────────────────────────────────────────────────┐
│  User Login                                PROJ-123 ✓ Synced    │
├─────────────────────────────────────────────────────────────────┤
│  ...                                                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Password Reset                            PROJ-124 ⚠️ Conflict │
├─────────────────────────────────────────────────────────────────┤
│  ...                                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Conflict Resolution Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  Sync Conflict: Password Reset                           [×]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  The "description" field was modified in both Handoff and Jira.  │
│                                                                  │
│  ┌─ Handoff Version ──────────┐  ┌─ Jira Version ─────────────┐ │
│  │                            │  │                            │ │
│  │ Allow users to reset       │  │ Users can reset their      │ │
│  │ their password via email   │  │ password using a secure    │ │
│  │ link. Link expires in 1hr. │  │ email link (24hr expiry).  │ │
│  │                            │  │                            │ │
│  │ [Use This]                 │  │ [Use This]                 │ │
│  └────────────────────────────┘  └────────────────────────────┘ │
│                                                                  │
│  Or merge manually:                                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Allow users to reset their password using a secure email    ││
│  │ link. Link expires in 24 hours.                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                              [Use Merged]        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Sync Settings Page

```
┌─────────────────────────────────────────────────────────────────┐
│  Jira Sync Settings                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Status: ✓ Connected to PROJ                                     │
│  Last Sync: 2 minutes ago                                        │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Field Mappings                                                  │
│                                                                  │
│  Handoff Field        Jira Field              Direction          │
│  ─────────────────────────────────────────────────────────────  │
│  Title                Summary                 ↔ Bidirectional    │
│  Description          Description             ↔ Bidirectional    │
│  Acceptance Criteria  Custom: AC Field        → Push Only        │
│  Size Estimate        Story Points            ↔ Bidirectional    │
│  Technical Notes      Custom: Tech Notes      → Push Only        │
│                                                                  │
│  [+ Add Mapping]                                                 │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Sync Queue: 3 items pending                                     │
│  Conflicts: 1 unresolved                                         │
│                                                                  │
│  [View Conflicts]  [Force Full Sync]                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Implementation Plan

### Build Order

```
Phase 1: Infrastructure (60 min)
├── Webhook endpoint setup
├── Webhook signature verification
├── Queue system for async processing
└── SyncService scaffolding

Phase 2: Database & Push (90 min)
├── Migration (SyncMapping, SyncRecord, SyncConflict)
├── SyncMappingService
├── Push logic (Handoff → Jira)
├── Auto-push on WorkItem save
└── Retry queue for failures

Phase 3: Pull & Conflicts (90 min)
├── Webhook processing
├── Pull logic (Jira → Handoff)
├── Conflict detection
├── ConflictService
└── Conflict resolution API

Phase 4: Frontend (60 min)
├── SyncStatusBadge component
├── ConflictResolutionModal
├── SyncSettingsPage
└── Integration with StoryEditor

Phase 5: Testing & Hardening (30 min)
├── Webhook testing
├── Conflict scenarios
└── Error handling
```

### Dependencies

No new packages needed. Uses existing:
- Jira API client from export feature
- Existing webhook infrastructure

---

## 9. Testing Strategy

### Unit Tests
- Conflict detection algorithm
- Field mapping transforms
- Sync status state machine

### Integration Tests
- Push updates to Jira (mock API)
- Pull from webhook payload
- Conflict creation and resolution

### E2E Tests
- Create in Handoff → appears in Jira
- Edit in Jira → appears in Handoff
- Edit both → conflict appears

### Manual Testing
- Set up Jira webhook to staging
- Real end-to-end sync testing

---

## 10. Open Questions

1. **Sync frequency for pull?**
   - Webhook = immediate
   - Polling fallback = every 5 minutes
   - **Recommendation**: Webhook primary, polling backup

2. **What if Jira issue deleted?**
   - Option A: Delete from Handoff
   - Option B: Mark as "unlinked"
   - **Recommendation**: Option B (preserve work)

3. **Custom field discovery?**
   - Fetch Jira custom fields via API
   - Let user select from dropdown
   - **Recommendation**: Yes, fetch and display

---

*End of Feature 10 Specification*
