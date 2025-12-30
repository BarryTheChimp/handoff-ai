import { prisma } from '../lib/prisma.js';
import { getClaudeService } from './ClaudeService.js';
import type { SpecGroupStatus } from '@prisma/client';

// Types for conflict detection
interface DetectedConflict {
  spec1Id: string;
  spec1Section: string;
  spec1Text: string;
  spec2Id: string;
  spec2Section: string;
  spec2Text: string;
  type: 'duplicate' | 'contradiction' | 'overlap';
  description: string;
}

interface ConflictResolution {
  conflictId: string;
  resolution: 'use_spec1' | 'use_spec2' | 'merge' | 'ignore';
  mergedText?: string;
}

interface StitchedContextResponse {
  stitchedContext: string;
}

// Severity mapping
const CONFLICT_SEVERITY: Record<string, string> = {
  contradiction: 'critical',
  duplicate: 'warning',
  overlap: 'info',
};

export interface SpecGroupService {
  createGroup(projectId: string, name: string, specIds: string[], primarySpecId?: string): Promise<{ id: string; status: SpecGroupStatus }>;
  getGroup(groupId: string): Promise<GroupDetails | null>;
  listGroups(projectId: string): Promise<GroupSummary[]>;
  analyzeConflicts(groupId: string): Promise<void>;
  resolveConflicts(groupId: string, resolutions: ConflictResolution[], userId: string): Promise<{ resolved: number; remaining: number; status: SpecGroupStatus }>;
  generateContext(groupId: string): Promise<string>;
  deleteGroup(groupId: string): Promise<void>;
  addSpecToGroup(groupId: string, specId: string): Promise<void>;
  removeSpecFromGroup(groupId: string, specId: string): Promise<void>;
}

interface GroupSummary {
  id: string;
  name: string;
  status: SpecGroupStatus;
  specCount: number;
  conflictCount: number;
  createdAt: Date;
}

interface GroupDetails {
  id: string;
  name: string;
  status: SpecGroupStatus;
  primarySpecId: string | null;
  stitchedContext: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  specs: Array<{
    id: string;
    name: string;
    fileType: string;
    status: string;
    isPrimary: boolean;
    sectionCount: number;
  }>;
  conflicts: Array<{
    id: string;
    conflictType: string;
    severity: string;
    description: string;
    spec1: { id: string; name: string; section: string; text: string };
    spec2: { id: string; name: string; section: string; text: string };
    resolution: string | null;
    mergedText: string | null;
    resolvedAt: Date | null;
  }>;
  conflictSummary: {
    total: number;
    resolved: number;
    unresolved: number;
    bySeverity: Record<string, number>;
  };
}

