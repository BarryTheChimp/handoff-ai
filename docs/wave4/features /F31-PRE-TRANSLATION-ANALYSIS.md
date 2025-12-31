# F31: Pre-Translation Analysis Dashboard

> **Priority:** MEDIUM | **Effort:** 8 hours | **Phase:** 4

---

## Overview

**What:** Before translating a spec, provide an analysis dashboard showing complexity estimate, detected entities, predicted story count, and potential issues.

**Why:** Users upload specs and click translate without knowing what to expect. This feature:
- Sets expectations (this spec will generate ~25 stories)
- Identifies potential problems early (missing sections, ambiguous requirements)
- Suggests glossary terms before translation
- Improves translation quality by frontloading context

**Success Criteria:**
- Complexity score with explanation
- Predicted story count range
- Detected entities/systems
- Suggested glossary additions
- Coverage warnings
- Confidence score

---

## User Stories

### Must Have

**US-31.1:** As a PM, I want to see how complex a spec is before translating so that I can plan accordingly.
- **AC:** Complexity score (1-10) displayed
- **AC:** Explanation of what makes it complex
- **AC:** Comparison to average specs

**US-31.2:** As a PM, I want to know how many stories will be generated so that I can estimate work.
- **AC:** Predicted range (e.g., "15-25 stories")
- **AC:** Breakdown by type (epics, features, stories)

**US-31.3:** As a PM, I want entities detected and added to glossary so that translation uses consistent terms.
- **AC:** List of detected entities (systems, data types, roles)
- **AC:** One-click add to glossary
- **AC:** Shows which are already in glossary

### Should Have

**US-31.4:** As a PM, I want warnings about potential issues so that I can fix them before translating.
- **AC:** Missing sections flagged
- **AC:** Ambiguous requirements highlighted
- **AC:** Incomplete areas identified

---

## Technical Design

### Analysis Model

```prisma
model SpecAnalysis {
  id                String   @id @default(uuid())
  specId            String   @unique
  spec              Spec     @relation(fields: [specId], references: [id], onDelete: Cascade)
  
  // Predictions
  estimatedEpics    Int
  estimatedFeatures Int
  estimatedStories  Int
  storyRangeLow     Int
  storyRangeHigh    Int
  
  // Complexity
  complexityScore   Int      // 1-10
  complexityReasons Json     // Array of reasons
  
  // Entities
  detectedEntities  Json     // [{name, type, count, inGlossary}]
  suggestedGlossary Json     // [{term, definition, context}]
  
  // Warnings
  coverageWarnings  Json     // [{section, issue, severity}]
  qualityWarnings   Json     // [{type, message, location}]
  
  // Confidence
  confidenceScore   Int      // 0-100
  confidenceReasons Json
  
  analyzedAt        DateTime @default(now())
  
  @@index([specId])
}
```

### API Endpoints

```typescript
// Analyze a spec
POST /api/specs/:id/analyze
Response: { data: SpecAnalysis }

// Get existing analysis
GET /api/specs/:id/analysis
Response: { data: SpecAnalysis | null }

// Add suggested term to glossary
POST /api/specs/:id/analysis/add-glossary
Body: { term: string; definition: string }
Response: { data: GlossaryTerm }
```

### Spec Analysis Service

