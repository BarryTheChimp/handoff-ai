# Feature 17: Learning Loop

## Overview

**What:** Track every edit users make to generated stories. Detect patterns. Surface suggestions to improve future translations. The system gets smarter over time.

**Why:** From Chip Huyen's AI Engineering: *"User edits serve as a valuable source of preference data."* Every correction is implicit feedback. If users always add error handling to API stories, the AI should learn to do that automatically.

**Success Criteria:**
- All story edits are tracked (before/after)
- Patterns are detected ("users often add X")
- Suggestions surfaced ("Add this to preferences?")
- Accepted suggestions improve future translations

## The Learning Loop

```
┌─────────────────────────────────────────────────────────────────────┐
│                      LEARNING LOOP                                  │
│                                                                     │
│  1. TRACK                                                           │
│     User edits story → Store before/after                          │
│                                                                     │
│  2. DETECT                                                          │
│     Analyze edits → Find patterns                                   │
│     "Users add error handling to 8/10 API stories"                 │
│                                                                     │
│  3. SUGGEST                                                         │
│     Surface pattern → "Add to preferences?"                        │
│                                                                     │
│  4. APPLY                                                           │
│     User accepts → Add to team preferences                          │
│     Future translations include it automatically                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## What We Track

| Edit Type | Signal | Learning |
|-----------|--------|----------|
| Title change | Naming conventions | Learn preferred phrasing |
| Description addition | Missing context | Include in future |
| AC addition | Gaps in coverage | Learn what's expected |
| AC removal | Over-specification | Simplify future output |
| Technical notes edit | Wrong assumptions | Update domain knowledge |
| Story deletion | Bad generation | Avoid similar patterns |

## Database Schema

```prisma
/// StoryEdit - Tracks changes made to generated stories
model StoryEdit {
  id          String   @id @default(uuid())
  projectId   String   @map("project_id")
  workItemId  String   @map("work_item_id")
  
  // What changed
  field       EditField
  beforeValue String   @db.Text @map("before_value")
  afterValue  String   @db.Text @map("after_value")
  
  // Context
  editType    EditType @map("edit_type")
  specId      String   @map("spec_id")
  userId      String   @map("user_id")
  
  // Timestamps
  createdAt   DateTime @default(now()) @map("created_at")
  
  // Relations
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  workItem    WorkItem @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  
  @@index([projectId])
  @@index([workItemId])
  @@index([field])
  @@map("story_edits")
}

enum EditField {
  title
  description
  acceptanceCriteria
  technicalNotes
  size
  priority
}

enum EditType {
  addition     // Content added
  removal      // Content removed
  modification // Content changed
  complete     // Entire field rewritten
}

/// LearnedPattern - Patterns detected from edits
model LearnedPattern {
  id          String   @id @default(uuid())
  projectId   String   @map("project_id")
  
  // Pattern details
  pattern     String   @db.Text
  description String   @db.Text
  confidence  Float    // 0-1
  occurrences Int      @default(1)
  
  // What triggered it
  field       EditField
  context     String?  // e.g., "API stories", "authentication"
  
  // Suggested action
  suggestion  String   @db.Text
  suggestionType SuggestionType @map("suggestion_type")
  
  // Status
  status      PatternStatus @default(pending)
  reviewedAt  DateTime? @map("reviewed_at")
  reviewedBy  String?  @map("reviewed_by")
  appliedAt   DateTime? @map("applied_at")
  
  // Timestamps
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  // Relations
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@index([projectId])
  @@index([status])
  @@map("learned_patterns")
}

enum SuggestionType {
  addToPreferences    // "Add to custom preferences"
  addToGlossary       // "Add term to glossary"
  updateTemplate      // "Update story template"
  addRequiredSection  // "Always include this section"
}

enum PatternStatus {
  pending    // Detected, not reviewed
  suggested  // Shown to user
  accepted   // User accepted
  dismissed  // User dismissed
  applied    // Applied to preferences
}
```

## Edit Tracking

When a story is edited, capture the change:

```typescript
// backend/src/services/EditTracker.ts

export class EditTracker {
  private prisma: PrismaClient;

  async trackEdit(
    workItemId: string,
    field: EditField,
    beforeValue: string,
    afterValue: string,
    userId: string
  ): Promise<void> {
    // Skip if no actual change
    if (beforeValue.trim() === afterValue.trim()) return;

    const workItem = await this.prisma.workItem.findUnique({
      where: { id: workItemId },
      include: { spec: true },
    });

    // Determine edit type
    const editType = this.classifyEdit(beforeValue, afterValue);

    // Store edit
    await this.prisma.storyEdit.create({
      data: {
        projectId: workItem.spec.projectId,
        workItemId,
        specId: workItem.specId,
        userId,
        field,
        beforeValue,
        afterValue,
        editType,
      },
    });

    // Trigger pattern detection (async, don't block)
    this.detectPatterns(workItem.spec.projectId).catch(console.error);
  }

