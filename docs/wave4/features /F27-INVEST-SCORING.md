# F27: INVEST Quality Scoring

> **Priority:** HIGH | **Effort:** 6 hours | **Phase:** 3

---

## Overview

**What:** Automatically score each user story against the INVEST criteria (Independent, Negotiable, Valuable, Estimable, Small, Testable) and provide actionable improvement suggestions.

**Why:** Research shows teams following INVEST criteria see 66% better alignment. Currently, story quality is subjective. Automated scoring:
- Ensures consistent quality standards
- Identifies stories needing improvement before sprint planning
- Educates teams on good story writing
- Reduces rework from poorly defined stories

**Reference:** Bill Wake's INVEST criteria (2003), widely adopted in agile methodology.

**Success Criteria:**
- Every story displays quality score (0-100)
- Breakdown shows score for each INVEST criterion
- Improvement suggestions are specific and actionable
- Batch scoring for entire specs
- Filter/sort by quality score

---

## User Stories

### Must Have

**US-27.1:** As a PM, I want each story scored against INVEST so that I know which stories need improvement.
- **AC:** Score displayed on story card (0-100)
- **AC:** Color coding: green (80+), yellow (50-79), red (<50)
- **AC:** Hover shows brief explanation

**US-27.2:** As a PM, I want to see the breakdown of each INVEST criterion so that I understand specific weaknesses.
- **AC:** Click score → shows breakdown panel
- **AC:** Each criterion scored 0-20
- **AC:** Visual bar for each criterion

**US-27.3:** As a PM, I want improvement suggestions so that I know how to fix low-scoring stories.
- **AC:** Suggestions tied to lowest-scoring criteria
- **AC:** Suggestions are specific (not generic "improve this")
- **AC:** One-click to edit story with suggestion

### Should Have

**US-27.4:** As a PM, I want to score all stories in a spec at once so that I can quickly assess overall quality.
- **AC:** "Score All" button on spec
- **AC:** Progress indicator during scoring
- **AC:** Summary of results

**US-27.5:** As a PM, I want to filter stories by quality score so that I can focus on problem areas.
- **AC:** Filter: "Needs improvement" (<50)
- **AC:** Sort by score ascending/descending

---

## INVEST Criteria Definition

Based on Bill Wake's original definition, adapted for automated analysis:

| Criterion | Weight | What It Measures | Automated Analysis |
|-----------|--------|------------------|-------------------|
| **I**ndependent | 20 | Can be developed without other stories | Check for dependency keywords, cross-references |
| **N**egotiable | 20 | Details can be discussed, not over-specified | Check word count, prescription level |
| **V**aluable | 20 | Delivers value to user/business | Check for user-centric language, outcome focus |
| **E**stimable | 20 | Can be estimated by team | Check clarity, technical specificity |
| **S**mall | 20 | Fits in a sprint | Check AC count, scope indicators |
| **T**estable | 20 | Has clear pass/fail criteria | Check AC quality, measurable outcomes |

---

## Technical Design

### Quality Score Model

```prisma
model QualityScore {
  id              String    @id @default(uuid())
  workItemId      String    @unique
  workItem        WorkItem  @relation(fields: [workItemId], references: [id], onDelete: Cascade)
  
  overallScore    Int       // 0-100
  
  // INVEST breakdown (each 0-20)
  independentScore   Int
  negotiableScore    Int
  valuableScore      Int
  estimableScore     Int
  smallScore         Int
  testableScore      Int
  
  // Analysis details
  suggestions     Json      // Array of improvement suggestions
  analysisDetails Json      // Detailed reasoning for each score
  
  scoredAt        DateTime  @default(now())
  scoredBy        String    @default("ai") // 'ai' or user override
  
  @@index([workItemId])
}
```

### API Endpoints

```typescript
// Score a single work item
POST /api/workitems/:id/quality
Response: { data: QualityScore }

// Refresh score (re-analyze)
POST /api/workitems/:id/quality/refresh
Response: { data: QualityScore }

// Get quality summary for a spec
GET /api/specs/:id/quality/summary
Response: {
  data: {
    averageScore: number;
    distribution: { excellent: number; good: number; fair: number; poor: number };
    lowestScoring: WorkItem[];
    suggestions: string[];
  }
}

// Batch score all stories in a spec
POST /api/specs/:id/quality/batch
Response: { data: { scored: number; averageScore: number } }
```

### Quality Scoring Service

