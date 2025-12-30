# Feature 9: Team Collaboration

## Complete Build Specification

**Version**: 1.0  
**Last Updated**: December 2024  
**Estimated Build Time**: 4-5 hours  
**Complexity**: High

---

## 1. Overview

### What We're Building
Real-time collaboration features allowing multiple team members to work on the same spec simultaneously:
- See who's viewing/editing which stories
- Real-time updates when others make changes
- Comments and discussions on work items
- Activity feed showing recent changes
- Presence indicators

Uses WebSocket for real-time updates and Y.js CRDT for conflict-free concurrent editing.

### Why We're Building It
Currently, team members work in isolation:
- No visibility into who's working on what
- Risk of conflicting edits
- Manual coordination via Slack/email
- Comments live in external tools

Real-time collaboration enables efficient team workflows.

### Success Criteria
1. See who's online and what they're viewing
2. Changes appear within 500ms for other users
3. No data loss from concurrent edits
4. Comments threaded per work item
5. Activity feed shows recent team actions

---

## 2. User Stories

### Must Have (P0)

**US-9.1: Presence Awareness**
> As a team member, I want to see who else is viewing the same spec.

*Acceptance Criteria:*
- Avatar icons of online users on spec page
- Indicator shows which story each user is viewing
- Updates in real-time when users navigate

**US-9.2: Real-Time Updates**
> As a team member, I want to see changes others make immediately.

*Acceptance Criteria:*
- Tree updates when items added/moved/deleted
- Story content updates when edited
- No page refresh needed
- Shows "X is editing" indicator

**US-9.3: Comments on Work Items**
> As a reviewer, I want to comment on a story.

*Acceptance Criteria:*
- Comment thread per work item
- @mention team members
- Notifications for mentions
- Resolve/unresolve comments
- Comment count badge on story

**US-9.4: Activity Feed**
> As a team member, I want to see recent activity on the spec.

*Acceptance Criteria:*
- Feed shows: edits, comments, status changes
- Filter by user or action type
- Click to navigate to item
- Shows relative timestamps

### Should Have (P1)

**US-9.5: Conflict Resolution**
> When two users edit the same field, merge or prompt.

**US-9.6: User Permissions**
> Different roles: viewer, editor, admin.

---

## 3. Architecture

### Technology Choices

**WebSocket Server**: Socket.io on Fastify
- Handles real-time communication
- Rooms per spec for scoped broadcasts
- Authentication via JWT

**Conflict Resolution**: Y.js CRDT
- Conflict-free replicated data types
- Automatic merge of concurrent edits
- Works offline, syncs when reconnected

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client A                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   UI State   │  │  Y.js Doc    │  │ Socket.io    │          │
│  │  (Zustand)   │◄─┤   (CRDT)     │◄─┤   Client     │          │
│  └──────────────┘  └──────────────┘  └───────┬──────┘          │
└────────────────────────────────────────────────┼────────────────┘
                                                  │
                                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Socket.io Server                         │   │
│  │   • Room per spec                                         │   │
│  │   • Broadcast changes to room                             │   │
│  │   • Presence tracking                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              CollaborationService                         │   │
│  │   • joinSpec(userId, specId)                              │   │
│  │   • updatePresence(userId, itemId)                        │   │
│  │   • broadcastChange(specId, change)                       │   │
│  │   • syncDocument(specId, updates)                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                                  │
                                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Client B                                     │
│        (Same structure, receives broadcasts)                    │
└─────────────────────────────────────────────────────────────────┘
```

### Event Types

```typescript
// Client → Server
interface ClientEvents {
  'join-spec': { specId: string };
  'leave-spec': { specId: string };
  'update-presence': { itemId: string | null };
  'edit-start': { itemId: string };
  'edit-end': { itemId: string };
  'sync-update': { specId: string; update: Uint8Array };
}