```typescript
// backend/src/services/SpecAnalysisService.ts

export class SpecAnalysisService {
  
  constructor(private claudeService: ClaudeService) {}
  
  async analyzeSpec(specId: string): Promise<SpecAnalysis> {
    const spec = await prisma.spec.findUnique({
      where: { id: specId },
      include: {
        sections: true,
        project: {
          include: {
            glossaryTerms: true
          }
        }
      }
    });
    
    if (!spec) throw new NotFoundError('Spec not found');
    
    const text = spec.extractedText || '';
    
    // Run parallel analyses
    const [
      complexityAnalysis,
      entityAnalysis,
      storyPrediction,
      warningAnalysis
    ] = await Promise.all([
      this.analyzeComplexity(text),
      this.detectEntities(text, spec.project.glossaryTerms),
      this.predictStories(text, spec.sections),
      this.analyzeWarnings(text, spec.sections),
    ]);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(
      text, 
      complexityAnalysis, 
      warningAnalysis
    );
    
    // Save analysis
    const analysis = await prisma.specAnalysis.upsert({
      where: { specId },
      create: {
        specId,
        estimatedEpics: storyPrediction.epics,
        estimatedFeatures: storyPrediction.features,
        estimatedStories: storyPrediction.stories,
        storyRangeLow: storyPrediction.rangeLow,
        storyRangeHigh: storyPrediction.rangeHigh,
        complexityScore: complexityAnalysis.score,
        complexityReasons: complexityAnalysis.reasons,
        detectedEntities: entityAnalysis.entities,
        suggestedGlossary: entityAnalysis.suggestions,
        coverageWarnings: warningAnalysis.coverage,
        qualityWarnings: warningAnalysis.quality,
        confidenceScore: confidence.score,
        confidenceReasons: confidence.reasons,
      },
      update: {
        estimatedEpics: storyPrediction.epics,
        estimatedFeatures: storyPrediction.features,
        estimatedStories: storyPrediction.stories,
        storyRangeLow: storyPrediction.rangeLow,
        storyRangeHigh: storyPrediction.rangeHigh,
        complexityScore: complexityAnalysis.score,
        complexityReasons: complexityAnalysis.reasons,
        detectedEntities: entityAnalysis.entities,
        suggestedGlossary: entityAnalysis.suggestions,
        coverageWarnings: warningAnalysis.coverage,
        qualityWarnings: warningAnalysis.quality,
        confidenceScore: confidence.score,
        confidenceReasons: confidence.reasons,
        analyzedAt: new Date(),
      },
    });
    
    return analysis;
  }
  
  private async analyzeComplexity(text: string): Promise<{score: number; reasons: string[]}> {
    const wordCount = text.split(/\s+/).length;
    const sectionCount = (text.match(/^#+\s/gm) || []).length;
    const tableCount = (text.match(/\|.*\|/g) || []).length / 2;
    const integrationMentions = (text.match(/\b(API|integration|interface|sync|connect)\b/gi) || []).length;
    
    let score = 5; // Base
    const reasons: string[] = [];
    
    // Word count factor
    if (wordCount > 5000) {
      score += 2;
      reasons.push(`Long document (${wordCount} words)`);
    } else if (wordCount > 2000) {
      score += 1;
      reasons.push(`Medium-length document (${wordCount} words)`);
    }
    
    // Section complexity
    if (sectionCount > 20) {
      score += 1;
      reasons.push(`Many sections (${sectionCount})`);
    }
    
    // Tables indicate data complexity
    if (tableCount > 5) {
      score += 1;
      reasons.push(`Multiple data tables (${tableCount})`);
    }
    
    // Integrations add complexity
    if (integrationMentions > 10) {
      score += 2;
      reasons.push('Heavy integration focus');
    }
    
    return { score: Math.min(10, score), reasons };
  }
  
  private async detectEntities(text: string, existingTerms: GlossaryTerm[]): Promise<any> {
    const existingNames = new Set(existingTerms.map(t => t.term.toLowerCase()));
    
    // Use AI to extract entities
    const prompt = `Extract named entities from this specification text. Identify:
1. Systems/Applications (e.g., "OpenEyes", "Meditech")
2. Data types (e.g., "Patient", "Appointment")
3. Standards/Protocols (e.g., "HL7", "FHIR")
4. Roles (e.g., "Clinician", "Admin")

Text:
${text.substring(0, 4000)}

