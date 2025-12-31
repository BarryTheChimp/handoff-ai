# F28: Story Splitting Assistant

> **Priority:** HIGH | **Effort:** 8 hours | **Phase:** 3

---

## Overview

**What:** AI-powered assistant that analyzes large or complex stories and suggests ways to split them into smaller, more manageable pieces.

**Why:** One of the biggest causes of sprint failure is stories that are too large. Teams often struggle to identify good split points. This feature:
- Identifies stories that should be split
- Suggests specific split strategies
- Preserves traceability to original story
- Reduces sprint planning friction

**Success Criteria:**
- Automatic detection of stories needing splits (from quality score)
- Multiple split strategy suggestions
- One-click split execution
- Parent-child relationship maintained
- Split history preserved

---

## User Stories

### Must Have

**US-28.1:** As a PM, I want stories automatically flagged when they're too large so that I know which need attention.
- **AC:** Stories with "Small" score < 10 are flagged
- **AC:** Flag appears on story card
- **AC:** Filter to show only flagged stories

**US-28.2:** As a PM, I want AI-suggested ways to split a story so that I have concrete options.
- **AC:** Click "Suggest Split" → get 2-3 split strategies
- **AC:** Each strategy shows resulting stories
- **AC:** Strategies labeled (e.g., "By workflow", "By data type")

**US-28.3:** As a PM, I want to execute a suggested split so that I don't have to manually create stories.
- **AC:** Select a strategy → click "Split"
- **AC:** Original story becomes parent
- **AC:** New child stories created with copied AC

### Should Have

**US-28.4:** As a PM, I want to customize suggested splits before executing so that I can adjust the AI's suggestions.
- **AC:** Edit titles before splitting
- **AC:** Move AC between split stories
- **AC:** Add/remove from suggested split

**US-28.5:** As a PM, I want to undo a split so that I can revert if needed.
- **AC:** "Undo Split" option available for 24 hours
- **AC:** Restores original story, removes children

---

## Split Strategies

The AI suggests splits based on common patterns:

| Strategy | When to Use | Example |
|----------|-------------|---------|
| **By Workflow Step** | Story covers multiple steps | "Search, Select, and Purchase" → 3 stories |
| **By User Role** | Multiple personas involved | "Admin and User can manage" → 2 stories |
| **By Data Type** | Multiple entities processed | "Import customers and products" → 2 stories |
| **By Rule** | Multiple business rules | "Validate email, phone, address" → 3 stories |
| **By Operation** | CRUD operations | "Create, update, delete users" → 3 stories |
| **By Interface** | Multiple UI elements | "Dashboard with chart, table, filters" → 3 stories |

---

## Technical Design

### API Endpoints

```typescript
// Analyze a story for split suggestions
POST /api/workitems/:id/split/analyze
Response: {
  data: {
    shouldSplit: boolean;
    reason: string;
    strategies: SplitStrategy[];
  }
}

interface SplitStrategy {
  id: string;
  name: string;  // e.g., "By Workflow Step"
  description: string;
  suggestedStories: Array<{
    title: string;
    description: string;
    acceptanceCriteria: string[];
    estimatedSize: string;
  }>;
  confidence: number;  // 0-1
}

// Execute a split
POST /api/workitems/:id/split/execute
Body: {
  strategyId: string;
  customizations?: {
    stories: Array<{
      title: string;
      acceptanceCriteria: string[];
    }>;
  };
}
Response: {
  data: {
    parentId: string;
    childIds: string[];
  }
}

// Undo a split
POST /api/workitems/:id/split/undo
Response: { data: { success: boolean } }
```

### Story Split Service

```typescript
// backend/src/services/StorySplitService.ts

export class StorySplitService {
  
  constructor(
    private claudeService: ClaudeService,
    private qualityScoreService: QualityScoreService
  ) {}
  
  async analyzeSplit(workItemId: string): Promise<SplitAnalysis> {
    const workItem = await prisma.workItem.findUnique({
      where: { id: workItemId },
      include: { qualityScore: true }
    });
    
    if (!workItem) throw new NotFoundError('Work item not found');
    
    // Check if split is recommended
    const qualityScore = workItem.qualityScore;
    const shouldSplit = qualityScore 
      ? qualityScore.smallScore < 10 || qualityScore.overallScore < 50
      : (workItem.acceptanceCriteria as string[])?.length > 6;
    
    if (!shouldSplit) {
      return {
        shouldSplit: false,
        reason: 'Story appears appropriately sized',
        strategies: [],
      };
    }
    
    // Generate split strategies using AI
    const strategies = await this.generateSplitStrategies(workItem);
    
    return {
      shouldSplit: true,
      reason: this.getSplitReason(workItem, qualityScore),
      strategies,
    };
  }
  
  private async generateSplitStrategies(workItem: WorkItem): Promise<SplitStrategy[]> {
    const prompt = `Analyze this user story and suggest ways to split it into smaller stories.