// Server → Client
interface ServerEvents {
  'presence-update': { users: PresenceUser[] };
  'item-changed': { itemId: string; changes: object };
  'item-created': { item: WorkItem };
  'item-deleted': { itemId: string };
  'comment-added': { comment: Comment };
  'sync-update': { update: Uint8Array };
}
```

---

## 4. Data Model

### New Tables

```prisma
model Comment {
  id          String    @id @default(uuid())
  workItemId  String    @map("work_item_id")
  userId      String    @map("user_id")
  content     String    @db.Text
  parentId    String?   @map("parent_id")  // For replies
  resolved    Boolean   @default(false)
  resolvedBy  String?   @map("resolved_by")
  resolvedAt  DateTime? @map("resolved_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  workItem    WorkItem  @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  parent      Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  replies     Comment[] @relation("CommentReplies")
  
  @@index([workItemId])
  @@map("comments")
}

model Activity {
  id          String   @id @default(uuid())
  specId      String   @map("spec_id")
  workItemId  String?  @map("work_item_id")
  userId      String   @map("user_id")
  action      String   // 'created', 'edited', 'commented', 'status_changed', 'merged', 'split'
  details     Json?
  createdAt   DateTime @default(now()) @map("created_at")
  
  @@index([specId, createdAt])
  @@map("activities")
}
```

### Presence (Redis/In-Memory)

```typescript
interface PresenceUser {
  id: string;
  name: string;
  avatar: string;
  viewingItemId: string | null;
  editingItemId: string | null;
  joinedAt: Date;
  lastActiveAt: Date;
}

// Redis key: `presence:spec:{specId}`
// Value: Map<userId, PresenceUser>
```

---

## 5. API Design

### REST Endpoints

**Comments:**
```
GET    /api/workitems/:id/comments
POST   /api/workitems/:id/comments
PUT    /api/comments/:id
DELETE /api/comments/:id
POST   /api/comments/:id/resolve
```

**Activity:**
```
GET /api/specs/:specId/activity?limit=50&before=timestamp
```

### WebSocket Events

```typescript
// Join a spec room
socket.emit('join-spec', { specId: 'spec-123' });

// Receive presence updates
socket.on('presence-update', (data) => {
  // { users: [{ id, name, avatar, viewingItemId }] }
});

// Broadcast edit start
socket.emit('edit-start', { itemId: 'item-456' });

// Receive changes
socket.on('item-changed', (data) => {
  // { itemId: 'item-456', changes: { title: 'New Title' } }
});
```

---

## 6. UI Specification

### Presence Indicators

```
┌─────────────────────────────────────────────────────────────────┐
│  Review: API Specification                                       │
│                                                                  │
│  Team Online: 🟢 John  🟢 Sarah  🟡 Mike (idle)                 │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Work Items                           Activity                   │
│  ─────────────                        ─────────                  │
│                                                                  │
│  ▼ Epic: User Management              • Sarah edited "Login"     │
│    ├─ Feature: Auth                     2 min ago                │
│    │  ├─ User Login 👤Sarah            • John commented on       │
│    │  │                                  "Password Reset"        │
│    │  └─ Password Reset 💬2             5 min ago                │
│    │                                   • Mike created "SSO"      │
│    └─ Feature: Profiles                  15 min ago              │
│       └─ View Profile                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Comments Panel

```
┌─────────────────────────────────────────────────────────────────┐
│  Comments (2)                                            [×]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  John · 2 hours ago                                              │
│  Should we include OAuth2 here? @Sarah can you confirm?          │
│  [Reply]                                                         │
│                                                                  │
│    └─ Sarah · 1 hour ago                                         │
│       Yes, OAuth2 is required per security team                  │
│       [Reply]                                                    │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Mike · 30 min ago                              [✓ Resolved]     │
│  AC #3 seems redundant with AC #1                                │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Add a comment...                                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                    [Comment]     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Editing Indicator

```
┌─────────────────────────────────────────────────────────────────┐
│  User Login                                   👤 Sarah editing  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Fields appear read-only while someone else is editing]        │
│                                                                  │
│  Or if using Y.js: Real-time collaborative editing like         │
│  Google Docs - both users see changes as they type.             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Implementation Plan

### Build Order

```
Phase 1: Backend Infrastructure (90 min)
├── Socket.io setup with Fastify
├── Room management (join/leave spec)
├── Presence tracking
├── JWT authentication for WebSocket
└── Basic event handlers

Phase 2: Database & API (60 min)
├── Migration (Comment, Activity)
├── CommentService
├── ActivityService  
├── REST routes
└── Broadcast on database changes

Phase 3: Frontend - Presence (45 min)
├── Socket.io client setup
├── useCollaboration hook
├── PresenceAvatars component
├── Integration with ReviewPage

Phase 4: Frontend - Comments (60 min)
├── CommentsPanel component
├── CommentThread component
├── CommentInput with @mentions
├── Resolve/unresolve UI

Phase 5: Frontend - Activity (30 min)
├── ActivityFeed component
├── ActivityItem component
└── Integration

Phase 6: Real-time Editing (Optional, Complex)
├── Y.js integration
├── Conflict-free text editing
└── Cursor positions
```

### Dependencies

```bash
# Backend
npm install socket.io @fastify/websocket

# Frontend
npm install socket.io-client

# Optional for collaborative editing
npm install yjs y-websocket
```

---

## 8. Testing Strategy

### Unit Tests
- CommentService CRUD
- ActivityService logging
- Presence tracking logic

### Integration Tests
- WebSocket connection with auth
- Room join/leave
- Broadcast to room members
- Comment creation triggers event

### E2E Tests
- Open spec in two browsers
- Verify presence shows both users
- Edit in one, verify update in other
- Add comment, verify appears in other

---

## 9. Open Questions

1. **Collaborative text editing scope?**
   - Option A: Lock-based (one editor at a time)
   - Option B: Full CRDT (Google Docs style)
   - **Recommendation**: Lock-based for v1 (simpler)

2. **Notification delivery?**
   - Option A: In-app only (WebSocket)
   - Option B: Email for @mentions
   - **Recommendation**: In-app for v1, add email later

3. **Presence persistence?**
   - Redis for multi-server deployment
   - In-memory for single server
   - **Recommendation**: In-memory for v1

---

*End of Feature 9 Specification*