Respond in JSON:
{
  "entities": [
    {"name": "string", "type": "system|data|standard|role", "count": number}
  ]
}`;

    const response = await this.claudeService.complete({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
    });
    
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch?.[0] || '{"entities":[]}');
      
      const entities = parsed.entities.map((e: any) => ({
        ...e,
        inGlossary: existingNames.has(e.name.toLowerCase()),
      }));
      
      const suggestions = entities
        .filter((e: any) => !e.inGlossary)
        .map((e: any) => ({
          term: e.name,
          definition: `[${e.type}] - Add definition`,
          context: `Mentioned ${e.count} times in spec`,
        }));
      
      return { entities, suggestions };
    } catch {
      return { entities: [], suggestions: [] };
    }
  }
  
  private async predictStories(text: string, sections: SpecSection[]): Promise<any> {
    const wordCount = text.split(/\s+/).length;
    const sectionCount = sections.length;
    
    // Heuristic: roughly 1 story per 150 words of requirements
    const baseStories = Math.round(wordCount / 150);
    
    // Adjust based on section structure
    const multiplier = sectionCount > 0 ? Math.min(1.5, sectionCount / 5) : 1;
    
    const stories = Math.round(baseStories * multiplier);
    const features = Math.round(stories / 4);
    const epics = Math.max(1, Math.round(features / 3));
    
    return {
      epics,
      features,
      stories,
      rangeLow: Math.round(stories * 0.7),
      rangeHigh: Math.round(stories * 1.3),
    };
  }
  
  private async analyzeWarnings(text: string, sections: SpecSection[]): Promise<any> {
    const coverage: any[] = [];
    const quality: any[] = [];
    
    // Check for common missing sections
    const expectedSections = ['overview', 'requirements', 'scope', 'acceptance'];
    const sectionHeadings = sections.map(s => s.heading.toLowerCase());
    
    for (const expected of expectedSections) {
      if (!sectionHeadings.some(h => h.includes(expected))) {
        coverage.push({
          section: expected,
          issue: `No "${expected}" section found`,
          severity: 'warning',
        });
      }
    }
    
    // Check for ambiguous language
    const ambiguousPhrases = ['as appropriate', 'when necessary', 'if needed', 'etc.', 'various'];
    for (const phrase of ambiguousPhrases) {
      if (text.toLowerCase().includes(phrase)) {
        quality.push({
          type: 'ambiguous',
          message: `Contains ambiguous phrase: "${phrase}"`,
          location: null,
        });
      }
    }
    
    // Check for missing acceptance criteria indicators
    if (!text.toLowerCase().includes('acceptance') && !text.toLowerCase().includes('criteria')) {
      quality.push({
        type: 'missing',
        message: 'No explicit acceptance criteria section found',
        location: null,
      });
    }
    
    return { coverage, quality };
  }
  
  private calculateConfidence(text: string, complexity: any, warnings: any): any {
    let score = 80; // Base confidence
    const reasons: string[] = [];
    
    // Reduce for high complexity
    if (complexity.score > 7) {
      score -= 15;
      reasons.push('High complexity may reduce accuracy');
    }
    
    // Reduce for many warnings
    const warningCount = warnings.coverage.length + warnings.quality.length;
    if (warningCount > 5) {
      score -= 10;
      reasons.push(`${warningCount} quality warnings detected`);
    }
    
    // Increase for good structure
    const hasSections = (text.match(/^#+\s/gm) || []).length > 3;
    if (hasSections) {
      score += 5;
      reasons.push('Well-structured with clear sections');
    }
    
    // Increase for clear requirements language
    const requirementPhrases = (text.match(/\b(shall|must|should|will)\b/gi) || []).length;
    if (requirementPhrases > 10) {
      score += 5;
      reasons.push('Clear requirements language detected');
    }
    
    return { score: Math.max(0, Math.min(100, score)), reasons };
  }
}
```

### Frontend - Analysis Dashboard