  private classifyEdit(before: string, after: string): EditType {
    if (!before.trim()) return 'addition';
    if (!after.trim()) return 'removal';
    
    // Check if mostly new content
    const beforeWords = new Set(before.toLowerCase().split(/\s+/));
    const afterWords = after.toLowerCase().split(/\s+/);
    const newWords = afterWords.filter(w => !beforeWords.has(w));
    
    if (newWords.length > afterWords.length * 0.7) return 'complete';
    return 'modification';
  }
}
```

## Pattern Detection

Analyze edits to find recurring patterns:

```typescript
// backend/src/services/PatternDetector.ts

interface DetectedPattern {
  pattern: string;
  description: string;
  confidence: number;
  suggestion: string;
  suggestionType: SuggestionType;
  occurrences: number;
  context?: string;
}

export class PatternDetector {
  private prisma: PrismaClient;

  async detectPatterns(projectId: string): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];

    // Get recent edits
    const recentEdits = await this.prisma.storyEdit.findMany({
      where: {
        projectId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      },
      include: { workItem: true },
    });

    // Group by field
    const byField = this.groupBy(recentEdits, 'field');

    // Detect AC addition patterns
    if (byField.acceptanceCriteria) {
      const acPatterns = await this.detectACPatterns(byField.acceptanceCriteria);
      patterns.push(...acPatterns);
    }

    // Detect description patterns
    if (byField.description) {
      const descPatterns = await this.detectDescriptionPatterns(byField.description);
      patterns.push(...descPatterns);
    }

    // Detect technical notes patterns
    if (byField.technicalNotes) {
      const techPatterns = await this.detectTechNotesPatterns(byField.technicalNotes);
      patterns.push(...techPatterns);
    }

    // Store significant patterns
    for (const pattern of patterns) {
      if (pattern.confidence >= 0.6 && pattern.occurrences >= 3) {
        await this.storePattern(projectId, pattern);
      }
    }

    return patterns;
  }

  private async detectACPatterns(edits: StoryEdit[]): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];
    
    // Find common phrases added
    const additions = edits
      .filter(e => e.editType === 'addition' || e.editType === 'modification')
      .map(e => this.getAddedContent(e.beforeValue, e.afterValue));

    // Look for recurring phrases
    const phrases = this.extractPhrases(additions.flat());
    const phraseCounts = this.countOccurrences(phrases);

    for (const [phrase, count] of Object.entries(phraseCounts)) {
      if (count >= 3 && phrase.length > 10) {
        patterns.push({
          pattern: phrase,
          description: `Users frequently add "${phrase.slice(0, 50)}..." to acceptance criteria`,
          confidence: Math.min(count / 10, 0.9),
          suggestion: `Always include: "${phrase}"`,
          suggestionType: 'addToPreferences',
          occurrences: count,
        });
      }
    }

    // Detect error handling additions
    const errorHandlingEdits = additions.filter(adds =>
      adds.some(a => /error|exception|fail|invalid|catch/i.test(a))
    );
    if (errorHandlingEdits.length >= 3) {
      patterns.push({
        pattern: 'error_handling',
        description: `Users add error handling to ${errorHandlingEdits.length} stories`,
        confidence: errorHandlingEdits.length / additions.length,
        suggestion: 'Always include error handling acceptance criteria',
        suggestionType: 'addRequiredSection',
        occurrences: errorHandlingEdits.length,
        context: 'Error Handling',
      });
    }

    return patterns;
  }

  private getAddedContent(before: string, after: string): string[] {
    const beforeLines = new Set(before.split('\n').map(l => l.trim()));
    const afterLines = after.split('\n').map(l => l.trim());
    return afterLines.filter(l => l && !beforeLines.has(l));
  }

  private extractPhrases(lines: string[]): string[] {
    // Extract meaningful phrases (3+ words)
    return lines
      .map(l => l.replace(/^[-*•]\s*/, '').trim())
      .filter(l => l.split(/\s+/).length >= 3);
  }

  private countOccurrences(items: string[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const item of items) {
      const normalized = item.toLowerCase();
      counts[normalized] = (counts[normalized] || 0) + 1;
    }
    return counts;
  }

  private async storePattern(projectId: string, pattern: DetectedPattern): Promise<void> {
    // Check if similar pattern exists
    const existing = await this.prisma.learnedPattern.findFirst({
      where: {
        projectId,
        pattern: pattern.pattern,
        status: { in: ['pending', 'suggested'] },
      },
    });

    if (existing) {
      // Update occurrence count
      await this.prisma.learnedPattern.update({
        where: { id: existing.id },
        data: {
          occurrences: existing.occurrences + pattern.occurrences,
          confidence: Math.max(existing.confidence, pattern.confidence),
        },
      });
    } else {
      // Create new pattern
      await this.prisma.learnedPattern.create({
        data: {
          projectId,
          pattern: pattern.pattern,
          description: pattern.description,
          confidence: pattern.confidence,
          suggestion: pattern.suggestion,
          suggestionType: pattern.suggestionType,
          occurrences: pattern.occurrences,
          field: 'acceptanceCriteria', // Default, adjust based on source
          context: pattern.context,
        },
      });
    }
  }
}
```

## API Endpoints

### GET /api/projects/:id/learning/patterns
Get pending patterns for review.

```json
{
  "data": [
    {
      "id": "uuid",
      "pattern": "error_handling",
      "description": "Users add error handling to 8 stories",
      "confidence": 0.8,
      "suggestion": "Always include error handling acceptance criteria",
      "suggestionType": "addRequiredSection",
      "occurrences": 8,
      "status": "pending"
    }
  ]
}
```

### POST /api/projects/:id/learning/patterns/:patternId/accept
Accept suggestion and apply to preferences.

### POST /api/projects/:id/learning/patterns/:patternId/dismiss
Dismiss suggestion.

### GET /api/projects/:id/learning/stats
Get learning statistics.

```json
{
  "data": {
    "totalEdits": 145,
    "editsThisWeek": 23,
    "patternsDetected": 5,
    "patternsApplied": 2,
    "topEditedFields": [
      { "field": "acceptanceCriteria", "count": 67 },
      { "field": "description", "count": 45 }
    ]
  }
}
```

## Frontend: Learning Suggestions

**File:** `frontend/src/components/organisms/LearningSuggestions.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