```typescript
// backend/src/services/QualityScoreService.ts

interface QualityAnalysis {
  overall: number;
  independent: { score: number; reasons: string[] };
  negotiable: { score: number; reasons: string[] };
  valuable: { score: number; reasons: string[] };
  estimable: { score: number; reasons: string[] };
  small: { score: number; reasons: string[] };
  testable: { score: number; reasons: string[] };
  suggestions: string[];
}

export class QualityScoreService {
  
  constructor(private claudeService: ClaudeService) {}
  
  async scoreWorkItem(workItemId: string): Promise<QualityScore> {
    const workItem = await prisma.workItem.findUnique({
      where: { id: workItemId },
      include: {
        parent: true,
        children: true,
        spec: true,
      }
    });
    
    if (!workItem) throw new NotFoundError('Work item not found');
    if (workItem.type !== 'story') {
      throw new BadRequestError('Quality scoring is only available for stories');
    }
    
    // Perform AI-assisted analysis
    const analysis = await this.analyzeStory(workItem);
    
    // Save or update score
    const score = await prisma.qualityScore.upsert({
      where: { workItemId },
      create: {
        workItemId,
        overallScore: analysis.overall,
        independentScore: analysis.independent.score,
        negotiableScore: analysis.negotiable.score,
        valuableScore: analysis.valuable.score,
        estimableScore: analysis.estimable.score,
        smallScore: analysis.small.score,
        testableScore: analysis.testable.score,
        suggestions: analysis.suggestions,
        analysisDetails: {
          independent: analysis.independent.reasons,
          negotiable: analysis.negotiable.reasons,
          valuable: analysis.valuable.reasons,
          estimable: analysis.estimable.reasons,
          small: analysis.small.reasons,
          testable: analysis.testable.reasons,
        },
      },
      update: {
        overallScore: analysis.overall,
        independentScore: analysis.independent.score,
        negotiableScore: analysis.negotiable.score,
        valuableScore: analysis.valuable.score,
        estimableScore: analysis.estimable.score,
        smallScore: analysis.small.score,
        testableScore: analysis.testable.score,
        suggestions: analysis.suggestions,
        analysisDetails: {
          independent: analysis.independent.reasons,
          negotiable: analysis.negotiable.reasons,
          valuable: analysis.valuable.reasons,
          estimable: analysis.estimable.reasons,
          small: analysis.small.reasons,
          testable: analysis.testable.reasons,
        },
        scoredAt: new Date(),
      },
    });
    
    return score;
  }
  
  private async analyzeStory(workItem: WorkItem): Promise<QualityAnalysis> {
    // Use AI for nuanced analysis
    const prompt = this.buildAnalysisPrompt(workItem);
    
    const response = await this.claudeService.complete({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
    });
    
    // Parse structured response
    const analysis = this.parseAnalysisResponse(response.content);
    
    // Apply heuristic adjustments
    return this.applyHeuristics(analysis, workItem);
  }
  
  private buildAnalysisPrompt(workItem: WorkItem): string {
    return `Analyze this user story against INVEST criteria. Score each criterion 0-20.

STORY:
Title: ${workItem.title}
Description: ${workItem.description || 'No description'}
Acceptance Criteria:
${(workItem.acceptanceCriteria as string[])?.map((ac, i) => `${i + 1}. ${ac}`).join('\n') || 'No acceptance criteria'}

Technical Notes: ${workItem.technicalNotes || 'None'}
Size Estimate: ${workItem.sizeEstimate || 'Not estimated'}

INVEST CRITERIA:
1. Independent (0-20): Can be developed without waiting for other stories
2. Negotiable (0-20): Details can be discussed, not over-specified
3. Valuable (0-20): Delivers clear value to user or business
4. Estimable (0-20): Clear enough for team to estimate
5. Small (0-20): Fits in a sprint (based on AC count and scope)
6. Testable (0-20): Has measurable pass/fail criteria

