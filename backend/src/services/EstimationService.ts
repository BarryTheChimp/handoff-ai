import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../lib/prisma.js';
import type { SizeEstimate } from '@prisma/client';

const anthropic = new Anthropic();

export type Confidence = 'high' | 'medium' | 'low';

export interface EstimationFactors {
  acCount: number;
  complexitySignals: string[];
  dependencies: number;
  unknowns: number;
}

export interface SingleEstimateResult {
  id: string;
  previousSize: SizeEstimate | null;
  suggestedSize: SizeEstimate;
  confidence: Confidence;
  rationale: string;
  factors: EstimationFactors;
  applied: boolean;
}

export interface BatchEstimateResult {
  estimated: number;
  skipped: number;
  summary: Record<SizeEstimate, number>;
  byConfidence: Record<Confidence, number>;
  lowConfidenceItems: Array<{
    id: string;
    title: string;
    reason: string;
  }>;
  undoToken: string;
  undoExpiresAt: string;
}

export interface EstimationService {
  estimateSingle(workItemId: string, apply?: boolean): Promise<SingleEstimateResult>;
  estimateBatch(
    specId: string,
    options?: { overwriteExisting?: boolean; minConfidence?: Confidence }
  ): Promise<BatchEstimateResult>;
  undoBatch(undoToken: string): Promise<{ reverted: number }>;
}

const ESTIMATION_PROMPT = `You are estimating the complexity of a software development work item.

## Work Item
- **Title**: {{title}}
- **Type**: {{type}}
- **Description**: {{description}}
- **Acceptance Criteria**: {{acceptanceCriteria}}
- **Technical Notes**: {{technicalNotes}}
- **Dependencies**: {{dependencyCount}} items

## Sizing Guidelines
- **S (Small)**: Simple change, 1-2 acceptance criteria, no unknowns, few hours of work
- **M (Medium)**: Standard feature, 3-5 acceptance criteria, some complexity, 1-2 days
- **L (Large)**: Complex feature, 5+ acceptance criteria, integrations or unknowns, 3-5 days
- **XL (Extra Large)**: Major feature, significant unknowns, multiple integrations, 1+ week

## Complexity Signals to Look For
- External API integrations (+1 size)
- Database schema changes (+1 size)
- Security/authentication requirements (+1 size)
- Performance requirements (+1 size)
- Multiple user roles (+1 size)
- Unknowns or TBDs in description (+1 size, lower confidence)
- Vague acceptance criteria (lower confidence)

## Output Format
Return JSON only:
{
  "size": "S|M|L|XL",
  "confidence": "high|medium|low",
  "rationale": "2-3 sentence explanation",
  "factors": {
    "acCount": number,
    "complexitySignals": ["signal1", "signal2"],
    "dependencies": number,
    "unknowns": number
  }
}

## Confidence Guidelines
- **high**: Clear requirements, straightforward implementation, standard patterns
- **medium**: Some ambiguity, moderate complexity, some assumptions made
- **low**: Significant unknowns, vague requirements, needs clarification`;

function fillPrompt(template: string, values: Record<string, string | number>): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
  }
  return result;
}

function parseEstimationResponse(content: string): {
  size: SizeEstimate;
  confidence: Confidence;
  rationale: string;
  factors: EstimationFactors;
} {
  // Try to extract JSON from the response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Validate and normalize
  const validSizes: SizeEstimate[] = ['S', 'M', 'L', 'XL'];
  const validConfidences: Confidence[] = ['high', 'medium', 'low'];

  if (!validSizes.includes(parsed.size)) {
    throw new Error(`Invalid size: ${parsed.size}`);
  }

  if (!validConfidences.includes(parsed.confidence)) {
    throw new Error(`Invalid confidence: ${parsed.confidence}`);
  }

  return {
    size: parsed.size as SizeEstimate,
    confidence: parsed.confidence as Confidence,
    rationale: parsed.rationale || 'No rationale provided',
    factors: {
      acCount: parsed.factors?.acCount || 0,
      complexitySignals: parsed.factors?.complexitySignals || [],
      dependencies: parsed.factors?.dependencies || 0,
      unknowns: parsed.factors?.unknowns || 0,
    },
  };
}

