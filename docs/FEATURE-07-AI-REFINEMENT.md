# Feature 7: AI Refinement Loop

## Complete Build Specification

**Version**: 1.0  
**Last Updated**: December 2024  
**Estimated Build Time**: 2-3 hours  
**Complexity**: Medium

---

## 1. Overview

### What We're Building
A feedback system where users rate AI-generated stories (thumbs up/down) and provide detailed feedback. The system extracts team preferences from patterns and includes them in future translation prompts.

### Why We're Building It
AI translation produces generic output. Teams manually edit every story. Feedback learning means AI improves with use.

### Success Criteria
1. Thumbs up/down in 1 click
2. Detailed feedback captured
3. Preferences extracted automatically
4. Future translations use learned preferences
5. Teams can manage preferences

---

## 2. User Stories

### Must Have (P0)

**US-7.1: Quick Feedback**
> Rate a story thumbs up/down with one click.

**US-7.2: Detailed Feedback**  
> "Teach Handoff" opens form for detailed feedback with categories.

**US-7.3: Preference Extraction**
> AI analyzes feedback patterns to create TeamPreference records.

**US-7.4: Apply Preferences**
> Active preferences included in story generation prompts.

### Should Have (P1)

**US-7.5: Preference Management**
> View, activate/deactivate, delete preferences.

---

## 3. Data Model

```prisma
model AIFeedback {
  id          String   @id @default(uuid())
  workItemId  String   @map("work_item_id")
  userId      String   @map("user_id")
  rating      Int      // 1 or 5
  feedback    String?  @db.Text
  categories  String[] @default([])
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  workItem    WorkItem @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  
  @@unique([workItemId, userId])
  @@map("ai_feedback")
}

model TeamPreference {
  id          String   @id @default(uuid())
  projectId   String   @map("project_id")
  preference  String   @db.Text
  description String?  @db.Text
  category    String?
  learnedFrom String[] @map("learned_from")
  active      Boolean  @default(false)
  createdAt   DateTime @default(now()) @map("created_at")
  
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@map("team_preferences")
}
```

---

## 4. API Design

### POST /api/workitems/:id/feedback
```json
{ "rating": 1, "feedback": "Too verbose", "categories": ["verbose"] }
```

### GET /api/projects/:projectId/preferences
Returns list of team preferences.

### POST /api/projects/:projectId/preferences
Create manual preference.

### PUT /api/projects/:projectId/preferences/:id
Toggle active status.

### DELETE /api/projects/:projectId/preferences/:id

### POST /api/projects/:projectId/preferences/extract
Trigger AI preference extraction from recent feedback.

---

## 5. AI Prompt for Preference Extraction

```
Analyze user feedback to extract team preferences.

## Negative Feedback
{{negativeFeedback}}

## Positive Feedback  
{{positiveFeedback}}

## Output
{
  "preferences": [
    {
      "preference": "Actionable instruction for prompts",
      "description": "Human explanation",
      "category": "ac_format|detail_level|sections",
      "confidence": "high|medium|low"
    }
  ]
}
```

---

## 6. UI Components

**FeedbackSection** (on story cards):
- Thumbs up/down buttons
- "Teach Handoff" link → opens modal

**TeachHandoffModal**:
- Category checkboxes (verbose, missing_detail, ac_quality, wrong_format)
- Feedback textarea
- Submit button

**PreferencesPage**:
- Active preferences list with toggle/delete
- Pending preferences (inactive) with activate/dismiss
- Add preference button
- Extract from feedback button

---

## 7. Implementation Plan

```
Phase 1: Backend (90 min)
├── Migration
├── FeedbackService (submit, extract)
├── PreferenceService (CRUD, buildPromptAdditions)
├── Routes
└── Modify TranslationService

Phase 2: Frontend (60 min)
├── FeedbackSection
├── TeachHandoffModal  
├── PreferencesPage
└── Integration
```

---

## 8. Testing

- Submit feedback creates record
- Update existing feedback for same user/item
- Extract preferences from patterns
- Active preferences included in translation prompt
- Preference CRUD operations

---

*End of Feature 7 Specification*