ORIGINAL STORY:
Title: ${workItem.title}
Description: ${workItem.description}
Acceptance Criteria:
${(workItem.acceptanceCriteria as string[])?.map((ac, i) => `${i + 1}. ${ac}`).join('\n')}

Suggest 2-3 different split strategies. For each strategy:
1. Identify a logical way to divide the work
2. Create specific story titles
3. Distribute acceptance criteria appropriately
4. Ensure each resulting story is independently valuable

Common split patterns:
- By workflow step (separate distinct user actions)
- By user role (if multiple actors)
- By data type (if handling multiple entities)
- By operation (CRUD operations)
- By business rule (separate validation rules)

Respond in JSON format:
{
  "strategies": [
    {
      "name": "Strategy Name",
      "description": "Why this split makes sense",
      "confidence": 0.8,
      "stories": [
        {
          "title": "New Story 1",
          "description": "Brief description",
          "acceptanceCriteria": ["AC 1", "AC 2"],
          "estimatedSize": "S"
        }
      ]
    }
  ]
}`;

    const response = await this.claudeService.complete({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
    });
    
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return [];
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return parsed.strategies.map((s: any, index: number) => ({
        id: `strategy-${index}`,
        name: s.name,
        description: s.description,
        confidence: s.confidence || 0.7,
        suggestedStories: s.stories,
      }));
    } catch {
      return [];
    }
  }
  
  private getSplitReason(workItem: WorkItem, qualityScore: QualityScore | null): string {
    const reasons: string[] = [];
    
    if (qualityScore?.smallScore && qualityScore.smallScore < 10) {
      reasons.push('Story scored low on "Small" criterion');
    }
    
    const acCount = (workItem.acceptanceCriteria as string[])?.length || 0;
    if (acCount > 6) {
      reasons.push(`${acCount} acceptance criteria suggest multiple stories`);
    }
    
    if (workItem.title.toLowerCase().includes(' and ')) {
      reasons.push('Title contains "and" indicating multiple concerns');
    }
    
    return reasons.join('. ') || 'Story appears too large for a single sprint';
  }
  
  async executeSplit(
    workItemId: string, 
    strategyId: string, 
    customizations?: any
  ): Promise<{ parentId: string; childIds: string[] }> {
    const analysis = await this.analyzeSplit(workItemId);
    const strategy = analysis.strategies.find(s => s.id === strategyId);
    
    if (!strategy) throw new BadRequestError('Strategy not found');
    
    const parent = await prisma.workItem.findUnique({ where: { id: workItemId } });
    if (!parent) throw new NotFoundError('Work item not found');
    
    // Get stories to create (customized or from strategy)
    const storiesToCreate = customizations?.stories || strategy.suggestedStories;
    
    // Create child stories
    const childIds: string[] = [];
    
    for (let i = 0; i < storiesToCreate.length; i++) {
      const story = storiesToCreate[i];
      
      const child = await prisma.workItem.create({
        data: {
          specId: parent.specId,
          parentId: workItemId,
          type: 'story',
          title: story.title,
          description: story.description || parent.description,
          acceptanceCriteria: story.acceptanceCriteria,
          technicalNotes: parent.technicalNotes,
          sizeEstimate: story.estimatedSize || null,
          status: 'draft',
          orderIndex: i,
          metadata: {
            splitFrom: workItemId,
            splitStrategy: strategy.name,
            splitAt: new Date().toISOString(),
          },
        },
      });
      
      childIds.push(child.id);
    }
    
    // Update parent to mark as split
    await prisma.workItem.update({
      where: { id: workItemId },
      data: {
        metadata: {
          ...(parent.metadata as object || {}),
          wasSplit: true,
          splitIntoIds: childIds,
          splitStrategy: strategy.name,
          splitAt: new Date().toISOString(),
        },
      },
    });
    
    // Record in history
    await prisma.workItemHistory.create({
      data: {
        workItemId,
        changeType: 'split',
        previousValues: {
          acceptanceCriteria: parent.acceptanceCriteria,
        },
        newValues: {
          childIds,
          strategy: strategy.name,
        },
        changedBy: 'system',
      },
    });
    
    return { parentId: workItemId, childIds };
  }
  
  async undoSplit(workItemId: string): Promise<void> {
    const parent = await prisma.workItem.findUnique({
      where: { id: workItemId },
      include: { children: true },
    });
    
    if (!parent) throw new NotFoundError('Work item not found');
    
    const metadata = parent.metadata as any;
    if (!metadata?.wasSplit) {
      throw new BadRequestError('This story was not split');
    }
    
    // Check time limit (24 hours)
    const splitAt = new Date(metadata.splitAt);
    const hoursSinceSplit = (Date.now() - splitAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceSplit > 24) {
      throw new BadRequestError('Split can only be undone within 24 hours');
    }
    
    // Delete child stories
    await prisma.workItem.deleteMany({
      where: { parentId: workItemId },
    });
    
    // Update parent metadata
    await prisma.workItem.update({
      where: { id: workItemId },
      data: {
        metadata: {
          ...(metadata || {}),
          wasSplit: false,
          splitIntoIds: null,
          undoneAt: new Date().toISOString(),
        },
      },
    });
  }
}
```

