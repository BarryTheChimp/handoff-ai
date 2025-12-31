# F29: Duplicate Detection

> **Priority:** MEDIUM | **Effort:** 6 hours | **Phase:** 3

---

## Overview

**What:** Automatically scan generated stories for duplicates within the project and optionally against existing Jira backlog before export.

**Why:** AI translation can sometimes generate overlapping stories, especially when specs have redundant sections. Duplicates cause:
- Wasted sprint capacity
- Confusion about which story to work on
- Jira clutter
- Double estimation

**Success Criteria:**
- Detect semantic duplicates (similar meaning, different words)
- Detect exact/near-exact duplicates
- Show comparison view
- Allow merge or ignore
- Pre-export scan option

---

## User Stories

### Must Have

**US-29.1:** As a PM, I want duplicates detected automatically so that I don't export redundant stories.
- **AC:** After translation, duplicates flagged
- **AC:** Shows similarity percentage
- **AC:** Groups related duplicates together

**US-29.2:** As a PM, I want to see duplicates side-by-side so that I can decide what to do.
- **AC:** Click duplicate → shows comparison
- **AC:** Highlights similar text
- **AC:** Shows which spec each came from

**US-29.3:** As a PM, I want to merge duplicates so that I keep the best version.
- **AC:** Select "primary" story
- **AC:** Merge acceptance criteria from both
- **AC:** Delete duplicate

### Should Have

**US-29.4:** As a PM, I want to mark duplicates as "not duplicates" so that I can dismiss false positives.
- **AC:** "Ignore" option marks as reviewed
- **AC:** Ignored pairs don't reappear

---

## Technical Design

### Database Model

```prisma
model DuplicateMatch {
  id                String    @id @default(uuid())
  projectId         String
  
  sourceWorkItemId  String
  targetWorkItemId  String?
  targetJiraKey     String?
  
  similarityScore   Float     // 0.0 - 1.0
  matchType         String    // 'exact' | 'semantic' | 'partial'
  overlappingText   String?
  
  status            String    @default("pending")
  reviewedAt        DateTime?
  
  detectedAt        DateTime  @default(now())
  
  @@unique([sourceWorkItemId, targetWorkItemId])
}
```

### API Endpoints

```typescript
// Scan a spec for duplicates
POST /api/specs/:id/duplicates/scan
Response: { data: { matchesFound: number; matches: DuplicateMatch[] } }

// Ignore a duplicate match
POST /api/duplicates/:id/ignore
Response: { data: { success: true } }

// Merge duplicates
POST /api/duplicates/:id/merge
Body: { keepId: string; mergeAC: boolean }
Response: { data: { survivingId: string } }
```

### Duplicate Detection Service