export function createSpecGroupService(): SpecGroupService {
  const claude = getClaudeService();

  return {
    async createGroup(projectId: string, name: string, specIds: string[], primarySpecId?: string) {
      // Validate spec count
      if (specIds.length < 2) {
        throw new Error('At least 2 specs required for a group');
      }
      if (specIds.length > 10) {
        throw new Error('Maximum 10 specs allowed per group');
      }

      // Validate all specs exist and belong to the project
      const specs = await prisma.spec.findMany({
        where: { id: { in: specIds }, projectId },
      });

      if (specs.length !== specIds.length) {
        throw new Error('One or more specs not found or do not belong to this project');
      }

      // Validate primary spec if provided
      if (primarySpecId && !specIds.includes(primarySpecId)) {
        throw new Error('Primary spec must be one of the group specs');
      }

      // Create the group
      const group = await prisma.specGroup.create({
        data: {
          projectId,
          name,
          primarySpecId,
          status: 'pending',
        },
      });

      // Link specs to group
      await prisma.spec.updateMany({
        where: { id: { in: specIds } },
        data: { specGroupId: group.id },
      });

      return { id: group.id, status: group.status };
    },

    async getGroup(groupId: string): Promise<GroupDetails | null> {
      const group = await prisma.specGroup.findUnique({
        where: { id: groupId },
        include: {
          specs: {
            include: {
              sections: { select: { id: true } },
            },
          },
          conflicts: true,
        },
      });

      if (!group) return null;

      // Transform specs
      const specs = group.specs.map((spec) => ({
        id: spec.id,
        name: spec.name,
        fileType: spec.fileType,
        status: spec.status,
        isPrimary: spec.id === group.primarySpecId,
        sectionCount: spec.sections.length,
      }));

      // Transform conflicts
      const conflicts = group.conflicts.map((conflict) => {
        const spec1 = group.specs.find((s) => s.id === conflict.spec1Id);
        const spec2 = group.specs.find((s) => s.id === conflict.spec2Id);

        return {
          id: conflict.id,
          conflictType: conflict.conflictType,
          severity: conflict.severity,
          description: conflict.description,
          spec1: {
            id: conflict.spec1Id,
            name: spec1?.name ?? 'Unknown',
            section: conflict.spec1Section,
            text: conflict.spec1Text,
          },
          spec2: {
            id: conflict.spec2Id,
            name: spec2?.name ?? 'Unknown',
            section: conflict.spec2Section,
            text: conflict.spec2Text,
          },
          resolution: conflict.resolution,
          mergedText: conflict.mergedText,
          resolvedAt: conflict.resolvedAt,
        };
      });

      // Calculate conflict summary
      const resolved = conflicts.filter((c) => c.resolution !== null).length;
      const bySeverity = conflicts.reduce(
        (acc, c) => {
          acc[c.severity] = (acc[c.severity] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        id: group.id,
        name: group.name,
        status: group.status,
        primarySpecId: group.primarySpecId,
        stitchedContext: group.stitchedContext,
        errorMessage: group.errorMessage,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        specs,
        conflicts,
        conflictSummary: {
          total: conflicts.length,
          resolved,
          unresolved: conflicts.length - resolved,
          bySeverity,
        },
      };
    },

    async listGroups(projectId: string): Promise<GroupSummary[]> {
      const groups = await prisma.specGroup.findMany({
        where: { projectId },
        include: {
          specs: { select: { id: true } },
          conflicts: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return groups.map((group) => ({
        id: group.id,
        name: group.name,
        status: group.status,
        specCount: group.specs.length,
        conflictCount: group.conflicts.length,
        createdAt: group.createdAt,
      }));
    },

    async analyzeConflicts(groupId: string): Promise<void> {
      // Update status to analyzing
      await prisma.specGroup.update({
        where: { id: groupId },
        data: { status: 'analyzing', errorMessage: null },
      });

      try {
        // Get specs with their sections
        const group = await prisma.specGroup.findUnique({
          where: { id: groupId },
          include: {
            specs: {
              include: {
                sections: true,
              },
            },
          },
        });

        if (!group) throw new Error('Group not found');

        // Build the prompt
        const specsContent = group.specs
          .map((spec) => {
            const sectionsContent = spec.sections
              .map((section) => `#### Section ${section.sectionRef}: ${section.heading}\n${section.content}`)
              .join('\n\n');
            return `### Document: ${spec.name} (ID: ${spec.id})\n${sectionsContent}`;
          })
          .join('\n\n');

        const prompt = `You are analyzing multiple specification documents for potential conflicts.

## Documents

${specsContent}

## Instructions

Analyze these documents for conflicts. Identify:

1. **DUPLICATE**: Same requirement or feature described in multiple documents with identical or near-identical meaning.

2. **CONTRADICTION**: Documents make incompatible claims. Examples:
   - Different numeric limits (100 users vs unlimited)
   - Conflicting timelines
   - Mutually exclusive features

3. **OVERLAP**: Same topic covered with different details or perspectives. Not contradictory, but needs merging.

## Output Format

Return a JSON array of conflicts:

[
  {
    "spec1Id": "uuid of first document",
    "spec1Section": "section reference or heading",
    "spec1Text": "relevant excerpt (max 500 chars)",
    "spec2Id": "uuid of second document",
    "spec2Section": "section reference or heading",
    "spec2Text": "relevant excerpt (max 500 chars)",
    "type": "duplicate|contradiction|overlap",
    "description": "1-2 sentence explanation"
  }
]

If no conflicts found, return an empty array: []

Return valid JSON only.`;

        // Call Claude for conflict detection
        const conflicts = await claude.completeJSON<DetectedConflict[]>(prompt, {
          model: 'haiku',
          temperature: 0.1,
          maxTokens: 4096,
        });

        // Delete existing conflicts and create new ones
        await prisma.specConflict.deleteMany({
          where: { specGroupId: groupId },
        });

        if (conflicts.length > 0) {
          await prisma.specConflict.createMany({
            data: conflicts.map((conflict) => ({
              specGroupId: groupId,
              spec1Id: conflict.spec1Id,
              spec1Section: conflict.spec1Section,
              spec1Text: conflict.spec1Text.slice(0, 5000), // Limit text size
              spec2Id: conflict.spec2Id,
              spec2Section: conflict.spec2Section,
              spec2Text: conflict.spec2Text.slice(0, 5000),
              conflictType: conflict.type,
              severity: CONFLICT_SEVERITY[conflict.type] ?? 'warning',
              description: conflict.description,
            })),
          });

          // Update status to conflicts_detected
          await prisma.specGroup.update({
            where: { id: groupId },
            data: { status: 'conflicts_detected' },
          });
        } else {
          // No conflicts - ready for translation
          await prisma.specGroup.update({
            where: { id: groupId },
            data: { status: 'ready' },
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during conflict analysis';
        await prisma.specGroup.update({
          where: { id: groupId },
          data: { status: 'error', errorMessage },
        });
        throw error;
      }
    },

    async resolveConflicts(groupId: string, resolutions: ConflictResolution[], userId: string) {
      // Update each conflict
      for (const resolution of resolutions) {
        await prisma.specConflict.update({
          where: { id: resolution.conflictId },
          data: {
            resolution: resolution.resolution,
            mergedText: resolution.mergedText,
            resolvedBy: userId,
            resolvedAt: new Date(),
          },
        });
      }

      // Check remaining unresolved conflicts
      const unresolvedCount = await prisma.specConflict.count({
        where: { specGroupId: groupId, resolution: null },
      });

      let status: SpecGroupStatus = 'conflicts_detected';

      if (unresolvedCount === 0) {
        // All resolved - generate stitched context
        await this.generateContext(groupId);
        status = 'ready';
      }

      const totalResolved = await prisma.specConflict.count({
        where: { specGroupId: groupId, resolution: { not: null } },
      });

      return {
        resolved: totalResolved,
        remaining: unresolvedCount,
        status,
      };
    },

    async generateContext(groupId: string): Promise<string> {
      const group = await prisma.specGroup.findUnique({
        where: { id: groupId },
        include: {
          specs: true,
          conflicts: true,
        },
      });

      if (!group) throw new Error('Group not found');

      // Find primary spec (or use first one)
      const primarySpec = group.specs.find((s) => s.id === group.primarySpecId) ?? group.specs[0];
      if (!primarySpec) throw new Error('No specs in group');

      // Build prompt
      const specsContent = group.specs
        .map((spec) => {
          const role = spec.id === primarySpec.id ? 'PRIMARY' : 'SUPPLEMENTARY';
          return `### Document: ${spec.name} (${role})\n${spec.extractedText ?? 'No content extracted'}`;
        })
        .join('\n\n');

      const conflictsContent = group.conflicts
        .filter((c) => c.resolution !== null)
        .map((conflict, i) => {
          const spec1 = group.specs.find((s) => s.id === conflict.spec1Id);
          const spec2 = group.specs.find((s) => s.id === conflict.spec2Id);
          return `### Conflict ${i + 1}: ${conflict.conflictType}
- Document 1 (${spec1?.name ?? 'Unknown'}): "${conflict.spec1Text.slice(0, 300)}"
- Document 2 (${spec2?.name ?? 'Unknown'}): "${conflict.spec2Text.slice(0, 300)}"
- Resolution: ${conflict.resolution}${conflict.mergedText ? `\n- Merged Content: "${conflict.mergedText}"` : ''}`;
        })
        .join('\n\n');

      const prompt = `You are creating a unified specification document from multiple sources.

## Source Documents

${specsContent}

## Conflict Resolutions

${conflictsContent || 'No conflicts to resolve.'}

## Instructions

Create a single, coherent specification document that:

1. Uses the structure of the PRIMARY document (${primarySpec.name}) as the skeleton
2. Incorporates relevant content from other documents into appropriate sections
3. Respects all conflict resolutions:
   - For "use_spec1": Use only the content from document 1
   - For "use_spec2": Use only the content from document 2
   - For "merge": Use the provided merged content
   - For "ignore": Omit the conflicting content entirely
4. Eliminates true duplicates
5. Maintains source attribution where helpful

## Output Format

Return JSON with a single field:

{
  "stitchedContext": "# Unified Specification\\n\\n## Section 1...\\n\\n## Section 2..."
}

The stitchedContext should be valid Markdown.

Return valid JSON only.`;

      try {
        const result = await claude.completeJSON<StitchedContextResponse>(prompt, {
          model: 'sonnet',
          temperature: 0.2,
          maxTokens: 8192,
        });

        // Store the stitched context
        await prisma.specGroup.update({
          where: { id: groupId },
          data: {
            stitchedContext: result.stitchedContext,
            status: 'ready',
          },
        });

        return result.stitchedContext;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during context generation';
        await prisma.specGroup.update({
          where: { id: groupId },
          data: { status: 'error', errorMessage },
        });
        throw error;
      }
    },

    async deleteGroup(groupId: string): Promise<void> {
      // Unlink specs first
      await prisma.spec.updateMany({
        where: { specGroupId: groupId },
        data: { specGroupId: null },
      });

      // Delete the group (conflicts deleted by cascade)
      await prisma.specGroup.delete({
        where: { id: groupId },
      });
    },

    async addSpecToGroup(groupId: string, specId: string): Promise<void> {
      const group = await prisma.specGroup.findUnique({
        where: { id: groupId },
        include: { specs: { select: { id: true } } },
      });

      if (!group) throw new Error('Group not found');

      if (group.specs.length >= 10) {
        throw new Error('Maximum 10 specs allowed per group');
      }

      await prisma.spec.update({
        where: { id: specId },
        data: { specGroupId: groupId },
      });

      // Reset group status to trigger re-analysis
      await prisma.specGroup.update({
        where: { id: groupId },
        data: { status: 'pending', stitchedContext: null },
      });
    },

    async removeSpecFromGroup(groupId: string, specId: string): Promise<void> {
      const group = await prisma.specGroup.findUnique({
        where: { id: groupId },
        include: { specs: { select: { id: true } } },
      });

      if (!group) throw new Error('Group not found');

      if (group.specs.length <= 2) {
        throw new Error('Group must have at least 2 specs');
      }

      await prisma.spec.update({
        where: { id: specId },
        data: { specGroupId: null },
      });

      // Reset group status to trigger re-analysis
      await prisma.specGroup.update({
        where: { id: groupId },
        data: { status: 'pending', stitchedContext: null },
      });
    },
  };
}

// Export singleton instance
let _specGroupService: SpecGroupService | null = null;

export function getSpecGroupService(): SpecGroupService {
  if (!_specGroupService) {
    _specGroupService = createSpecGroupService();
  }
  return _specGroupService;
}