interface Pattern {
  id: string;
  description: string;
  suggestion: string;
  confidence: number;
  occurrences: number;
}

export function LearningSuggestions({ projectId }: { projectId: string }) {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPatterns();
  }, [projectId]);

  async function loadPatterns() {
    const response = await api.get(`/projects/${projectId}/learning/patterns`);
    setPatterns(response.data.data);
  }

  async function acceptPattern(patternId: string) {
    await api.post(`/projects/${projectId}/learning/patterns/${patternId}/accept`);
    setPatterns(patterns.filter(p => p.id !== patternId));
  }

  async function dismissPattern(patternId: string) {
    await api.post(`/projects/${projectId}/learning/patterns/${patternId}/dismiss`);
    setDismissed(new Set([...dismissed, patternId]));
  }

  const visiblePatterns = patterns.filter(p => !dismissed.has(p.id));
  if (visiblePatterns.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-toucan-orange/10 to-transparent border border-toucan-orange/20 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-toucan-orange">💡</span>
        <span className="text-sm font-medium text-toucan-grey-200">
          Learning Suggestions
        </span>
      </div>

      <div className="space-y-3">
        {visiblePatterns.slice(0, 3).map((pattern) => (
          <div key={pattern.id} className="bg-toucan-dark rounded-lg p-3">
            <p className="text-sm text-toucan-grey-300">{pattern.description}</p>
            <p className="text-xs text-toucan-grey-500 mt-1">
              Suggestion: {pattern.suggestion}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => acceptPattern(pattern.id)}
                className="text-xs px-3 py-1 bg-toucan-orange/20 text-toucan-orange rounded hover:bg-toucan-orange/30"
              >
                Apply
              </button>
              <button
                onClick={() => dismissPattern(pattern.id)}
                className="text-xs px-3 py-1 text-toucan-grey-500 hover:text-toucan-grey-300"
              >
                Dismiss
              </button>
              <span className="text-xs text-toucan-grey-600 ml-auto">
                {Math.round(pattern.confidence * 100)}% confidence
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Integration Points

### 1. Story Editor - Track Edits

```typescript
// In story editor component
async function handleSave(field: string, newValue: string) {
  const oldValue = story[field];
  
  // Save to backend
  await api.put(`/work-items/${story.id}`, { [field]: newValue });
  
  // Track edit (fire and forget)
  api.post(`/work-items/${story.id}/edits`, {
    field,
    beforeValue: oldValue,
    afterValue: newValue,
  }).catch(console.error);
}
```

### 2. Dashboard - Show Suggestions

```typescript
// In dashboard
<LearningSuggestions projectId={selectedProjectId} />
```

### 3. Preferences - Show Applied Patterns

```typescript
// In PreferencesEditor
<AppliedPatternsSection projectId={projectId} />
```

## Testing Checklist

- [ ] Edit story AC → edit tracked in database
- [ ] Edit same pattern 3+ times → pattern detected
- [ ] Pattern shown in suggestions widget
- [ ] Accept pattern → added to preferences
- [ ] Dismiss pattern → hidden, not deleted
- [ ] Next translation → includes applied pattern
- [ ] Stats endpoint returns correct counts
- [ ] Confidence calculation is sensible

## Dependencies

- Feature 14 (Knowledge Base) - TeamPreferences model
- WorkItem model with editable fields

## Effort Estimate

**6 hours**
- Database schema: 30 min
- EditTracker service: 1 hour
- PatternDetector service: 2 hours
- API endpoints: 45 min
- LearningSuggestions UI: 1 hour
- Integration: 30 min
- Testing: 15 min