```typescript
// backend/src/services/DuplicateDetectionService.ts

export class DuplicateDetectionService {
  
  private readonly SIMILARITY_THRESHOLD = 0.8;
  
  async scanSpec(specId: string): Promise<{ matchesFound: number; matches: any[] }> {
    const spec = await prisma.spec.findUnique({
      where: { id: specId },
      include: {
        workItems: { where: { type: 'story' } },
        project: {
          include: {
            specs: {
              include: {
                workItems: { where: { type: 'story' } }
              }
            }
          }
        }
      }
    });
    
    if (!spec) throw new NotFoundError('Spec not found');
    
    const allStories = spec.project.specs.flatMap(s => s.workItems);
    const specStories = spec.workItems;
    
    // Generate embeddings
    const embeddings = new Map<string, number[]>();
    for (const story of allStories) {
      embeddings.set(story.id, this.createEmbedding(this.getStoryText(story)));
    }
    
    // Find duplicates
    const matches: any[] = [];
    
    for (const source of specStories) {
      const sourceEmb = embeddings.get(source.id)!;
      
      for (const target of allStories) {
        if (source.id >= target.id) continue; // Skip self and already checked
        
        const similarity = this.cosineSimilarity(sourceEmb, embeddings.get(target.id)!);
        
        if (similarity >= this.SIMILARITY_THRESHOLD) {
          const existing = await prisma.duplicateMatch.findFirst({
            where: {
              OR: [
                { sourceWorkItemId: source.id, targetWorkItemId: target.id },
                { sourceWorkItemId: target.id, targetWorkItemId: source.id },
              ]
            }
          });
          
          if (!existing) {
            const match = await prisma.duplicateMatch.create({
              data: {
                projectId: spec.projectId,
                sourceWorkItemId: source.id,
                targetWorkItemId: target.id,
                similarityScore: similarity,
                matchType: similarity >= 0.95 ? 'exact' : similarity >= 0.9 ? 'semantic' : 'partial',
                status: 'pending',
              }
            });
            matches.push(match);
          }
        }
      }
    }
    
    return { matchesFound: matches.length, matches };
  }
  
  private getStoryText(story: any): string {
    return [
      story.title,
      story.description || '',
      ...(story.acceptanceCriteria || []),
    ].join(' ').toLowerCase();
  }
  
  private createEmbedding(text: string): number[] {
    const words = text.split(/\s+/);
    const vector = new Array(500).fill(0);
    for (const word of words) {
      const hash = this.hash(word) % 500;
      vector[hash] += 1;
    }
    const mag = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
    return vector.map(v => v / (mag || 1));
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    return a.reduce((sum, v, i) => sum + v * b[i], 0);
  }
  
  private hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h) + s.charCodeAt(i);
    }
    return Math.abs(h);
  }
  
  async mergeDuplicates(matchId: string, keepId: string, mergeAC: boolean) {
    const match = await prisma.duplicateMatch.findUnique({
      where: { id: matchId },
      include: { sourceWorkItem: true, targetWorkItem: true }
    });
    
    if (!match) throw new NotFoundError('Match not found');
    
    const keep = keepId === match.sourceWorkItemId ? match.sourceWorkItem : match.targetWorkItem;
    const remove = keepId === match.sourceWorkItemId ? match.targetWorkItem : match.sourceWorkItem;
    
    if (mergeAC && keep && remove) {
      const keepAC = (keep.acceptanceCriteria as string[]) || [];
      const removeAC = (remove.acceptanceCriteria as string[]) || [];
      const merged = [...keepAC, ...removeAC.filter(ac => !keepAC.includes(ac))];
      
      await prisma.workItem.update({
        where: { id: keep.id },
        data: { acceptanceCriteria: merged }
      });
    }
    
    if (remove) {
      await prisma.workItem.delete({ where: { id: remove.id } });
    }
    
    await prisma.duplicateMatch.update({
      where: { id: matchId },
      data: { status: 'merged', reviewedAt: new Date() }
    });
    
    return { survivingId: keepId };
  }
}
```

### Frontend - Duplicate Review

```tsx
// frontend/src/components/molecules/DuplicateReviewPanel.tsx
interface Props {
  match: DuplicateMatch;
  sourceStory: WorkItem;
  targetStory: WorkItem;
  onIgnore: () => void;
  onMerge: (keepId: string, mergeAC: boolean) => void;
}

export function DuplicateReviewPanel({ match, sourceStory, targetStory, onIgnore, onMerge }: Props) {
  const [keepId, setKeepId] = useState(sourceStory.id);
  const [mergeAC, setMergeAC] = useState(true);
  
  return (
    <div className="bg-toucan-dark-lighter rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Badge variant={match.matchType === 'exact' ? 'error' : 'warning'}>
          {match.matchType}
        </Badge>
        <span className="text-sm text-toucan-grey-400">
          {Math.round(match.similarityScore * 100)}% similar
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div 
          className={`p-3 rounded border cursor-pointer ${keepId === sourceStory.id ? 'border-toucan-orange' : 'border-toucan-dark-border'}`}
          onClick={() => setKeepId(sourceStory.id)}
        >
          <h4 className="font-medium text-sm mb-2">{sourceStory.title}</h4>
          <ul className="text-xs text-toucan-grey-400">
            {(sourceStory.acceptanceCriteria as string[])?.slice(0, 3).map((ac, i) => (
              <li key={i}>• {ac}</li>
            ))}
          </ul>
        </div>
        
        <div 
          className={`p-3 rounded border cursor-pointer ${keepId === targetStory.id ? 'border-toucan-orange' : 'border-toucan-dark-border'}`}
          onClick={() => setKeepId(targetStory.id)}
        >
          <h4 className="font-medium text-sm mb-2">{targetStory.title}</h4>
          <ul className="text-xs text-toucan-grey-400">
            {(targetStory.acceptanceCriteria as string[])?.slice(0, 3).map((ac, i) => (
              <li key={i}>• {ac}</li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="flex items-center gap-4 mb-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={mergeAC} onChange={e => setMergeAC(e.target.checked)} />
          Merge acceptance criteria
        </label>
      </div>
      
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onIgnore}>Not a Duplicate</Button>
        <Button variant="primary" size="sm" onClick={() => onMerge(keepId, mergeAC)}>Merge</Button>
      </div>
    </div>
  );
}
```

---

## Testing Checklist

- [ ] Exact duplicates detected (>95%)
- [ ] Semantic duplicates detected (>80%)
- [ ] Ignore updates status
- [ ] Merge keeps correct story
- [ ] Merge combines AC
- [ ] Deleted story removed

---

*F29 Specification v1.0*
