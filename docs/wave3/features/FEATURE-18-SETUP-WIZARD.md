# Feature 18: Setup Wizard & Health Score

## Overview

**What:** Guided onboarding for new projects. Ongoing health score showing context completeness. Contextual prompts suggesting what to add next.

**Why:** Users don't know what context to add. They leave things blank and get poor results. The wizard guides them through setup; the health score motivates ongoing improvement.

**Success Criteria:**
- New project → guided setup wizard
- Health score visible on dashboard (e.g., "45% configured")
- Clear recommendations for what to add next
- Contextual prompts during translation ("Add glossary to improve results")

## Setup Wizard Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     NEW PROJECT WIZARD                              │
│                                                                     │
│  Step 1: BASICS                                                     │
│  ├── Project name                                                   │
│  ├── Brief description                                              │
│  └── What type? (API integration / Product feature / etc.)          │
│                                                                     │
│  Step 2: PROJECT BRIEF (optional, can skip)                        │
│  ├── Use template or write custom                                   │
│  ├── System overview                                                │
│  └── Key integrations                                               │
│                                                                     │
│  Step 3: QUICK GLOSSARY (optional, can skip)                       │
│  ├── Add 5-10 key terms                                             │
│  └── Import from CSV                                                │
│                                                                     │
│  Step 4: TEAM PREFERENCES (optional, can skip)                     │
│  ├── AC format selection                                            │
│  └── Required sections                                              │
│                                                                     │
│  DONE: Project created with baseline context                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Health Score Calculation

The health score shows how complete the project's context is:

| Component | Weight | Criteria |
|-----------|--------|----------|
| Project Brief | 25% | Has brief > 100 words |
| Glossary | 20% | Has 5+ terms |
| Team Preferences | 15% | AC format selected, 1+ required section |
| Translated Specs | 20% | Has 1+ translated spec |
| Connected Sources | 10% | Jira or docs connected |
| Learning Applied | 10% | Has accepted 1+ learning suggestion |

**Score = Σ (component weight × component completion)**

## Database Schema

```prisma
/// ProjectHealth - Cached health score
model ProjectHealth {
  id          String   @id @default(uuid())
  projectId   String   @unique @map("project_id")
  
  // Overall
  score       Int      // 0-100
  level       HealthLevel
  
  // Components
  briefScore  Int      @map("brief_score")
  glossaryScore Int    @map("glossary_score")
  prefsScore  Int      @map("prefs_score")
  specsScore  Int      @map("specs_score")
  sourcesScore Int     @map("sources_score")
  learningScore Int    @map("learning_score")
  
  // Recommendations
  recommendations Json @default("[]")  // string[]
  
  // Timestamps
  calculatedAt DateTime @map("calculated_at")
  
  // Relations
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@map("project_health")
}

enum HealthLevel {
  minimal     // 0-25
  basic       // 26-50
  good        // 51-75
  excellent   // 76-100
}
```

## Health Score Service

**File:** `backend/src/services/HealthScoreService.ts`

