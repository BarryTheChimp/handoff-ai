import { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { RotateCcw, Download } from 'lucide-react';
import { clsx } from 'clsx';
import { Spinner } from '../atoms/Spinner';

type WorkItemType = 'epic' | 'feature' | 'story';
type WorkItemStatus = 'draft' | 'ready_for_review' | 'approved' | 'exported';

interface TreeNode {
  id: string;
  name: string;
  type: WorkItemType;
  status: WorkItemStatus;
  value: number;
  effort?: number;
  children: TreeNode[];
}

interface WorkBreakdownData {
  projectId: string;
  root: TreeNode;
  summary: {
    totalEpics: number;
    totalFeatures: number;
    totalStories: number;
    statusCounts: Record<WorkItemStatus, number>;
    sizeDistribution: Record<string, number>;
  };
}

interface WorkBreakdownTreemapProps {
  projectId?: string | undefined;
  specId?: string | undefined;
  onNodeClick?: (node: TreeNode) => void;
  className?: string;
}

const STATUS_COLORS: Record<WorkItemStatus, string> = {
  draft: '#6B7280',
  ready_for_review: '#F59E0B',
  approved: '#10B981',
  exported: '#3B82F6',
};

const TYPE_OPACITY: Record<WorkItemType, number> = {
  epic: 1,
  feature: 0.8,
  story: 0.6,
};

export function WorkBreakdownTreemap({
  projectId,
  specId,
  onNodeClick,
  className,
}: WorkBreakdownTreemapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<WorkBreakdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<TreeNode[]>([]);
  const [currentRoot, setCurrentRoot] = useState<TreeNode | null>(null);
  const [sizeBy, setSizeBy] = useState<'count' | 'effort'>('count');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const url = specId
        ? `/api/specs/${specId}/work-breakdown`
        : `/api/projects/${projectId}/work-breakdown`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to load work breakdown');
      }

      const result = await response.json();
      setData(result.data);
      setCurrentRoot(result.data.root);
      setBreadcrumbs([result.data.root]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [projectId, specId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!currentRoot || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 400;

    svg.selectAll('*').remove();

    // Create hierarchy
    const hierarchy = d3
      .hierarchy(currentRoot)
      .sum((d) => (sizeBy === 'effort' ? d.effort || 1 : d.value || 1))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // Create treemap layout
    const treemap = d3
      .treemap<TreeNode>()
      .size([width, height])
      .paddingOuter(3)
      .paddingTop(20)
      .paddingInner(2)
      .round(true);

    const root = treemap(hierarchy);

    // Create groups for each cell
    const cell = svg
      .selectAll('g')
      .data(root.leaves())
      .enter()
      .append('g')
      .attr('transform', (d) => `translate(${d.x0},${d.y0})`);

    // Add rectangles
    cell
      .append('rect')
      .attr('width', (d) => Math.max(0, d.x1 - d.x0))
      .attr('height', (d) => Math.max(0, d.y1 - d.y0))
      .attr('fill', (d) => STATUS_COLORS[d.data.status])
      .attr('fill-opacity', (d) => TYPE_OPACITY[d.data.type])
      .attr('stroke', '#1A1A2E')
      .attr('stroke-width', 1)
      .attr('rx', 4)
      .style('cursor', 'pointer')
      .on('mouseenter', function () {
        d3.select(this).attr('stroke', '#FF6B35').attr('stroke-width', 2);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('stroke', '#1A1A2E').attr('stroke-width', 1);
      })
      .on('click', (_event, d) => {
        if (d.data.children && d.data.children.length > 0) {
          drillDown(d.data);
        } else if (onNodeClick) {
          onNodeClick(d.data);
        }
      });

    // Add text labels
    cell
      .append('text')
      .attr('x', 4)
      .attr('y', 14)
      .text((d) => {
        const width = d.x1 - d.x0;
        if (width < 40) return '';
        const maxChars = Math.floor(width / 7);
        return d.data.name.length > maxChars
          ? d.data.name.substring(0, maxChars - 2) + '...'
          : d.data.name;
      })
      .attr('fill', 'white')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .style('pointer-events', 'none');

    // Add value labels
    cell
      .append('text')
      .attr('x', 4)
      .attr('y', (d) => Math.min(d.y1 - d.y0 - 4, 28))
      .text((d) => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        if (width < 30 || height < 35) return '';
        return `${d.data.value} ${d.data.value === 1 ? 'story' : 'stories'}`;
      })
      .attr('fill', 'rgba(255,255,255,0.7)')
      .attr('font-size', '10px')
      .style('pointer-events', 'none');

    // Add parent groups for non-leaves
    const parents = svg
      .selectAll('.parent')
      .data(root.descendants().filter((d) => d.depth === 1))
      .enter()
      .append('g')
      .attr('class', 'parent')
      .attr('transform', (d) => `translate(${d.x0},${d.y0})`);

    parents
      .append('rect')
      .attr('width', (d) => Math.max(0, d.x1 - d.x0))
      .attr('height', 18)
      .attr('fill', '#252542')
      .attr('fill-opacity', 0.9);

    parents
      .append('text')
      .attr('x', 4)
      .attr('y', 13)
      .text((d) => d.data.name)
      .attr('fill', '#F5F5F7')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .style('pointer-events', 'none');
  }, [currentRoot, sizeBy, onNodeClick]);

  const drillDown = (node: TreeNode) => {
    setCurrentRoot(node);
    setBreadcrumbs((prev) => [...prev, node]);
  };

  const navigateTo = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    const lastNode = newBreadcrumbs[newBreadcrumbs.length - 1];
    if (lastNode) {
      setCurrentRoot(lastNode);
    }
  };

  const resetView = () => {
    if (data) {
      setCurrentRoot(data.root);
      setBreadcrumbs([data.root]);
    }
  };

  const exportAsPng = async () => {
    if (!svgRef.current) return;

    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(containerRef.current!, {
        backgroundColor: '#1A1A2E',
      });
      const link = document.createElement('a');
      link.download = 'work-breakdown.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
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

  if (!data || !currentRoot) {
    return (
      <div className={clsx('flex items-center justify-center h-96', className)}>
        <p className="text-toucan-grey-500">No work items found</p>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-4">
          <div className="text-2xl font-bold text-toucan-grey-100">{data.summary.totalEpics}</div>
          <div className="text-sm text-toucan-grey-400">Epics</div>
        </div>
        <div className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-4">
          <div className="text-2xl font-bold text-toucan-grey-100">{data.summary.totalFeatures}</div>
          <div className="text-sm text-toucan-grey-400">Features</div>
        </div>
        <div className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-4">
          <div className="text-2xl font-bold text-toucan-grey-100">{data.summary.totalStories}</div>
          <div className="text-sm text-toucan-grey-400">Stories</div>
        </div>
        <div className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-4">
          <div className="text-2xl font-bold text-toucan-success">{data.summary.statusCounts.approved}</div>
          <div className="text-sm text-toucan-grey-400">Approved</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((node, index) => (
            <div key={node.id} className="flex items-center gap-2">
              {index > 0 && <span className="text-toucan-grey-600">/</span>}
              <button
                onClick={() => navigateTo(index)}
                className={clsx(
                  'hover:text-toucan-orange transition-colors',
                  index === breadcrumbs.length - 1 ? 'text-toucan-grey-100' : 'text-toucan-grey-400'
                )}
              >
                {node.name}
              </button>
            </div>
          ))}
        </nav>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 mr-4">
            <span className="text-xs text-toucan-grey-400">Size by:</span>
            <button
              onClick={() => setSizeBy('count')}
              className={clsx(
                'px-2 py-1 text-xs rounded',
                sizeBy === 'count'
                  ? 'bg-toucan-orange text-white'
                  : 'bg-toucan-dark-lighter text-toucan-grey-400'
              )}
            >
              Count
            </button>
            <button
              onClick={() => setSizeBy('effort')}
              className={clsx(
                'px-2 py-1 text-xs rounded',
                sizeBy === 'effort'
                  ? 'bg-toucan-orange text-white'
                  : 'bg-toucan-dark-lighter text-toucan-grey-400'
              )}
            >
              Effort
            </button>
          </div>

          <button
            onClick={resetView}
            className="p-2 bg-toucan-dark-lighter border border-toucan-dark-border rounded-md text-toucan-grey-400 hover:text-toucan-grey-200"
            title="Reset view"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={exportAsPng}
            className="p-2 bg-toucan-dark-lighter border border-toucan-dark-border rounded-md text-toucan-grey-400 hover:text-toucan-grey-200"
            title="Export as PNG"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs">
        <span className="text-toucan-grey-400">Status:</span>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
            <span className="text-toucan-grey-300 capitalize">{status.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      {/* Treemap */}
      <div
        ref={containerRef}
        className="w-full h-[500px] bg-toucan-dark rounded-lg overflow-hidden border border-toucan-dark-border"
      >
        <svg ref={svgRef} className="w-full h-full" />
      </div>
    </div>
  );
}