export function createEstimationService(): EstimationService {
  return {
    async estimateSingle(workItemId: string, apply = true): Promise<SingleEstimateResult> {
      const item = await prisma.workItem.findUnique({
        where: { id: workItemId },
        include: {
          _count: {
            select: { sources: true },
          },
        },
      });

      if (!item) {
        throw new Error('Work item not found');
      }

      // Count dependencies
      const dependencyCount = item.dependsOnIds.length;

      // Count acceptance criteria lines
      const acCount = (item.acceptanceCriteria || '')
        .split('\n')
        .filter((line) => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
        .length;

      // Fill prompt
      const prompt = fillPrompt(ESTIMATION_PROMPT, {
        title: item.title,
        type: item.type,
        description: item.description || 'No description provided',
        acceptanceCriteria: item.acceptanceCriteria || 'No acceptance criteria',
        technicalNotes: item.technicalNotes || 'No technical notes',
        dependencyCount,
      });

      // Call Claude Haiku
      const response = await anthropic.messages.create({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 500,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (!content || content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const estimation = parseEstimationResponse((content as { type: 'text'; text: string }).text);

      // Store previous value for history
      const previousSize = item.sizeEstimate;

      // Apply estimate if requested
      if (apply) {
        await prisma.$transaction([
          prisma.workItem.update({
            where: { id: workItemId },
            data: { sizeEstimate: estimation.size },
          }),
          prisma.workItemHistory.create({
            data: {
              workItemId,
              fieldChanged: 'sizeEstimate',
              oldValue: previousSize || null,
              newValue: estimation.size,
              changedBy: 'ai-estimation',
            },
          }),
        ]);
      }

      return {
        id: workItemId,
        previousSize,
        suggestedSize: estimation.size,
        confidence: estimation.confidence,
        rationale: estimation.rationale,
        factors: estimation.factors,
        applied: apply,
      };
    },

    async estimateBatch(
      specId: string,
      options: { overwriteExisting?: boolean; minConfidence?: Confidence } = {}
    ): Promise<BatchEstimateResult> {
      const { overwriteExisting = false } = options;

      // Get all stories in the spec
      const items = await prisma.workItem.findMany({
        where: {
          specId,
          type: 'story', // Only estimate stories
        },
      });

      // Filter items based on whether to overwrite
      const itemsToEstimate = overwriteExisting
        ? items
        : items.filter((item) => !item.sizeEstimate);

      const skipped = items.length - itemsToEstimate.length;

      // Store previous values for undo
      const previousValues: Record<string, SizeEstimate | null> = {};
      for (const item of itemsToEstimate) {
        previousValues[item.id] = item.sizeEstimate;
      }

      // Results tracking
      const summary: Record<SizeEstimate, number> = { S: 0, M: 0, L: 0, XL: 0 };
      const byConfidence: Record<Confidence, number> = { high: 0, medium: 0, low: 0 };
      const lowConfidenceItems: Array<{ id: string; title: string; reason: string }> = [];
      const estimates: Array<{ id: string; size: SizeEstimate }> = [];

      // Process sequentially to avoid rate limits
      for (const item of itemsToEstimate) {
        try {
          const result = await this.estimateSingle(item.id, false);
          summary[result.suggestedSize]++;
          byConfidence[result.confidence]++;
          estimates.push({ id: item.id, size: result.suggestedSize });

          if (result.confidence === 'low') {
            lowConfidenceItems.push({
              id: item.id,
              title: item.title,
              reason: result.rationale.substring(0, 100),
            });
          }
        } catch {
          // Skip items that fail estimation
        }
      }

      // Apply all estimates in a single transaction
      const updateOperations = estimates.map(({ id, size }) =>
        prisma.workItem.update({
          where: { id },
          data: { sizeEstimate: size },
        })
      );

      await prisma.$transaction(updateOperations);

      // Create undo token
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      const bulkOp = await prisma.bulkOperation.create({
        data: {
          userId: 'ai-estimation',
          specId,
          operation: 'batch_estimate',
          itemIds: estimates.map((e) => e.id),
          payload: { estimates },
          previousValues,
          expiresAt,
        },
      });

      return {
        estimated: estimates.length,
        skipped,
        summary,
        byConfidence,
        lowConfidenceItems,
        undoToken: bulkOp.id,
        undoExpiresAt: expiresAt.toISOString(),
      };
    },

    async undoBatch(undoToken: string): Promise<{ reverted: number }> {
      const operation = await prisma.bulkOperation.findUnique({
        where: { id: undoToken },
      });

      if (!operation) {
        throw new Error('Undo token not found or expired');
      }

      if (new Date() > operation.expiresAt) {
        await prisma.bulkOperation.delete({ where: { id: undoToken } });
        throw new Error('Undo token expired');
      }

      if (operation.operation !== 'batch_estimate') {
        throw new Error('Invalid undo token');
      }

      const previousValues = operation.previousValues as Record<string, SizeEstimate | null>;

      // Revert all estimates
      const updateOperations = Object.entries(previousValues).map(([id, size]) =>
        prisma.workItem.update({
          where: { id },
          data: { sizeEstimate: size },
        })
      );

      await prisma.$transaction(updateOperations);

      // Delete the undo record
      await prisma.bulkOperation.delete({ where: { id: undoToken } });

      return { reverted: Object.keys(previousValues).length };
    },
  };
}

// Singleton instance
let _estimationService: EstimationService | null = null;

export function getEstimationService(): EstimationService {
  if (!_estimationService) {
    _estimationService = createEstimationService();
  }
  return _estimationService;
}
