# F25: Project Relationship Map (Multi-Spec Visualization)

> **Priority:** HIGH | **Effort:** 10 hours | **Phase:** 2

---

## Overview

**What:** An interactive graph visualization showing how multiple specs in a project relate to each other through shared entities, dependencies, and generated work items.

**Why:** Real projects have multiple specs that interconnect. PMs need to understand:
- How specs depend on each other
- Which entities/systems span multiple specs
- The "shape" of the overall project
- Where integration points exist

**Success Criteria:**
- Interactive node graph of all project specs
- Lines show relationships (shared entities, dependencies)
- Click spec node → see details
- Filter/zoom capabilities
- Export graph as image

---

## User Stories

### Must Have

**US-25.1:** As a PM, I want to see all my project specs visualized as a graph so that I understand how they relate.
- **AC:** Each spec is a node
- **AC:** Lines connect specs that share entities
- **AC:** Node size reflects story count

**US-25.2:** As a PM, I want to click a spec node to see its details so that I can drill down.
- **AC:** Click node → sidebar shows spec details
- **AC:** Shows story count, coverage, status
- **AC:** Link to open spec

**US-25.3:** As a PM, I want to see what entities are shared between specs so that I understand integration points.
- **AC:** Hover on line → shows shared entities
- **AC:** Entity examples: "Patient", "HL7 Message", "OpenEyes"

### Should Have

**US-25.4:** As a PM, I want to filter the graph by status/date so that I can focus on specific specs.
- **AC:** Filter by: translated, ready, all
- **AC:** Filter by: date range

**US-25.5:** As a PM, I want to export the graph as an image so that I can include it in presentations.
- **AC:** "Export" button → downloads PNG

---

## Technical Design

### API Endpoint

#### GET /api/projects/:id/relationships

```typescript
interface RelationshipGraphResponse {
  nodes: Array<{
    id: string;
    name: string;
    status: SpecStatus;
    storyCount: number;
    coveragePercentage: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    sharedEntities: string[];
    strength: number;
  }>;
  entities: Array<{
    name: string;
    type: string;
    specIds: string[];
  }>;
}
```

### Backend Service

```typescript
// backend/src/services/RelationshipService.ts

export class RelationshipService {
  
  async getRelationshipGraph(projectId: string): Promise<RelationshipGraphResponse> {
    const specs = await prisma.spec.findMany({
      where: { projectId, status: 'translated' },
      include: { workItems: true }
    });
    
    // Extract entities from spec text
    const entityMap = this.extractEntities(specs);
    
    // Build nodes
    const nodes = specs.map(spec => ({
      id: spec.id,
      name: spec.name,
      status: spec.status,
      storyCount: spec.workItems.filter(w => w.type === 'story').length,
      coveragePercentage: 85, // Calculate from CoverageService
    }));
    
    // Calculate edges based on shared entities
    const edges: RelationshipGraphResponse['edges'] = [];
    
    for (let i = 0; i < specs.length; i++) {
      for (let j = i + 1; j < specs.length; j++) {
        const shared = this.findSharedEntities(specs[i].id, specs[j].id, entityMap);
        if (shared.length > 0) {
          edges.push({
            source: specs[i].id,
            target: specs[j].id,
            sharedEntities: shared,
            strength: Math.min(1, shared.length / 5),
          });
        }
      }
    }
    
    return { nodes, edges, entities: Array.from(entityMap.values()) };
  }
  
  private extractEntities(specs: Spec[]): Map<string, ExtractedEntity> {
    const entityMap = new Map<string, ExtractedEntity>();
    
    for (const spec of specs) {
      const text = spec.extractedText || '';
      
      // Extract system names and data entities
      const systemPattern = /\b(OpenEyes|Meditech|Mirth|HL7|FHIR|API|NHS)\b/gi;
      const dataPattern = /\b(Patient|Allergy|Appointment|MRN|Message|Record)\b/gi;
      
      const matches = [...(text.match(systemPattern) || []), ...(text.match(dataPattern) || [])];
      
      for (const entity of matches) {
        const normalized = entity.toLowerCase();
        const existing = entityMap.get(normalized);
        
        if (existing) {
          if (!existing.specIds.includes(spec.id)) {
            existing.specIds.push(spec.id);
          }
        } else {
          entityMap.set(normalized, {
            name: entity,
            type: systemPattern.test(entity) ? 'system' : 'data',
            specIds: [spec.id],
          });
        }
      }
    }
    
    return entityMap;
  }
  
  private findSharedEntities(spec1Id: string, spec2Id: string, entityMap: Map<string, any>): string[] {
    const shared: string[] = [];
    for (const [_, entity] of entityMap) {
      if (entity.specIds.includes(spec1Id) && entity.specIds.includes(spec2Id)) {
        shared.push(entity.name);
      }
    }
    return shared;
  }
}
```