Respond in JSON format:
{
  "independent": { "score": X, "reasons": ["reason1", "reason2"] },
  "negotiable": { "score": X, "reasons": ["reason1"] },
  "valuable": { "score": X, "reasons": ["reason1"] },
  "estimable": { "score": X, "reasons": ["reason1"] },
  "small": { "score": X, "reasons": ["reason1"] },
  "testable": { "score": X, "reasons": ["reason1"] },
  "suggestions": ["specific suggestion 1", "specific suggestion 2"]
}`;
  }
  
  private parseAnalysisResponse(content: string): QualityAnalysis {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found');
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      const overall = Math.round(
        (parsed.independent.score +
         parsed.negotiable.score +
         parsed.valuable.score +
         parsed.estimable.score +
         parsed.small.score +
         parsed.testable.score) / 1.2 // Scale to 100
      );
      
      return {
        overall,
        ...parsed,
      };
    } catch (err) {
      // Return default scores if parsing fails
      return this.getDefaultAnalysis();
    }
  }
  
  private applyHeuristics(analysis: QualityAnalysis, workItem: WorkItem): QualityAnalysis {
    // Apply additional heuristic checks
    
    // Check acceptance criteria count for "Small"
    const acCount = (workItem.acceptanceCriteria as string[])?.length || 0;
    if (acCount > 8) {
      analysis.small.score = Math.min(analysis.small.score, 10);
      analysis.small.reasons.push('Too many acceptance criteria (>8) suggests story is too large');
      analysis.suggestions.push('Consider splitting: stories with 8+ AC are often too large for a sprint');
    }
    
    // Check for "and" in title suggesting multiple stories
    if (workItem.title.toLowerCase().includes(' and ')) {
      analysis.independent.score = Math.max(0, analysis.independent.score - 5);
      analysis.independent.reasons.push('Title contains "and" which may indicate multiple stories');
    }
    
    // Check for testable AC
    const acArray = workItem.acceptanceCriteria as string[] || [];
    const vaguePhrases = ['should work', 'user can', 'system should', 'properly', 'correctly'];
    const vagueACs = acArray.filter(ac => 
      vaguePhrases.some(phrase => ac.toLowerCase().includes(phrase))
    );
    if (vagueACs.length > 0) {
      analysis.testable.score = Math.max(0, analysis.testable.score - vagueACs.length * 2);
      analysis.suggestions.push(`Make acceptance criteria more specific: "${vagueACs[0]}" is hard to verify`);
    }
    
    // Recalculate overall
    analysis.overall = Math.round(
      (analysis.independent.score +
       analysis.negotiable.score +
       analysis.valuable.score +
       analysis.estimable.score +
       analysis.small.score +
       analysis.testable.score) / 1.2
    );
    
    return analysis;
  }
  
  private getDefaultAnalysis(): QualityAnalysis {
    return {
      overall: 50,
      independent: { score: 10, reasons: ['Unable to fully analyze'] },
      negotiable: { score: 10, reasons: ['Unable to fully analyze'] },
      valuable: { score: 10, reasons: ['Unable to fully analyze'] },
      estimable: { score: 10, reasons: ['Unable to fully analyze'] },
      small: { score: 10, reasons: ['Unable to fully analyze'] },
      testable: { score: 10, reasons: ['Unable to fully analyze'] },
      suggestions: ['Review story manually'],
    };
  }
  
  async getSpecQualitySummary(specId: string) {
    const workItems = await prisma.workItem.findMany({
      where: { specId, type: 'story' },
      include: { qualityScore: true },
    });
    
    const scored = workItems.filter(w => w.qualityScore);
    
    if (scored.length === 0) {
      return { averageScore: 0, distribution: { excellent: 0, good: 0, fair: 0, poor: 0 }, lowestScoring: [], suggestions: [] };
    }
    
    const scores = scored.map(w => w.qualityScore!.overallScore);
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    
    return {
      averageScore,
      distribution: {
        excellent: scores.filter(s => s >= 80).length,
        good: scores.filter(s => s >= 60 && s < 80).length,
        fair: scores.filter(s => s >= 40 && s < 60).length,
        poor: scores.filter(s => s < 40).length,
      },
      lowestScoring: scored
        .sort((a, b) => a.qualityScore!.overallScore - b.qualityScore!.overallScore)
        .slice(0, 5)
        .map(w => ({ id: w.id, title: w.title, score: w.qualityScore!.overallScore })),
      suggestions: this.aggregateSuggestions(scored),
    };
  }
  
  private aggregateSuggestions(workItems: Array<WorkItem & { qualityScore: QualityScore | null }>): string[] {
    const allSuggestions = workItems
      .filter(w => w.qualityScore)
      .flatMap(w => w.qualityScore!.suggestions as string[]);
    
    // Deduplicate and prioritize
    const counts = new Map<string, number>();
    allSuggestions.forEach(s => counts.set(s, (counts.get(s) || 0) + 1));
    
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([suggestion]) => suggestion);
  }
}
```

### Frontend Components

#### QualityScoreBadge