```typescript
interface HealthComponent {
  name: string;
  weight: number;
  score: number;  // 0-100
  recommendation?: string;
}

interface HealthResult {
  score: number;
  level: 'minimal' | 'basic' | 'good' | 'excellent';
  components: HealthComponent[];
  recommendations: string[];
}

export class HealthScoreService {
  private prisma: PrismaClient;

  async calculateHealth(projectId: string): Promise<HealthResult> {
    const components: HealthComponent[] = [];
    const recommendations: string[] = [];

    // 1. Project Brief (25%)
    const briefScore = await this.scoreBrief(projectId);
    components.push({
      name: 'Project Brief',
      weight: 25,
      score: briefScore.score,
      recommendation: briefScore.recommendation,
    });
    if (briefScore.recommendation) recommendations.push(briefScore.recommendation);

    // 2. Glossary (20%)
    const glossaryScore = await this.scoreGlossary(projectId);
    components.push({
      name: 'Glossary',
      weight: 20,
      score: glossaryScore.score,
      recommendation: glossaryScore.recommendation,
    });
    if (glossaryScore.recommendation) recommendations.push(glossaryScore.recommendation);

    // 3. Team Preferences (15%)
    const prefsScore = await this.scorePreferences(projectId);
    components.push({
      name: 'Team Preferences',
      weight: 15,
      score: prefsScore.score,
      recommendation: prefsScore.recommendation,
    });
    if (prefsScore.recommendation) recommendations.push(prefsScore.recommendation);

    // 4. Translated Specs (20%)
    const specsScore = await this.scoreSpecs(projectId);
    components.push({
      name: 'Translated Specs',
      weight: 20,
      score: specsScore.score,
      recommendation: specsScore.recommendation,
    });
    if (specsScore.recommendation) recommendations.push(specsScore.recommendation);

    // 5. Connected Sources (10%)
    const sourcesScore = await this.scoreSources(projectId);
    components.push({
      name: 'Connected Sources',
      weight: 10,
      score: sourcesScore.score,
      recommendation: sourcesScore.recommendation,
    });
    if (sourcesScore.recommendation) recommendations.push(sourcesScore.recommendation);

    // 6. Learning Applied (10%)
    const learningScore = await this.scoreLearning(projectId);
    components.push({
      name: 'Learning Applied',
      weight: 10,
      score: learningScore.score,
      recommendation: learningScore.recommendation,
    });
    if (learningScore.recommendation) recommendations.push(learningScore.recommendation);

    // Calculate overall score
    const totalScore = Math.round(
      components.reduce((sum, c) => sum + (c.score * c.weight / 100), 0)
    );

    const level = 
      totalScore >= 76 ? 'excellent' :
      totalScore >= 51 ? 'good' :
      totalScore >= 26 ? 'basic' : 'minimal';

    // Cache result
    await this.cacheHealth(projectId, totalScore, level, components, recommendations);

    return {
      score: totalScore,
      level,
      components,
      recommendations: recommendations.slice(0, 3), // Top 3
    };
  }

  // ========================================
  // SCORING FUNCTIONS
  // ========================================

  private async scoreBrief(projectId: string): Promise<{ score: number; recommendation?: string }> {
    const knowledge = await this.prisma.projectKnowledge.findUnique({
      where: { projectId },
    });

    if (!knowledge?.brief) {
      return { score: 0, recommendation: 'Add a project brief to help AI understand your domain' };
    }

    const wordCount = knowledge.brief.split(/\s+/).length;
    
    if (wordCount < 50) {
      return { score: 30, recommendation: 'Expand your project brief (aim for 100+ words)' };
    }
    if (wordCount < 100) {
      return { score: 60, recommendation: 'Add more detail to your project brief' };
    }
    if (wordCount < 200) {
      return { score: 80 };
    }
    return { score: 100 };
  }

  private async scoreGlossary(projectId: string): Promise<{ score: number; recommendation?: string }> {
    const termCount = await this.prisma.glossaryTerm.count({
      where: { projectId },
    });

    if (termCount === 0) {
      return { score: 0, recommendation: 'Add glossary terms to ensure consistent terminology' };
    }
    if (termCount < 5) {
      return { score: 40, recommendation: `Add more glossary terms (${termCount}/5 minimum)` };
    }
    if (termCount < 10) {
      return { score: 70 };
    }
    if (termCount < 20) {
      return { score: 90 };
    }
    return { score: 100 };
  }

  private async scorePreferences(projectId: string): Promise<{ score: number; recommendation?: string }> {
    const prefs = await this.prisma.teamPreferences.findUnique({
      where: { projectId },
    });

    if (!prefs) {
      return { score: 0, recommendation: 'Configure team preferences for consistent output' };
    }

    let score = 50; // Base for having prefs

    if (prefs.acFormat && prefs.acFormat !== 'bullets') {
      score += 20; // Explicit format choice
    }
    if (prefs.requiredSections?.length > 0) {
      score += 15;
    }
    if (prefs.customPrefs && (prefs.customPrefs as string[]).length > 0) {
      score += 15;
    }

    return { score: Math.min(score, 100) };
  }

  private async scoreSpecs(projectId: string): Promise<{ score: number; recommendation?: string }> {
    const specCount = await this.prisma.spec.count({
      where: { projectId, status: 'translated' },
    });

    if (specCount === 0) {
      return { score: 0, recommendation: 'Translate your first spec to build context' };
    }
    if (specCount < 3) {
      return { score: 50 };
    }
    if (specCount < 5) {
      return { score: 75 };
    }
    return { score: 100 };
  }

  private async scoreSources(projectId: string): Promise<{ score: number; recommendation?: string }> {
    const sources = await this.prisma.contextSource.count({
      where: { projectId, isEnabled: true, sourceType: { not: 'specs' } },
    });

    const docs = await this.prisma.referenceDocument.count({
      where: { projectId },
    });

    if (sources === 0 && docs === 0) {
      return { score: 0, recommendation: 'Connect Jira or upload reference documents' };
    }
    if (sources + docs < 2) {
      return { score: 50 };
    }
    return { score: 100 };
  }

  private async scoreLearning(projectId: string): Promise<{ score: number; recommendation?: string }> {
    const appliedPatterns = await this.prisma.learnedPattern.count({
      where: { projectId, status: 'applied' },
    });

    if (appliedPatterns === 0) {
      // Only recommend if there are pending patterns
      const pendingPatterns = await this.prisma.learnedPattern.count({
        where: { projectId, status: 'pending' },
      });
      if (pendingPatterns > 0) {
        return { score: 0, recommendation: 'Review learning suggestions to improve translations' };
      }
      return { score: 50 }; // No patterns yet, neutral
    }
    return { score: 100 };
  }

  private async cacheHealth(
    projectId: string,
    score: number,
    level: string,
    components: HealthComponent[],
    recommendations: string[]
  ): Promise<void> {
    await this.prisma.projectHealth.upsert({
      where: { projectId },
      create: {
        projectId,
        score,
        level: level as any,
        briefScore: components.find(c => c.name === 'Project Brief')?.score || 0,
        glossaryScore: components.find(c => c.name === 'Glossary')?.score || 0,
        prefsScore: components.find(c => c.name === 'Team Preferences')?.score || 0,
        specsScore: components.find(c => c.name === 'Translated Specs')?.score || 0,
        sourcesScore: components.find(c => c.name === 'Connected Sources')?.score || 0,
        learningScore: components.find(c => c.name === 'Learning Applied')?.score || 0,
        recommendations,
        calculatedAt: new Date(),
      },
      update: {
        score,
        level: level as any,
        briefScore: components.find(c => c.name === 'Project Brief')?.score || 0,
        glossaryScore: components.find(c => c.name === 'Glossary')?.score || 0,
        prefsScore: components.find(c => c.name === 'Team Preferences')?.score || 0,
        specsScore: components.find(c => c.name === 'Translated Specs')?.score || 0,
        sourcesScore: components.find(c => c.name === 'Connected Sources')?.score || 0,
        learningScore: components.find(c => c.name === 'Learning Applied')?.score || 0,
        recommendations,
        calculatedAt: new Date(),
      },
    });
  }
}
```