```tsx
// frontend/src/components/organisms/SpecAnalysisDashboard.tsx
import { useState, useEffect } from 'react';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { ProgressBar } from '../atoms/ProgressBar';
import { Spinner } from '../atoms/Spinner';
import { useToast } from '../../stores/toastStore';

interface Props {
  specId: string;
  onAnalysisComplete?: () => void;
  onProceedToTranslate?: () => void;
}

export function SpecAnalysisDashboard({ specId, onAnalysisComplete, onProceedToTranslate }: Props) {
  const [analysis, setAnalysis] = useState<SpecAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  
  const runAnalysis = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/specs/${specId}/analyze`, { method: 'POST' });
      const data = await res.json();
      setAnalysis(data.data);
      onAnalysisComplete?.();
    } catch (err) {
      toast.error('Analysis failed');
    } finally {
      setLoading(false);
    }
  };
  
  const addToGlossary = async (term: string, definition: string) => {
    await fetch(`/api/specs/${specId}/analysis/add-glossary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ term, definition }),
    });
    toast.success(`Added "${term}" to glossary`);
    // Refresh analysis
    runAnalysis();
  };
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Spinner size="lg" />
        <p className="mt-4 text-toucan-grey-400">Analyzing specification...</p>
      </div>
    );
  }
  
  if (!analysis) {
    return (
      <div className="text-center py-12">
        <p className="text-toucan-grey-300 mb-4">
          Run analysis to see complexity, predictions, and potential issues before translating.
        </p>
        <Button variant="primary" onClick={runAnalysis}>
          Analyze Specification
        </Button>
      </div>
    );
  }
  
  const complexityReasons = analysis.complexityReasons as string[];
  const entities = analysis.detectedEntities as any[];
  const suggestions = analysis.suggestedGlossary as any[];
  const coverageWarnings = analysis.coverageWarnings as any[];
  const qualityWarnings = analysis.qualityWarnings as any[];
  
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {/* Complexity */}
        <div className="bg-toucan-dark-lighter rounded-lg p-4">
          <p className="text-xs text-toucan-grey-400 uppercase mb-1">Complexity</p>
          <div className="flex items-center gap-2">
            <span className={`text-3xl font-bold ${
              analysis.complexityScore <= 3 ? 'text-toucan-success' :
              analysis.complexityScore <= 6 ? 'text-toucan-warning' :
              'text-toucan-error'
            }`}>
              {analysis.complexityScore}
            </span>
            <span className="text-toucan-grey-400">/ 10</span>
          </div>
        </div>
        
        {/* Predicted Stories */}
        <div className="bg-toucan-dark-lighter rounded-lg p-4">
          <p className="text-xs text-toucan-grey-400 uppercase mb-1">Predicted Stories</p>
          <span className="text-3xl font-bold text-toucan-grey-100">
            {analysis.storyRangeLow}-{analysis.storyRangeHigh}
          </span>
        </div>
        
        {/* Confidence */}
        <div className="bg-toucan-dark-lighter rounded-lg p-4">
          <p className="text-xs text-toucan-grey-400 uppercase mb-1">Confidence</p>
          <div className="flex items-center gap-2">
            <span className={`text-3xl font-bold ${
              analysis.confidenceScore >= 70 ? 'text-toucan-success' :
              analysis.confidenceScore >= 50 ? 'text-toucan-warning' :
              'text-toucan-error'
            }`}>
              {analysis.confidenceScore}%
            </span>
          </div>
        </div>
        
        {/* Warnings */}
        <div className="bg-toucan-dark-lighter rounded-lg p-4">
          <p className="text-xs text-toucan-grey-400 uppercase mb-1">Warnings</p>
          <span className={`text-3xl font-bold ${
            coverageWarnings.length + qualityWarnings.length === 0 ? 'text-toucan-success' :
            coverageWarnings.length + qualityWarnings.length <= 3 ? 'text-toucan-warning' :
            'text-toucan-error'
          }`}>
            {coverageWarnings.length + qualityWarnings.length}
          </span>
        </div>
      </div>
      
      {/* Breakdown */}
      <div className="bg-toucan-dark-lighter rounded-lg p-4">
        <h3 className="text-sm font-medium text-toucan-grey-200 mb-3">Predicted Breakdown</h3>
        <div className="flex items-center gap-6">
          <div>
            <span className="text-xl font-bold text-toucan-grey-100">{analysis.estimatedEpics}</span>
            <span className="text-sm text-toucan-grey-400 ml-1">Epics</span>
          </div>
          <div className="text-toucan-grey-600">→</div>
          <div>
            <span className="text-xl font-bold text-toucan-grey-100">{analysis.estimatedFeatures}</span>
            <span className="text-sm text-toucan-grey-400 ml-1">Features</span>
          </div>
          <div className="text-toucan-grey-600">→</div>
          <div>
            <span className="text-xl font-bold text-toucan-grey-100">{analysis.estimatedStories}</span>
            <span className="text-sm text-toucan-grey-400 ml-1">Stories</span>
          </div>
        </div>
      </div>
      
      {/* Complexity reasons */}
      {complexityReasons.length > 0 && (
        <div className="bg-toucan-dark-lighter rounded-lg p-4">
          <h3 className="text-sm font-medium text-toucan-grey-200 mb-2">Complexity Factors</h3>
          <ul className="space-y-1">
            {complexityReasons.map((reason, i) => (
              <li key={i} className="text-sm text-toucan-grey-400 flex items-center gap-2">
                <span className="text-toucan-orange">•</span> {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Detected Entities */}
      {entities.length > 0 && (
        <div className="bg-toucan-dark-lighter rounded-lg p-4">
          <h3 className="text-sm font-medium text-toucan-grey-200 mb-3">Detected Entities</h3>
          <div className="flex flex-wrap gap-2">
            {entities.map((entity, i) => (
              <span 
                key={i}
                className={`px-2 py-1 rounded text-xs ${
                  entity.inGlossary 
                    ? 'bg-toucan-success/20 text-toucan-success' 
                    : 'bg-toucan-dark text-toucan-grey-300'
                }`}
              >
                {entity.name}
                {entity.inGlossary && ' ✓'}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Suggested Glossary Terms */}
      {suggestions.length > 0 && (
        <div className="bg-toucan-dark-lighter rounded-lg p-4">
          <h3 className="text-sm font-medium text-toucan-grey-200 mb-3">Suggested Glossary Terms</h3>
          <div className="space-y-2">
            {suggestions.slice(0, 5).map((suggestion, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-toucan-dark rounded">
                <div>
                  <span className="text-sm font-medium text-toucan-grey-100">{suggestion.term}</span>
                  <span className="text-xs text-toucan-grey-400 ml-2">{suggestion.context}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => addToGlossary(suggestion.term, suggestion.definition)}
                >
                  Add to Glossary
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Warnings */}
      {(coverageWarnings.length > 0 || qualityWarnings.length > 0) && (
        <div className="bg-toucan-warning/10 border border-toucan-warning/30 rounded-lg p-4">
          <h3 className="text-sm font-medium text-toucan-warning mb-3">Warnings</h3>
          <ul className="space-y-2">
            {[...coverageWarnings, ...qualityWarnings].map((warning, i) => (
              <li key={i} className="text-sm text-toucan-grey-300 flex items-start gap-2">
                <span className="text-toucan-warning">⚠</span>
                {warning.issue || warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-toucan-dark-border">
        <Button variant="ghost" onClick={runAnalysis}>
          Re-analyze
        </Button>
        <Button variant="primary" onClick={onProceedToTranslate}>
          Proceed to Translation
        </Button>
      </div>
    </div>
  );
}
```

---

## Testing Checklist

- [ ] Complexity score calculated correctly
- [ ] Story prediction in reasonable range
- [ ] Entities detected from text
- [ ] Existing glossary terms marked
- [ ] Add to glossary works
- [ ] Warnings identify real issues
- [ ] Confidence reflects quality
- [ ] Analysis persists in database

---

*F31 Specification v1.0*