```tsx
// frontend/src/components/atoms/QualityScoreBadge.tsx
interface Props {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onClick?: () => void;
}

export function QualityScoreBadge({ score, size = 'md', showLabel = false, onClick }: Props) {
  const getColor = () => {
    if (score >= 80) return 'bg-toucan-success text-white';
    if (score >= 50) return 'bg-toucan-warning text-black';
    return 'bg-toucan-error text-white';
  };
  
  const sizes = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };
  
  return (
    <button
      onClick={onClick}
      className={`${sizes[size]} ${getColor()} rounded-full flex items-center justify-center font-bold cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-offset-toucan-dark`}
      title={`Quality Score: ${score}/100`}
    >
      {score}
    </button>
  );
}
```

#### QualityScorePanel

```tsx
// frontend/src/components/molecules/QualityScorePanel.tsx
interface Props {
  qualityScore: QualityScore;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const CRITERIA = [
  { key: 'independent', label: 'Independent', description: 'Can be developed alone' },
  { key: 'negotiable', label: 'Negotiable', description: 'Open to discussion' },
  { key: 'valuable', label: 'Valuable', description: 'Delivers user value' },
  { key: 'estimable', label: 'Estimable', description: 'Can be estimated' },
  { key: 'small', label: 'Small', description: 'Fits in a sprint' },
  { key: 'testable', label: 'Testable', description: 'Has clear pass/fail' },
];

export function QualityScorePanel({ qualityScore, onRefresh, isRefreshing }: Props) {
  const suggestions = qualityScore.suggestions as string[];
  const details = qualityScore.analysisDetails as Record<string, string[]>;
  
  return (
    <div className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <QualityScoreBadge score={qualityScore.overallScore} size="lg" />
          <div>
            <h3 className="font-semibold text-toucan-grey-100">INVEST Score</h3>
            <p className="text-xs text-toucan-grey-400">
              Scored {new Date(qualityScore.scoredAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? <Spinner size="sm" /> : 'Refresh'}
        </Button>
      </div>
      
      {/* Criteria breakdown */}
      <div className="space-y-3 mb-4">
        {CRITERIA.map(({ key, label, description }) => {
          const score = qualityScore[`${key}Score` as keyof QualityScore] as number;
          const reasons = details[key] || [];
          
          return (
            <div key={key}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-toucan-grey-200">{label}</span>
                <span className={`font-medium ${
                  score >= 16 ? 'text-toucan-success' :
                  score >= 10 ? 'text-toucan-warning' :
                  'text-toucan-error'
                }`}>
                  {score}/20
                </span>
              </div>
              <div className="h-2 bg-toucan-dark rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    score >= 16 ? 'bg-toucan-success' :
                    score >= 10 ? 'bg-toucan-warning' :
                    'bg-toucan-error'
                  }`}
                  style={{ width: `${(score / 20) * 100}%` }}
                />
              </div>
              {reasons.length > 0 && (
                <p className="text-xs text-toucan-grey-400 mt-1">{reasons[0]}</p>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="border-t border-toucan-dark-border pt-4">
          <h4 className="text-sm font-medium text-toucan-grey-200 mb-2">
            Suggestions
          </h4>
          <ul className="space-y-2">
            {suggestions.map((suggestion, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-toucan-grey-400">
                <span className="text-toucan-orange">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

---

## Database Migration

```sql
CREATE TABLE "QualityScore" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "workItemId" TEXT NOT NULL UNIQUE,
  "overallScore" INTEGER NOT NULL,
  "independentScore" INTEGER NOT NULL,
  "negotiableScore" INTEGER NOT NULL,
  "valuableScore" INTEGER NOT NULL,
  "estimableScore" INTEGER NOT NULL,
  "smallScore" INTEGER NOT NULL,
  "testableScore" INTEGER NOT NULL,
  "suggestions" JSONB NOT NULL DEFAULT '[]',
  "analysisDetails" JSONB NOT NULL DEFAULT '{}',
  "scoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "scoredBy" TEXT NOT NULL DEFAULT 'ai',
  FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE
);

CREATE INDEX "QualityScore_workItemId_idx" ON "QualityScore"("workItemId");
```

---

## Testing Checklist

- [ ] Score calculation is correct (sum of criteria / 1.2)
- [ ] AI analysis parses correctly
- [ ] Heuristics adjust scores appropriately
- [ ] Badge colors match score ranges
- [ ] Batch scoring works for all stories
- [ ] Summary aggregates correctly
- [ ] Suggestions are deduplicated

---

*F27 Specification v1.0*
