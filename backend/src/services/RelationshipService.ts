import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();
const anthropic = new Anthropic();

export interface Entity {
  id: string;
  name: string;
  type: 'user' | 'system' | 'data' | 'process' | 'external' | 'component';
  description?: string;
  mentions: number;
  workItemIds: string[];
}

export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'depends_on' | 'interacts_with' | 'creates' | 'reads' | 'updates' | 'triggers';
  description?: string;
  strength: number; // 0-1
}

export interface RelationshipMap {
  entities: Entity[];
  relationships: Relationship[];
  clusters: Array<{
    id: string;
    name: string;
    entityIds: string[];
  }>;
}

export class RelationshipService {
  async extractEntities(specId: string): Promise<Entity[]> {
    const workItems = await prisma.workItem.findMany({
      where: { specId },
      select: {
        id: true,
        title: true,
        description: true,
        acceptanceCriteria: true,
      },
    });

    if (workItems.length === 0) {
      return [];
    }

    // Combine all text for analysis
    const combinedText = workItems.map((item) =>
      `Title: ${item.title}\nDescription: ${item.description || ''}\nAcceptance Criteria: ${JSON.stringify(item.acceptanceCriteria || [])}`
    ).join('\n\n---\n\n');

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `Analyze the following work items and extract key entities. Identify:
- Users/Actors (people or roles interacting with the system)
- Systems (internal or external systems)
- Data entities (data objects, records, files)
- Processes (workflows, operations)
- Components (UI components, services, modules)

For each entity, provide:
- name: The entity name
- type: One of 'user', 'system', 'data', 'process', 'component', 'external'
- description: Brief description

Return as JSON array: [{"name": "...", "type": "...", "description": "..."}]

Work Items:
${combinedText.substring(0, 8000)}`
          }
        ],
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        return [];
      }

      // Parse JSON from response
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      const parsedEntities = JSON.parse(jsonMatch[0]) as Array<{
        name: string;
        type: Entity['type'];
        description?: string;
      }>;

      // Count mentions and link to work items
      const entities: Entity[] = parsedEntities.map((e, index) => {
        const nameLower = e.name.toLowerCase();
        const mentions = workItems.filter((item) => {
          const text = `${item.title} ${item.description || ''} ${JSON.stringify(item.acceptanceCriteria || [])}`.toLowerCase();
          return text.includes(nameLower);
        });

        return {
          id: `entity-${index}`,
          name: e.name,
          type: e.type,
          description: e.description,
          mentions: mentions.length,
          workItemIds: mentions.map((m) => m.id),
        };
      });

      return entities.filter((e) => e.mentions > 0);
    } catch (error) {
      console.error('Entity extraction failed:', error);
      return [];
    }
  }

  async inferRelationships(entities: Entity[], specId: string): Promise<Relationship[]> {
    if (entities.length < 2) {
      return [];
    }

    const workItems = await prisma.workItem.findMany({
      where: { specId },
      select: {
        id: true,
        title: true,
        description: true,
      },
    });

    const relationships: Relationship[] = [];

    // Analyze co-occurrence in work items
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entity1 = entities[i];
        const entity2 = entities[j];

        // Find work items that mention both entities
        const sharedWorkItems = entity1.workItemIds.filter((id) =>
          entity2.workItemIds.includes(id)
        );

        if (sharedWorkItems.length > 0) {
          // Determine relationship type based on entity types
          let relationType: Relationship['type'] = 'interacts_with';

          if (entity1.type === 'user' && entity2.type === 'system') {
            relationType = 'interacts_with';
          } else if (entity1.type === 'process' && entity2.type === 'data') {
            relationType = 'creates';
          } else if (entity1.type === 'system' && entity2.type === 'external') {
            relationType = 'depends_on';
          } else if (entity1.type === 'component' && entity2.type === 'data') {
            relationType = 'reads';
          } else if (entity1.type === 'process' && entity2.type === 'process') {
            relationType = 'triggers';
          }

          const strength = Math.min(1, sharedWorkItems.length / 5);

          relationships.push({
            id: `rel-${i}-${j}`,
            sourceId: entity1.id,
            targetId: entity2.id,
            type: relationType,
            strength,
          });
        }
      }
    }

    return relationships;
  }

  async clusterEntities(entities: Entity[]): Promise<Array<{ id: string; name: string; entityIds: string[] }>> {
    if (entities.length < 3) {
      return [{
        id: 'cluster-0',
        name: 'All Entities',
        entityIds: entities.map((e) => e.id),
      }];
    }

    // Group entities by type
    const byType = entities.reduce<Record<string, Entity[]>>((acc, entity) => {
      if (!acc[entity.type]) acc[entity.type] = [];
      acc[entity.type].push(entity);
      return acc;
    }, {});

    const clusters = Object.entries(byType).map(([type, entities], index) => ({
      id: `cluster-${index}`,
      name: type.charAt(0).toUpperCase() + type.slice(1) + 's',
      entityIds: entities.map((e) => e.id),
    }));

    return clusters;
  }

  async getRelationshipMap(specId: string): Promise<RelationshipMap> {
    const entities = await this.extractEntities(specId);
    const relationships = await this.inferRelationships(entities, specId);
    const clusters = await this.clusterEntities(entities);

    return { entities, relationships, clusters };
  }

  // Get relationship map from cache or generate
  async getCachedRelationshipMap(specId: string): Promise<RelationshipMap> {
    // Check if we have a cached version
    const cached = await prisma.specAnalysis.findFirst({
      where: {
        specId,
        type: 'relationship_map',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (cached && cached.data) {
      return cached.data as unknown as RelationshipMap;
    }

    // Generate new map
    const map = await this.getRelationshipMap(specId);

    // Cache the result
    await prisma.specAnalysis.create({
      data: {
        specId,
        type: 'relationship_map',
        data: map as any,
      },
    });

    return map;
  }
}

export const relationshipService = new RelationshipService();
