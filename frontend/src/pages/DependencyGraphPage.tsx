import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Filter, Download, RefreshCw } from 'lucide-react';
import { Button } from '../components/atoms/Button';
import { Spinner } from '../components/atoms/Spinner';
import { Badge } from '../components/atoms/Badge';
import { DependencyGraph } from '../components/organisms/DependencyGraph';
import { NodeDetailPanel } from '../components/organisms/NodeDetailPanel';
import {
  dependenciesApi,
  specsApi,
  type DependencyNode,
  type DependencyGraph as DependencyGraphType,
} from '../services/api';
import type { Spec } from '../types/workItem';

type FilterType = 'all' | 'epic' | 'feature' | 'story';

export function DependencyGraphPage() {
  const { specId } = useParams<{ specId: string }>();
  const navigate = useNavigate();

  const [spec, setSpec] = useState<Spec | null>(null);
  const [graph, setGraph] = useState<DependencyGraphType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedNode, setSelectedNode] = useState<DependencyNode | null>(null);
  const [addingDependencyFromId, setAddingDependencyFromId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [actionError, setActionError] = useState<string | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    if (!specId) return;

    setLoading(true);
    setError(null);

    try {
      const [specData, graphData] = await Promise.all([
        specsApi.get(specId),
        dependenciesApi.getGraph(specId),
      ]);
      setSpec(specData);
      setGraph(graphData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [specId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle node click
  const handleNodeClick = (node: DependencyNode) => {
    if (addingDependencyFromId) {
      // If we're adding a dependency and click the same node, cancel
      if (addingDependencyFromId === node.id) {
        setAddingDependencyFromId(null);
      }
      // Otherwise handleAddDependency will be called from the graph
    } else {
      setSelectedNode(node);
    }
  };

  // Handle add dependency
  const handleAddDependency = async (fromId: string, toId: string) => {
    setActionError(null);
    try {
      await dependenciesApi.addDependency(fromId, toId);
      setAddingDependencyFromId(null);
      // Refresh graph
      if (specId) {
        const graphData = await dependenciesApi.getGraph(specId);
        setGraph(graphData);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to add dependency');
    }
  };

  // Handle remove dependency
  const handleRemoveDependency = async (dependsOnId: string) => {
    if (!selectedNode) return;

    setActionError(null);
    try {
      await dependenciesApi.removeDependency(selectedNode.id, dependsOnId);
      // Refresh graph
      if (specId) {
        const graphData = await dependenciesApi.getGraph(specId);
        setGraph(graphData);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to remove dependency');
    }
  };

  // Start adding dependency mode
  const handleStartAddDependency = () => {
    if (selectedNode) {
      setAddingDependencyFromId(selectedNode.id);
    }
  };

  // Export graph as PNG
  const handleExport = () => {
    const svg = document.querySelector('.dependency-graph svg');
    if (!svg) return;

    // Convert SVG to canvas and download
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 1920;
    canvas.height = 1080;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = '#1A1A2E';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        const link = document.createElement('a');
        link.download = `${spec?.name || 'dependencies'}-graph.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-toucan-dark flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-toucan-dark flex items-center justify-center">
        <div className="text-center">
          <p className="text-toucan-error mb-4">{error}</p>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-toucan-dark flex flex-col">
      {/* Header */}
      <header className="bg-toucan-dark-lighter border-b border-toucan-dark-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={`/review/${specId}`}
              className="text-toucan-grey-400 hover:text-toucan-grey-100"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-toucan-grey-100">
                Dependency Graph
              </h1>
              {spec && (
                <p className="text-sm text-toucan-grey-400">{spec.name}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter */}
            <div className="flex items-center gap-2 bg-toucan-dark rounded-lg px-3 py-1.5">
              <Filter size={16} className="text-toucan-grey-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="bg-transparent text-toucan-grey-100 text-sm focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="epic">Epics Only</option>
                <option value="feature">Features Only</option>
                <option value="story">Stories Only</option>
              </select>
            </div>

            <Button variant="ghost" onClick={loadData}>
              <RefreshCw size={16} />
            </Button>

            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} className="mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Legend and Warnings */}
        <div className="flex items-center justify-between mt-4">
          {/* Legend */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-toucan-grey-400">Legend:</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#60A5FA]" />
              <span className="text-toucan-grey-200">Epic</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#4ADE80]" />
              <span className="text-toucan-grey-200">Feature</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-toucan-orange" />
              <span className="text-toucan-grey-200">Story</span>
            </div>
            <div className="flex items-center gap-1 ml-4">
              <span className="w-6 h-0.5 bg-toucan-error" />
              <span className="text-toucan-grey-200">Critical Path</span>
            </div>
          </div>

          {/* Cycle Warning */}
          {graph && graph.cycles.length > 0 && (
            <div className="flex items-center gap-2 bg-toucan-error/20 border border-toucan-error text-toucan-error px-3 py-1.5 rounded-lg text-sm">
              <AlertTriangle size={16} />
              <span>
                {graph.cycles.length} circular dependency{graph.cycles.length > 1 ? 'ies' : ''} detected
              </span>
            </div>
          )}
        </div>

        {/* Adding dependency mode banner */}
        {addingDependencyFromId && (
          <div className="mt-4 bg-toucan-warning/20 border border-toucan-warning text-toucan-warning px-4 py-2 rounded-lg text-sm flex items-center justify-between">
            <span>
              Click on a node to add it as a dependency for{' '}
              <strong>
                {graph?.nodes.find(n => n.id === addingDependencyFromId)?.title}
              </strong>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAddingDependencyFromId(null)}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Action error */}
        {actionError && (
          <div className="mt-4 bg-toucan-error/20 border border-toucan-error text-toucan-error px-4 py-2 rounded-lg text-sm flex items-center justify-between">
            <span>{actionError}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActionError(null)}
            >
              Dismiss
            </Button>
          </div>
        )}
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph */}
        <div className="flex-1 dependency-graph">
          {graph && (
            <DependencyGraph
              nodes={graph.nodes}
              edges={graph.edges}
              criticalPath={graph.criticalPath}
              cycles={graph.cycles}
              onNodeClick={handleNodeClick}
              onAddDependency={handleAddDependency}
              selectedNodeId={selectedNode?.id ?? null}
              addingDependencyFromId={addingDependencyFromId}
              filterType={filterType}
            />
          )}
        </div>

        {/* Detail panel */}
        {selectedNode && graph && (
          <NodeDetailPanel
            node={selectedNode}
            allNodes={graph.nodes}
            edges={graph.edges}
            onClose={() => setSelectedNode(null)}
            onAddDependency={handleStartAddDependency}
            onRemoveDependency={handleRemoveDependency}
            onOpenEditor={() => navigate(`/review/${specId}?item=${selectedNode.id}`)}
            isAddingDependency={addingDependencyFromId === selectedNode.id}
          />
        )}
      </div>

      {/* Stats bar */}
      {graph && (
        <div className="bg-toucan-dark-lighter border-t border-toucan-dark-border px-6 py-3 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-toucan-grey-400">Nodes:</span>
            <Badge variant="default">{graph.nodes.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-toucan-grey-400">Dependencies:</span>
            <Badge variant="default">{graph.edges.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-toucan-grey-400">Critical Path:</span>
            <Badge variant={graph.criticalPath.length > 0 ? 'error' : 'default'}>
              {graph.criticalPath.length} items
            </Badge>
          </div>
          {graph.cycles.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-toucan-grey-400">Cycles:</span>
              <Badge variant="error">{graph.cycles.length}</Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
