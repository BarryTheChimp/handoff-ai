import { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { RefreshCw, Download } from 'lucide-react';
import { clsx } from 'clsx';
import { Spinner } from '../atoms/Spinner';

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface Entity {
  id: string;
  name: string;
  type: 'user' | 'system' | 'data' | 'process' | 'external' | 'component';
  description?: string;
  mentions: number;
  workItemIds: string[];
}

interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'depends_on' | 'interacts_with' | 'creates' | 'reads' | 'updates' | 'triggers';
  strength: number;
}

interface RelationshipMapData {
  entities: Entity[];
  relationships: Relationship[];
  clusters: Array<{
    id: string;
    name: string;
    entityIds: string[];
  }>;
}

interface RelationshipMapProps {
  specId: string;
  onEntityClick?: (entity: Entity) => void;
  className?: string;
}

const ENTITY_COLORS: Record<Entity['type'], string> = {
  user: '#60A5FA',
  system: '#10B981',
  data: '#FBBF24',
  process: '#F43F5E',
  external: '#8B5CF6',
  component: '#FF6B35',
};

const RELATIONSHIP_COLORS: Record<Relationship['type'], string> = {
  depends_on: '#F87171',
  interacts_with: '#60A5FA',
  creates: '#10B981',
  reads: '#FBBF24',
  updates: '#F59E0B',
  triggers: '#8B5CF6',
};

export function RelationshipMap({ specId, onEntityClick, className }: RelationshipMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<RelationshipMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [zoom, setZoom] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE}/specs/${specId}/relationships`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to load relationship map');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [specId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 500;

    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Create simulation nodes and links
    type SimNode = d3.SimulationNodeDatum & Entity;
    type SimLink = d3.SimulationLinkDatum<SimNode> & Relationship;

    const nodes: SimNode[] = data.entities.map((e) => ({ ...e }));
    const links: SimLink[] = data.relationships.map((r) => ({
      ...r,
      source: r.sourceId,
      target: r.targetId,
    }));

    // Create force simulation
    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(100)
          .strength((d) => d.strength * 0.5)
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50));

    // Draw links
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', (d) => RELATIONSHIP_COLORS[d.type])
      .attr('stroke-width', (d) => 1 + d.strength * 2)
      .attr('stroke-opacity', 0.6)
      .attr('stroke-dasharray', (d) => (d.type === 'depends_on' ? '5,5' : 'none'));

    // Draw nodes
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(
        d3
          .drag<SVGGElement, SimNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Node circles
    node
      .append('circle')
      .attr('r', (d) => 15 + Math.min(d.mentions * 2, 15))
      .attr('fill', (d) => ENTITY_COLORS[d.type])
      .attr('stroke', '#1A1A2E')
      .attr('stroke-width', 2);

    // Node labels
    node
      .append('text')
      .text((d) => d.name)
      .attr('x', 0)
      .attr('y', (d) => 25 + Math.min(d.mentions * 2, 15))
      .attr('text-anchor', 'middle')
      .attr('fill', '#F5F5F7')
      .attr('font-size', '12px');

    // Click handler
    node.on('click', (_event, d) => {
      setSelectedEntity(d);
      if (onEntityClick) onEntityClick(d);
    });

    // Hover effects
    node
      .on('mouseenter', function () {
        d3.select(this).select('circle').attr('stroke', '#FF6B35').attr('stroke-width', 3);
      })
      .on('mouseleave', function () {
        d3.select(this).select('circle').attr('stroke', '#1A1A2E').attr('stroke-width', 2);
      });

    // Tick function
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as SimNode).x!)
        .attr('y1', (d) => (d.source as SimNode).y!)
        .attr('x2', (d) => (d.target as SimNode).x!)
        .attr('y2', (d) => (d.target as SimNode).y!);

      node.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

    // Zoom behavior
    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoom(event.transform.k);
      });

    svg.call(zoomBehavior);

    return () => {
      simulation.stop();
    };
  }, [data, onEntityClick]);

  const handleRefresh = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`${API_BASE}/specs/${specId}/relationships/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err) {
      setError('Failed to refresh map');
    }
  };

  const handleExportPNG = async () => {
    if (!svgRef.current || !containerRef.current) return;

    try {
      // Get SVG content
      const svg = svgRef.current;
      const svgData = new XMLSerializer().serializeToString(svg);

      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      canvas.width = containerRef.current.clientWidth * 2; // 2x for retina
      canvas.height = containerRef.current.clientHeight * 2;
      ctx.scale(2, 2);

      // Draw dark background
      ctx.fillStyle = '#1A1A2E';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create image from SVG
      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        ctx.drawImage(img, 0, 0, containerRef.current!.clientWidth, containerRef.current!.clientHeight);
        URL.revokeObjectURL(url);

        // Download
        const link = document.createElement('a');
        link.download = `relationship-map-${specId}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };

      img.src = url;
    } catch (err) {
      console.error('Failed to export PNG:', err);
    }
  };

  if (loading) {
    return (
      <div className={clsx('flex items-center justify-center h-96', className)}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={clsx('flex items-center justify-center h-96', className)}>
        <div className="text-center">
          <p className="text-toucan-error mb-2">{error}</p>
          <button onClick={fetchData} className="text-sm text-toucan-orange hover:underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('relative', className)}>
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={handleExportPNG}
          className="p-2 bg-toucan-dark-lighter border border-toucan-dark-border rounded-md text-toucan-grey-400 hover:text-toucan-grey-200"
          title="Export as PNG"
        >
          <Download size={16} />
        </button>
        <button
          onClick={handleRefresh}
          className="p-2 bg-toucan-dark-lighter border border-toucan-dark-border rounded-md text-toucan-grey-400 hover:text-toucan-grey-200"
          title="Refresh map"
        >
          <RefreshCw size={16} />
        </button>
        <div className="px-2 py-1 bg-toucan-dark-lighter border border-toucan-dark-border rounded-md text-xs text-toucan-grey-400">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 p-3 bg-toucan-dark-lighter/90 border border-toucan-dark-border rounded-lg">
        <p className="text-xs font-medium text-toucan-grey-400 mb-2">Entity Types</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(ENTITY_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-toucan-grey-300 capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG Container */}
      <div ref={containerRef} className="w-full h-[500px] bg-toucan-dark rounded-lg overflow-hidden">
        <svg ref={svgRef} className="w-full h-full" />
      </div>

      {/* Selected Entity Details */}
      {selectedEntity && (
        <div className="absolute top-4 left-4 z-10 w-64 p-4 bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: ENTITY_COLORS[selectedEntity.type] }}
            />
            <h3 className="font-medium text-toucan-grey-100">{selectedEntity.name}</h3>
          </div>
          <p className="text-xs text-toucan-grey-500 uppercase mb-2">{selectedEntity.type}</p>
          {selectedEntity.description && (
            <p className="text-sm text-toucan-grey-300 mb-2">{selectedEntity.description}</p>
          )}
          <p className="text-xs text-toucan-grey-500">
            Mentioned in {selectedEntity.mentions} work item{selectedEntity.mentions !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