## Setup Wizard UI

**File:** `frontend/src/components/organisms/SetupWizard.tsx`

```typescript
import React, { useState } from 'react';

type WizardStep = 'basics' | 'brief' | 'glossary' | 'preferences' | 'done';

interface SetupWizardProps {
  onComplete: (projectId: string) => void;
  onSkip: () => void;
}

export function SetupWizard({ onComplete, onSkip }: SetupWizardProps) {
  const [step, setStep] = useState<WizardStep>('basics');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [data, setData] = useState({
    name: '',
    description: '',
    projectType: '',
    brief: '',
    glossaryTerms: [] as { term: string; definition: string }[],
    acFormat: 'bullets',
    requiredSections: [] as string[],
  });

  async function handleBasicsComplete() {
    // Create project
    const response = await api.post('/projects', {
      name: data.name,
      description: data.description,
    });
    setProjectId(response.data.data.id);
    setStep('brief');
  }

  async function handleBriefComplete() {
    if (data.brief && projectId) {
      await api.put(`/projects/${projectId}/knowledge`, { brief: data.brief });
    }
    setStep('glossary');
  }

  async function handleGlossaryComplete() {
    if (data.glossaryTerms.length > 0 && projectId) {
      for (const term of data.glossaryTerms) {
        await api.post(`/projects/${projectId}/glossary`, term);
      }
    }
    setStep('preferences');
  }

  async function handlePreferencesComplete() {
    if (projectId) {
      await api.put(`/projects/${projectId}/preferences`, {
        acFormat: data.acFormat,
        requiredSections: data.requiredSections,
      });
    }
    setStep('done');
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-toucan-dark-card border border-toucan-dark-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 bg-toucan-dark-lighter">
          <div 
            className="h-full bg-toucan-orange transition-all"
            style={{ width: `${getProgress(step)}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'basics' && (
            <BasicsStep
              data={data}
              onChange={(d) => setData({ ...data, ...d })}
              onNext={handleBasicsComplete}
              onSkip={onSkip}
            />
          )}
          
          {step === 'brief' && (
            <BriefStep
              data={data}
              onChange={(d) => setData({ ...data, ...d })}
              onNext={handleBriefComplete}
              onSkip={() => setStep('glossary')}
            />
          )}
          
          {step === 'glossary' && (
            <GlossaryStep
              data={data}
              onChange={(d) => setData({ ...data, ...d })}
              onNext={handleGlossaryComplete}
              onSkip={() => setStep('preferences')}
            />
          )}
          
          {step === 'preferences' && (
            <PreferencesStep
              data={data}
              onChange={(d) => setData({ ...data, ...d })}
              onNext={handlePreferencesComplete}
              onSkip={() => setStep('done')}
            />
          )}
          
          {step === 'done' && (
            <DoneStep
              projectId={projectId!}
              onComplete={() => onComplete(projectId!)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function getProgress(step: WizardStep): number {
  const steps = { basics: 20, brief: 40, glossary: 60, preferences: 80, done: 100 };
  return steps[step];
}

// Individual step components...
function BasicsStep({ data, onChange, onNext, onSkip }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-toucan-grey-100">Create Your Project</h2>
        <p className="text-sm text-toucan-grey-400 mt-1">
          Let's set up your project with some basic context
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-toucan-grey-300 mb-1">Project Name *</label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-4 py-2"
            placeholder="e.g., Moorfields OpenEyes Integration"
          />
        </div>

        <div>
          <label className="block text-sm text-toucan-grey-300 mb-1">Brief Description</label>
          <textarea
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-4 py-2 h-20"
            placeholder="What is this project about?"
          />
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button onClick={onSkip} className="text-sm text-toucan-grey-500 hover:text-toucan-grey-300">
          Skip wizard
        </button>
        <button
          onClick={onNext}
          disabled={!data.name}
          className="btn btn-primary"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
```

## Health Score Widget

**File:** `frontend/src/components/molecules/HealthScoreWidget.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

interface HealthData {
  score: number;
  level: string;
  recommendations: string[];
  components: { name: string; score: number }[];
}

export function HealthScoreWidget({ projectId }: { projectId: string }) {
  const [health, setHealth] = useState<HealthData | null>(null);

  useEffect(() => {
    api.get(`/projects/${projectId}/health`).then(r => setHealth(r.data.data));
  }, [projectId]);

  if (!health) return null;

  const levelColors = {
    minimal: 'text-red-400',
    basic: 'text-yellow-400',
    good: 'text-green-400',
    excellent: 'text-toucan-orange',
  };

  return (
    <div className="bg-toucan-dark-card border border-toucan-dark-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-toucan-grey-200">Context Health</h3>
        <span className={`text-2xl font-bold ${levelColors[health.level]}`}>
          {health.score}%
        </span>
      </div>

      {/* Progress Ring */}
      <div className="relative w-24 h-24 mx-auto mb-4">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-toucan-dark-lighter"
          />
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={251.2}
            strokeDashoffset={251.2 * (1 - health.score / 100)}
            className={levelColors[health.level]}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-toucan-grey-400 capitalize">{health.level}</span>
        </div>
      </div>

      {/* Component Breakdown */}
      <div className="space-y-2 mb-4">
        {health.components.map((comp) => (
          <div key={comp.name} className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-toucan-dark rounded-full overflow-hidden">
              <div
                className={`h-full ${comp.score >= 70 ? 'bg-green-500' : comp.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${comp.score}%` }}
              />
            </div>
            <span className="text-xs text-toucan-grey-500 w-20 truncate">{comp.name}</span>
          </div>
        ))}
      </div>

      {/* Top Recommendation */}
      {health.recommendations.length > 0 && (
        <div className="border-t border-toucan-dark-border pt-4">
          <p className="text-xs text-toucan-grey-400 mb-2">Next step:</p>
          <p className="text-sm text-toucan-grey-300">{health.recommendations[0]}</p>
          <Link
            to={`/projects/${projectId}/settings`}
            className="text-xs text-toucan-orange hover:underline mt-2 inline-block"
          >
            Go to settings →
          </Link>
        </div>
      )}
    </div>
  );
}
```

## API Endpoints

### GET /api/projects/:id/health
Get health score.

```json
{
  "data": {
    "score": 45,
    "level": "basic",
    "components": [
      { "name": "Project Brief", "weight": 25, "score": 80 },
      { "name": "Glossary", "weight": 20, "score": 40 },
      { "name": "Team Preferences", "weight": 15, "score": 50 },
      { "name": "Translated Specs", "weight": 20, "score": 0 },
      { "name": "Connected Sources", "weight": 10, "score": 0 },
      { "name": "Learning Applied", "weight": 10, "score": 50 }
    ],
    "recommendations": [
      "Translate your first spec to build context",
      "Add more glossary terms (2/5 minimum)",
      "Connect Jira or upload reference documents"
    ]
  }
}
```

### POST /api/projects/:id/health/recalculate
Force recalculation.

## Testing Checklist

- [ ] Create project → wizard appears
- [ ] Complete wizard → all data saved
- [ ] Skip wizard steps → project still created
- [ ] Dashboard shows health widget
- [ ] Health score updates when adding brief
- [ ] Health score updates when adding glossary
- [ ] Recommendations are actionable
- [ ] Progress ring animates correctly

## Dependencies

- Feature 14 (Knowledge Base)
- Feature 17 (Learning Loop) - for learning score

## Effort Estimate

**4 hours**
- HealthScoreService: 1.5 hours
- SetupWizard UI: 1.5 hours
- HealthScoreWidget: 30 min
- API endpoints: 15 min
- Testing: 15 min