### Frontend Components

#### SplitSuggestionModal

```tsx
// frontend/src/components/organisms/SplitSuggestionModal.tsx
import { useState, useEffect } from 'react';
import { Modal } from '../atoms/Modal';
import { Button } from '../atoms/Button';
import { Spinner } from '../atoms/Spinner';

interface Props {
  workItemId: string;
  isOpen: boolean;
  onClose: () => void;
  onSplitComplete: () => void;
}

export function SplitSuggestionModal({ workItemId, isOpen, onClose, onSplitComplete }: Props) {
  const [analysis, setAnalysis] = useState<SplitAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  
  useEffect(() => {
    if (!isOpen) return;
    
    setLoading(true);
    fetch(`/api/workitems/${workItemId}/split/analyze`, { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        setAnalysis(d.data);
        if (d.data.strategies.length > 0) {
          setSelectedStrategy(d.data.strategies[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, [isOpen, workItemId]);
  
  const handleExecuteSplit = async () => {
    if (!selectedStrategy) return;
    
    setExecuting(true);
    try {
      await fetch(`/api/workitems/${workItemId}/split/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategyId: selectedStrategy }),
      });
      onSplitComplete();
      onClose();
    } catch (err) {
      console.error('Split failed:', err);
    } finally {
      setExecuting(false);
    }
  };
  
  const selectedStrategyData = analysis?.strategies.find(s => s.id === selectedStrategy);
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Split Story">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
          <span className="ml-3 text-toucan-grey-400">Analyzing story...</span>
        </div>
      ) : !analysis?.shouldSplit ? (
        <div className="py-8 text-center">
          <p className="text-toucan-grey-100 mb-2">This story doesn't need to be split</p>
          <p className="text-sm text-toucan-grey-400">{analysis?.reason}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Reason */}
          <div className="bg-toucan-warning/10 border border-toucan-warning/30 rounded-lg p-4">
            <p className="text-sm text-toucan-warning">{analysis.reason}</p>
          </div>
          
          {/* Strategy Selection */}
          <div>
            <h3 className="text-sm font-medium text-toucan-grey-200 mb-3">
              Select Split Strategy
            </h3>
            <div className="space-y-2">
              {analysis.strategies.map((strategy) => (
                <button
                  key={strategy.id}
                  onClick={() => setSelectedStrategy(strategy.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    selectedStrategy === strategy.id
                      ? 'border-toucan-orange bg-toucan-orange/10'
                      : 'border-toucan-dark-border hover:border-toucan-grey-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-toucan-grey-100">{strategy.name}</span>
                    <span className="text-xs text-toucan-grey-400">
                      {Math.round(strategy.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-sm text-toucan-grey-400">{strategy.description}</p>
                  <p className="text-xs text-toucan-grey-500 mt-1">
                    → {strategy.suggestedStories.length} stories
                  </p>
                </button>
              ))}
            </div>
          </div>
          
          {/* Preview */}
          {selectedStrategyData && (
            <div>
              <h3 className="text-sm font-medium text-toucan-grey-200 mb-3">
                Resulting Stories
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {selectedStrategyData.suggestedStories.map((story, i) => (
                  <div 
                    key={i}
                    className="bg-toucan-dark rounded-lg p-3 border border-toucan-dark-border"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-toucan-grey-100 text-sm">
                        {story.title}
                      </span>
                      {story.estimatedSize && (
                        <span className="text-xs px-2 py-1 bg-toucan-dark-lighter rounded">
                          {story.estimatedSize}
                        </span>
                      )}
                    </div>
                    <ul className="text-xs text-toucan-grey-400 space-y-1">
                      {story.acceptanceCriteria.slice(0, 3).map((ac, j) => (
                        <li key={j}>• {ac}</li>
                      ))}
                      {story.acceptanceCriteria.length > 3 && (
                        <li className="text-toucan-grey-500">
                          +{story.acceptanceCriteria.length - 3} more
                        </li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-toucan-dark-border">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button 
              variant="primary" 
              onClick={handleExecuteSplit}
              disabled={!selectedStrategy || executing}
            >
              {executing ? <Spinner size="sm" className="mr-2" /> : null}
              Split into {selectedStrategyData?.suggestedStories.length || 0} Stories
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
```

#### Split Flag Badge

```tsx
// Add to StoryCard component
{qualityScore?.smallScore < 10 && (
  <span 
    className="text-xs px-2 py-1 bg-toucan-warning/20 text-toucan-warning rounded"
    title="This story may be too large"
  >
    Consider splitting
  </span>
)}
```

---

## Database Changes

Uses existing WorkItem and WorkItemHistory models with metadata.

---

## Testing Checklist

- [ ] Stories with small score < 10 show split flag
- [ ] Analyze returns multiple strategies
- [ ] Split creates correct number of children
- [ ] Parent metadata updated correctly
- [ ] Undo works within 24 hours
- [ ] Undo fails after 24 hours
- [ ] History records split events

---

*F28 Specification v1.0*
