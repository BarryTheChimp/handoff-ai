import { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import type { DependencyNode, DependencyEdge } from '../../services/api';

interface Props {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  criticalPath: string[];
  cycles: string[][];
  onNodeClick?: (node: DependencyNode) => void;
  onAddDependency?: (fromId: string, toId: string) => void;
  selectedNodeId?: string | null;
  addingDependencyFromId?: string | null;
  filterType?: 'all' | 'epic' | 'feature' | 'story';
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  type: 'epic' | 'feature' | 'story';
  sizeEstimate: string | null;
  status: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: string | SimNode;
  target: string | SimNode;
  isCritical: boolean;
}

const NODE_RADIUS = 24;
const COLORS = {
  epic: '#60A5FA',      // Blue
  feature: '#4ADE80',   // Green
  story: '#FF6B35',     // Orange (Toucan)
  critical: '#F87171',  // Red
  default: '#6B7280',   // Gray
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#6B7280',
  ready_for_review: '#F59E0B',
  approved: '#10B981',
  exported: '#3B82F6',
};

export function DependencyGraph({
  nodes,
  edges,
  criticalPath,
  cycles,
  onNodeClick,
  onAddDependency,
  selectedNodeId,
  addingDependencyFromId,
  filterType = 'all',
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Filter nodes based on type
  const filteredNodes = filterType === 'all'
    ? nodes
    : nodes.filter(n => n.type === filterType);

  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = edges.filter(
    e => filteredNodeIds.has(e.from) && filteredNodeIds.has(e.to)
  );

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Load saved positions from localStorage
  const loadPositions = useCallback(() => {
    try {
      const saved = localStorage.getItem('dependency-graph-positions');
      if (saved) {
        return JSON.parse(saved) as Record<string, { x: number; y: number }>;
      }
    } catch {
      // Ignore parse errors
    }
    return {};
  }, []);

  // Save positions to localStorage
  const savePositions = useCallback((positions: Record<string, { x: number; y: number }>) => {
    try {
      localStorage.setItem('dependency-graph-positions', JSON.stringify(positions));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // D3 visualization
  useEffect(() => {
    if (!svgRef.current || filteredNodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const savedPositions = loadPositions();

    // Create simulation nodes with saved positions
    const simNodes: SimNode[] = filteredNodes.map(node => ({
      ...node,
      x: savedPositions[node.id]?.x ?? width / 2 + (Math.random() - 0.5) * 200,
      y: savedPositions[node.id]?.y ?? height / 2 + (Math.random() - 0.5) * 200,
    }));

    // Create simulation links
    const simLinks: SimLink[] = filteredEdges.map(edge => ({
      source: edge.from,
      target: edge.to,
      isCritical: edge.isCritical,
    }));

    // Create container group for zoom/pan
    const g = svg.append('g');

    // Setup zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Arrow marker for edges
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', NODE_RADIUS + 10)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', COLORS.default);

    svg.append('defs').append('marker')
      .attr('id', 'arrow-critical')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', NODE_RADIUS + 10)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', COLORS.critical);

    // Create force simulation
    const simulation = d3.forceSimulation<SimNode>(simNodes)
      .force('link', d3.forceLink<SimNode, SimLink>(simLinks)
        .id(d => d.id)
        .distance(120))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(NODE_RADIUS + 10));

    // Draw links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(simLinks)
      .enter()
      .append('line')
      .attr('stroke', d => d.isCritical ? COLORS.critical : COLORS.default)
      .attr('stroke-width', d => d.isCritical ? 3 : 2)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', d => d.isCritical ? 'url(#arrow-critical)' : 'url(#arrow)');

    // Draw nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(simNodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, SimNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x ?? null;
          d.fy = d.y ?? null;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
          // Save positions
          const positions: Record<string, { x: number; y: number }> = {};
          simNodes.forEach((n: SimNode) => {
            if (n.x !== undefined && n.y !== undefined) {
              positions[n.id] = { x: n.x, y: n.y };
            }
          });
          savePositions(positions);
        }));

    // Check if node is in critical path
    const criticalSet = new Set(criticalPath);

    // Check if node is in a cycle
    const cycleNodeIds = new Set(cycles.flat());

    // Node circles
    node.append('circle')
      .attr('r', NODE_RADIUS)
      .attr('fill', d => COLORS[d.type])
      .attr('stroke', d => {
        if (d.id === selectedNodeId) return '#FFFFFF';
        if (d.id === addingDependencyFromId) return '#FBBF24';
        if (cycleNodeIds.has(d.id)) return COLORS.critical;
        if (criticalSet.has(d.id)) return COLORS.critical;
        return 'transparent';
      })
      .attr('stroke-width', d => {
        if (d.id === selectedNodeId || d.id === addingDependencyFromId) return 4;
        if (cycleNodeIds.has(d.id) || criticalSet.has(d.id)) return 3;
        return 0;
      });

    // Node labels
    node.append('text')
      .text(d => d.title.substring(0, 15) + (d.title.length > 15 ? '...' : ''))
      .attr('text-anchor', 'middle')
      .attr('dy', NODE_RADIUS + 15)
      .attr('fill', '#E5E5E7')
      .attr('font-size', '12px')
      .style('pointer-events', 'none');

    // Type icon/letter in circle
    node.append('text')
      .text(d => d.type.charAt(0).toUpperCase())
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .attr('fill', '#1A1A2E')
      .attr('font-size', '16px')
      .attr('font-weight', 'bold')
      .style('pointer-events', 'none');

    // Create tooltip div
    const tooltip = d3.select('body').append('div')
      .attr('class', 'dependency-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', '#252542')
      .style('border', '1px solid #3D3D5C')
      .style('border-radius', '8px')
      .style('padding', '12px')
      .style('font-size', '12px')
      .style('color', '#F5F5F7')
      .style('pointer-events', 'none')
      .style('z-index', '1000')
      .style('max-width', '250px')
      .style('box-shadow', '0 4px 6px -1px rgba(0, 0, 0, 0.3)');

    // Hover handlers for tooltip
    node.on('mouseenter', (event, d) => {
      const statusColor = STATUS_COLORS[d.status] || STATUS_COLORS.draft;
      tooltip.html(`
        <div style="margin-bottom: 8px;">
          <strong style="font-size: 14px;">${d.title}</strong>
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 4px;">
          <span style="color: ${COLORS[d.type]}; text-transform: capitalize;">${d.type}</span>
          <span style="color: ${statusColor};">${d.status.replace(/_/g, ' ')}</span>
        </div>
        ${d.sizeEstimate ? `<div style="color: #9999A5;">Size: ${d.sizeEstimate}</div>` : ''}
        ${criticalSet.has(d.id) ? '<div style="color: #F87171; margin-top: 4px;">On critical path</div>' : ''}
        ${cycleNodeIds.has(d.id) ? '<div style="color: #F87171; margin-top: 4px;">Part of circular dependency</div>' : ''}
      `)
        .style('visibility', 'visible')
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    })
    .on('mousemove', (event) => {
      tooltip
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    })
    .on('mouseleave', () => {
      tooltip.style('visibility', 'hidden');
    });

    // Click handler
    node.on('click', (event, d) => {
      event.stopPropagation();
      tooltip.style('visibility', 'hidden');
      if (addingDependencyFromId && addingDependencyFromId !== d.id) {
        // Adding dependency mode - this node is the target
        onAddDependency?.(addingDependencyFromId, d.id);
      } else {
        onNodeClick?.(d);
      }
    });

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as SimNode).x!)
        .attr('y1', d => (d.source as SimNode).y!)
        .attr('x2', d => (d.target as SimNode).x!)
        .attr('y2', d => (d.target as SimNode).y!);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Initial zoom to fit
    svg.call(zoom.transform, d3.zoomIdentity);

    return () => {
      simulation.stop();
      // Clean up tooltip div
      d3.select('body').selectAll('.dependency-tooltip').remove();
    };
  }, [filteredNodes, filteredEdges, criticalPath, cycles, dimensions, selectedNodeId, addingDependencyFromId, onNodeClick, onAddDependency, loadPositions, savePositions]);

  return (
    <div ref={containerRef} className="w-full h-full bg-toucan-dark rounded-lg overflow-hidden">
      {filteredNodes.length === 0 ? (
        <div className="flex items-center justify-center h-full text-toucan-grey-400">
          No work items to display
        </div>
      ) : (
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-full"
        />
      )}
    </div>
  );
}
