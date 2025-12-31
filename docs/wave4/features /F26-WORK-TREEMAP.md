# F26: Work Breakdown Treemap

> **Priority:** MEDIUM | **Effort:** 6 hours | **Phase:** 2

---

## Overview

**What:** A visual treemap/sunburst showing the hierarchical breakdown of all work items (epics → features → stories), where box size represents story count and color represents status.

**Why:** The existing tree view is functional but doesn't show the "shape" of work at a glance. A treemap lets PMs instantly see:
- Which epics have the most stories
- Distribution of work across features
- Status at each level
- Imbalanced areas (one epic with 50 stories vs another with 3)

**Success Criteria:**
- Treemap renders all work items hierarchically
- Box size = story count (or effort estimate)
- Color = status (draft/review/approved)
- Click to drill down
- Hover shows details

---

## User Stories

### Must Have

**US-26.1:** As a PM, I want to see a treemap of all work items so that I understand the shape of the project at a glance.
- **AC:** Treemap shows epics as top-level boxes
- **AC:** Features nested within epics
- **AC:** Stories as smallest boxes
- **AC:** Size proportional to story count

**US-26.2:** As a PM, I want boxes colored by status so that I see progress visually.
- **AC:** Draft = grey
- **AC:** In Review = orange
- **AC:** Approved = green

**US-26.3:** As a PM, I want to click a box to drill down so that I can explore a specific area.
- **AC:** Click epic → shows only that epic's features/stories
- **AC:** Breadcrumb to navigate back
- **AC:** Double-click to open item

### Should Have

**US-26.4:** As a PM, I want to toggle between treemap and sunburst views so that I can choose my preferred visualization.
- **AC:** Toggle button switches views
- **AC:** Same data, different layout

---

## Visual Design

### Treemap View

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  WORK BREAKDOWN                    [Treemap ▼] [Size: Count ▼] [Color: Status]│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────┐ ┌────────────────────────────┐  │
│  │                                        │ │                            │  │
│  │  EPIC: Patient Demographics            │ │ EPIC: Allergy Exchange     │  │
│  │  ┌──────────────┬──────────────────┐  │ │                            │  │
│  │  │              │                   │  │ │  ┌──────────┬──────────┐  │  │
│  │  │  ADT         │  Patient          │  │ │  │ Inbound  │ Outbound │  │  │
│  │  │  Processing  │  Matching         │  │ │  │ Sync     │ Sync     │  │  │
│  │  │  ■■■■        │  ■■■■■            │  │ │  │ ■■■      │ ■■       │  │  │
│  │  │  ■■          │  ■■               │  │ │  └──────────┴──────────┘  │  │
│  │  └──────────────┴──────────────────┘  │ │                            │  │
│  │                                        │ └────────────────────────────┘  │
│  └────────────────────────────────────────┘                                  │
│                                                                              │
│  Legend: ■ = story | Grey = Draft | Orange = Review | Green = Approved      │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Sunburst View

```
                    ╭────────────────────╮
                  ╱                        ╲
                ╱   Patient Demographics     ╲
              ╱  ╭──────────────────────╮     ╲
            ╱  ╱   ADT      Patient      ╲      ╲
          ╱  ╱    Processing  Matching     ╲      ╲
         │  │   ┌─────────┬──────────┐      │      │
         │  │   │ stories │ stories  │      │      │
         │  │   └─────────┴──────────┘      │      │
          ╲  ╲                             ╱      ╱
            ╲  ╰──────────────────────╯  ╱      ╱
              ╲                        ╱      ╱
                ╲ Allergy Exchange   ╱      ╱
                  ╲                ╱      ╱
                    ╰────────────╯
```

---

## Technical Design

### API Endpoint

#### GET /api/projects/:id/work-breakdown

```typescript
interface WorkBreakdownResponse {
  root: TreemapNode;
  summary: {
    totalEpics: number;
    totalFeatures: number;
    totalStories: number;
    statusDistribution: {
      draft: number;
      review: number;
      approved: number;
    };
  };
}

interface TreemapNode {
  id: string;
  name: string;
  type: 'project' | 'epic' | 'feature' | 'story';
  status: WorkItemStatus;
  value: number;  // Story count for sizing
  effort?: number;  // Optional effort estimate
  children?: TreemapNode[];
}
```

### Backend Service