### Frontend - D3 Graph Component

```tsx
// frontend/src/components/organisms/RelationshipGraph.tsx
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Props {
  data: RelationshipGraphResponse;
  onNodeSelect: (nodeId: string | null) => void;
  selectedNodeId: string | null;
}

export function RelationshipGraph({ data, onNodeSelect, selectedNodeId }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    // Force simulation
    const simulation = d3.forceSimulation(data.nodes as any)
      .force('link', d3.forceLink(data.edges).id((d: any) => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));
    
    const g = svg.append('g');
    
    // Zoom
    svg.call(d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => g.attr('transform', event.transform)) as any);
    
    // Edges
    const links = g.append('g')
      .selectAll('line')
      .data(data.edges)
      .join('line')
      .attr('stroke', '#3D3D5C')
      .attr('stroke-width', d => 1 + d.strength * 3);
    
    // Nodes
    const nodes = g.append('g')
      .selectAll('g')
      .data(data.nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .on('click', (_, d) => onNodeSelect(d.id))
      .call(d3.drag<SVGGElement, any>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        }) as any);
    
    // Node circles
    nodes.append('circle')
      .attr('r', d => 20 + Math.sqrt(d.storyCount) * 5)
      .attr('fill', d => d.id === selectedNodeId ? '#FF6B35' : 
        d.status === 'translated' ? '#4ADE80' : '#60A5FA')
      .attr('stroke', '#1A1A2E')
      .attr('stroke-width', 2);
    
    // Node labels
    nodes.append('text')
      .text(d => d.name.length > 15 ? d.name.slice(0, 12) + '...' : d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('fill', '#F5F5F7')
      .attr('font-size', 11);
    
    // Tick
    simulation.on('tick', () => {
      links
        .attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y);
      nodes.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });
    
    return () => simulation.stop();
  }, [data, selectedNodeId, onNodeSelect]);
  
  return <svg ref={svgRef} width="100%" height="100%" className="bg-toucan-dark rounded-lg" />;
}
```

### Relationship Map Page

```tsx
// frontend/src/pages/RelationshipMapPage.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PageLayout } from '../components/templates/PageLayout';
import { RelationshipGraph } from '../components/organisms/RelationshipGraph';
import { Button } from '../components/atoms/Button';
import html2canvas from 'html2canvas';

export function RelationshipMapPage() {
  const { projectId } = useParams();
  const [data, setData] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  useEffect(() => {
    fetch(`/api/projects/${projectId}/relationships`)
      .then(r => r.json())
      .then(d => setData(d.data));
  }, [projectId]);
  
  const handleExport = async () => {
    const el = document.getElementById('graph');
    if (!el) return;
    const canvas = await html2canvas(el);
    const link = document.createElement('a');
    link.download = 'relationships.png';
    link.href = canvas.toDataURL();
    link.click();
  };
  
  return (
    <PageLayout title="Project Relationships">
      <div className="flex justify-end mb-4">
        <Button onClick={handleExport}>Export PNG</Button>
      </div>
      
      <div id="graph" className="h-[600px]">
        {data && (
          <RelationshipGraph
            data={data}
            onNodeSelect={setSelectedNodeId}
            selectedNodeId={selectedNodeId}
          />
        )}
      </div>
      
      <div className="mt-4 flex gap-6 text-sm text-toucan-grey-400">
        <span>● Translated</span>
        <span>● Ready</span>
        <span>Node size = story count</span>
      </div>
    </PageLayout>
  );
}
```

---

## Dependencies

```json
{
  "d3": "^7.8.5",
  "html2canvas": "^1.4.1"
}
```

---

## Testing Checklist

- [ ] Graph renders with nodes
- [ ] Click node shows details
- [ ] Drag repositions nodes
- [ ] Zoom works
- [ ] Export creates image
- [ ] Edges show shared entities on hover

---

*F25 Specification v1.0*