```typescript
// backend/src/services/WorkBreakdownService.ts

export class WorkBreakdownService {
  
  async getWorkBreakdown(projectId: string): Promise<WorkBreakdownResponse> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        specs: {
          include: {
            workItems: {
              orderBy: { orderIndex: 'asc' }
            }
          }
        }
      }
    });
    
    if (!project) throw new NotFoundError('Project not found');
    
    // Aggregate all work items across specs
    const allWorkItems = project.specs.flatMap(s => s.workItems);
    
    // Build tree structure
    const root = this.buildTree(project.name, allWorkItems);
    
    // Calculate summary
    const summary = {
      totalEpics: allWorkItems.filter(w => w.type === 'epic').length,
      totalFeatures: allWorkItems.filter(w => w.type === 'feature').length,
      totalStories: allWorkItems.filter(w => w.type === 'story').length,
      statusDistribution: {
        draft: allWorkItems.filter(w => w.status === 'draft').length,
        review: allWorkItems.filter(w => w.status === 'in_review').length,
        approved: allWorkItems.filter(w => w.status === 'approved').length,
      }
    };
    
    return { root, summary };
  }
  
  private buildTree(projectName: string, workItems: WorkItem[]): TreemapNode {
    const itemMap = new Map<string, WorkItem>();
    workItems.forEach(item => itemMap.set(item.id, item));
    
    // Find root items (no parent)
    const rootItems = workItems.filter(w => !w.parentId);
    
    const buildNode = (item: WorkItem): TreemapNode => {
      const children = workItems.filter(w => w.parentId === item.id);
      
      // Calculate value: story count in subtree
      const storyCount = item.type === 'story' ? 1 :
        children.reduce((sum, child) => {
          const childNode = buildNode(child);
          return sum + childNode.value;
        }, 0);
      
      return {
        id: item.id,
        name: item.title,
        type: item.type as any,
        status: item.status,
        value: Math.max(1, storyCount), // Min 1 for visibility
        effort: item.sizeEstimate ? this.sizeToNumber(item.sizeEstimate) : undefined,
        children: children.length > 0 ? children.map(buildNode) : undefined,
      };
    };
    
    return {
      id: 'root',
      name: projectName,
      type: 'project',
      status: 'draft',
      value: workItems.filter(w => w.type === 'story').length || 1,
      children: rootItems.map(buildNode),
    };
  }
  
  private sizeToNumber(size: string): number {
    const sizes: Record<string, number> = { XS: 1, S: 2, M: 3, L: 5, XL: 8 };
    return sizes[size] || 3;
  }
}
```

### Frontend - Treemap Component

Using D3's treemap layout:

```tsx
// frontend/src/components/organisms/WorkBreakdownTreemap.tsx
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Props {
  data: TreemapNode;
  onNodeClick: (node: TreemapNode) => void;
  sizeBy: 'count' | 'effort';
}

const STATUS_COLORS = {
  draft: '#6B7280',
  in_review: '#F59E0B',
  approved: '#10B981',
  rejected: '#EF4444',
};

export function WorkBreakdownTreemap({ data, onNodeClick, sizeBy }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const { width, height } = dimensions;
    
    // Clear previous
    d3.select(containerRef.current).selectAll('*').remove();
    
    // Create hierarchy
    const root = d3.hierarchy(data)
      .sum(d => sizeBy === 'effort' ? (d.effort || d.value) : d.value)
      .sort((a, b) => (b.value || 0) - (a.value || 0));
    
    // Create treemap layout
    d3.treemap<TreemapNode>()
      .size([width, height])
      .padding(2)
      .paddingTop(20)
      .round(true)(root);
    
    // Create SVG
    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height);
    
    // Draw cells
    const cell = svg.selectAll('g')
      .data(root.descendants().filter(d => d.depth > 0))
      .join('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);
    
    // Background rect
    cell.append('rect')
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill', d => STATUS_COLORS[d.data.status] || '#6B7280')
      .attr('fill-opacity', d => 0.3 + d.depth * 0.2)
      .attr('stroke', '#1A1A2E')
      .attr('stroke-width', d => d.depth === 1 ? 2 : 1)
      .attr('rx', 4)
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onNodeClick(d.data);
      })
      .on('dblclick', (event, d) => {
        // Navigate to item
        window.location.href = `/review/${d.data.id}`;
      });
    
    // Labels (only if cell is big enough)
    cell.append('text')
      .attr('x', 4)
      .attr('y', 14)
      .text(d => {
        const width = d.x1 - d.x0;
        const name = d.data.name;
        if (width < 60) return '';
        if (width < 100) return name.slice(0, 8) + '...';
        if (width < 150) return name.slice(0, 15) + (name.length > 15 ? '...' : '');
        return name;
      })
      .attr('fill', '#F5F5F7')
      .attr('font-size', d => d.depth === 1 ? 12 : 10)
      .attr('font-weight', d => d.depth === 1 ? 600 : 400);
    
    // Value label
    cell.append('text')
      .attr('x', d => (d.x1 - d.x0) / 2)
      .attr('y', d => (d.y1 - d.y0) / 2 + 4)
      .attr('text-anchor', 'middle')
      .text(d => d.data.type === 'story' ? '' : d.value || '')
      .attr('fill', '#9CA3AF')
      .attr('font-size', 10);
    
  }, [data, dimensions, sizeBy, onNodeClick]);
  
  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height: Math.max(400, height) });
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  
  return (
    <div 
      ref={containerRef} 
      className="w-full h-[500px] bg-toucan-dark-lighter rounded-lg"
    />
  );
}
```

### Work Breakdown Page

```tsx
// frontend/src/pages/WorkBreakdownPage.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PageLayout } from '../components/templates/PageLayout';
import { WorkBreakdownTreemap } from '../components/organisms/WorkBreakdownTreemap';
import { Button } from '../components/atoms/Button';

export function WorkBreakdownPage() {
  const { projectId } = useParams();
  const [data, setData] = useState<WorkBreakdownResponse | null>(null);
  const [viewMode, setViewMode] = useState<'treemap' | 'sunburst'>('treemap');
  const [sizeBy, setSizeBy] = useState<'count' | 'effort'>('count');
  const [selectedNode, setSelectedNode] = useState<TreemapNode | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<TreemapNode[]>([]);
  
  useEffect(() => {
    fetch(`/api/projects/${projectId}/work-breakdown`)
      .then(r => r.json())
      .then(d => setData(d.data));
  }, [projectId]);
  
  const handleNodeClick = (node: TreemapNode) => {
    if (node.children && node.children.length > 0) {
      setBreadcrumbs([...breadcrumbs, selectedNode || data!.root]);
      setSelectedNode(node);
    }
  };
  
  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setSelectedNode(null);
      setBreadcrumbs([]);
    } else {
      setSelectedNode(breadcrumbs[index]);
      setBreadcrumbs(breadcrumbs.slice(0, index));
    }
  };
  
  const displayNode = selectedNode || data?.root;
  
  return (
    <PageLayout title="Work Breakdown">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {/* Breadcrumbs */}
          <button 
            onClick={() => handleBreadcrumbClick(-1)}
            className="text-sm text-toucan-orange hover:underline"
          >
            Project
          </button>
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.id} className="flex items-center gap-2">
              <span className="text-toucan-grey-400">/</span>
              <button 
                onClick={() => handleBreadcrumbClick(i)}
                className="text-sm text-toucan-orange hover:underline"
              >
                {crumb.name}
              </button>
            </span>
          ))}
          {selectedNode && (
            <span className="flex items-center gap-2">
              <span className="text-toucan-grey-400">/</span>
              <span className="text-sm text-toucan-grey-100">{selectedNode.name}</span>
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={sizeBy}
            onChange={e => setSizeBy(e.target.value as any)}
            className="bg-toucan-dark border border-toucan-dark-border rounded px-3 py-2 text-sm"
          >
            <option value="count">Size by Count</option>
            <option value="effort">Size by Effort</option>
          </select>
          
          <select
            value={viewMode}
            onChange={e => setViewMode(e.target.value as any)}
            className="bg-toucan-dark border border-toucan-dark-border rounded px-3 py-2 text-sm"
          >
            <option value="treemap">Treemap</option>
            <option value="sunburst">Sunburst</option>
          </select>
        </div>
      </div>
      
      {/* Summary */}
      {data && (
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-toucan-dark-lighter p-4 rounded-lg">
            <p className="text-xs text-toucan-grey-400 uppercase">Epics</p>
            <p className="text-2xl font-bold text-toucan-grey-100">{data.summary.totalEpics}</p>
          </div>
          <div className="bg-toucan-dark-lighter p-4 rounded-lg">
            <p className="text-xs text-toucan-grey-400 uppercase">Features</p>
            <p className="text-2xl font-bold text-toucan-grey-100">{data.summary.totalFeatures}</p>
          </div>
          <div className="bg-toucan-dark-lighter p-4 rounded-lg">
            <p className="text-xs text-toucan-grey-400 uppercase">Stories</p>
            <p className="text-2xl font-bold text-toucan-grey-100">{data.summary.totalStories}</p>
          </div>
          <div className="bg-toucan-dark-lighter p-4 rounded-lg">
            <p className="text-xs text-toucan-grey-400 uppercase">Approved</p>
            <p className="text-2xl font-bold text-toucan-success">{data.summary.statusDistribution.approved}</p>
          </div>
        </div>
      )}
      
      {/* Visualization */}
      {displayNode && (
        <WorkBreakdownTreemap
          data={displayNode}
          onNodeClick={handleNodeClick}
          sizeBy={sizeBy}
        />
      )}
      
      {/* Legend */}
      <div className="mt-4 flex gap-6 text-sm text-toucan-grey-400">
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-gray-500" /> Draft
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-amber-500" /> In Review
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-emerald-500" /> Approved
        </span>
      </div>
    </PageLayout>
  );
}
```

---

## Database Changes

None - uses existing WorkItem model.

---

## Dependencies

D3.js (already added in F25)

---

## Testing Checklist

- [ ] Treemap renders with correct hierarchy
- [ ] Box sizes reflect story counts
- [ ] Colors match status
- [ ] Click drills down to children
- [ ] Breadcrumbs navigate back
- [ ] Size toggle changes layout
- [ ] Empty state handled gracefully

---

*F26 Specification v1.0*
