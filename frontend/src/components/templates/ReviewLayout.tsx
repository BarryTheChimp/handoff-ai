import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { clsx } from 'clsx';
import {
  ArrowLeft,
  FileText,
  Edit3,
  Download,
  Plus,
  Expand,
  Minimize2,
  Undo2,
  Redo2,
  GitBranch,
  Wand2,
  PieChart,
  Lightbulb,
  Command,
} from 'lucide-react';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { DraggableWorkBreakdownTree } from '../organisms/DraggableWorkBreakdownTree';
import { StoryEditor } from '../organisms/StoryEditor';
import { BatchEstimateModal } from '../organisms/BatchEstimateModal';
import { WorkItemFilters, WorkItemFilterState, DEFAULT_FILTERS } from '../molecules/WorkItemFilters';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { useTreeStore } from '../../stores/treeStore';
import type { Spec, WorkItem } from '../../types/workItem';

interface ReviewLayoutProps {
  spec: Spec;
  onBack: () => void;
  onExport: () => void;
  children?: React.ReactNode;
}

type TabType = 'editor' | 'spec';

// Load/save layout preferences
const LAYOUT_KEY = 'handoff_review_layout';

function loadLayoutPrefs(): { sizes: number[]; tab: TabType } {
  try {
    const saved = localStorage.getItem(LAYOUT_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore parse errors
  }
  return { sizes: [30, 70], tab: 'editor' };
}

function saveLayoutPrefs(prefs: { sizes: number[]; tab: TabType }) {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(prefs));
}

// Status to variant mapping
const specStatusVariants: Record<Spec['status'], 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  uploaded: 'default',
  extracting: 'warning',
  ready: 'info',
  translating: 'warning',
  translated: 'success',
  error: 'error',
};

export function ReviewLayout({ spec, onBack, onExport }: ReviewLayoutProps) {
  const [activeTab, setActiveTab] = useState<TabType>(() => loadLayoutPrefs().tab);
  const [sizes, setSizes] = useState<number[]>(() => loadLayoutPrefs().sizes);
  const [treeCollapsed, setTreeCollapsed] = useState(false);
  const [showBatchEstimate, setShowBatchEstimate] = useState(false);
  const [filters, setFilters] = useState<WorkItemFilterState>(DEFAULT_FILTERS);

  // Get work items for estimation stats
  const items = useTreeStore((state) => state.items);
  const setFilteredItems = useTreeStore((state) => state.setFilteredItems);
  const stories = items.filter((item: WorkItem) => item.type === 'story');
  const storiesWithEstimates = stories.filter((item: WorkItem) => item.sizeEstimate);

  // Filter items based on current filters
  const filteredIds = useMemo(() => {
    if (
      !filters.search &&
      filters.types.length === 0 &&
      filters.statuses.length === 0 &&
      filters.sizes.length === 0 &&
      filters.hasEstimate === 'all'
    ) {
      return null; // No filtering
    }

    const matchingIds = new Set<string>();
    const searchLower = filters.search.toLowerCase();

    items.forEach(item => {
      let matches = true;

      // Search filter
      if (filters.search) {
        matches = matches && (
          item.title.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower) ||
          false
        );
      }

      // Type filter
      if (filters.types.length > 0) {
        matches = matches && filters.types.includes(item.type);
      }

      // Status filter
      if (filters.statuses.length > 0) {
        matches = matches && filters.statuses.includes(item.status);
      }

      // Size filter
      if (filters.sizes.length > 0) {
        matches = matches && (item.sizeEstimate ? filters.sizes.includes(item.sizeEstimate) : false);
      }

      // Estimate filter
      if (filters.hasEstimate === 'estimated') {
        matches = matches && !!item.sizeEstimate;
      } else if (filters.hasEstimate === 'unestimated') {
        matches = matches && !item.sizeEstimate;
      }

      if (matches) {
        matchingIds.add(item.id);
        // Also add parent chain to show hierarchy
        let current = item;
        while (current.parentId) {
          matchingIds.add(current.parentId);
          const parent = items.find(i => i.id === current.parentId);
          if (parent) {
            current = parent;
          } else {
            break;
          }
        }
      }
    });

    return matchingIds;
  }, [items, filters]);

  // Update store with filtered items
  useEffect(() => {
    setFilteredItems(filteredIds);
  }, [filteredIds, setFilteredItems]);

  // Undo/Redo functionality
  const handleRefresh = useCallback(() => {
    // Trigger a refresh of work items - emit a custom event
    window.dispatchEvent(new CustomEvent('workitems:refresh'));
  }, []);

  const {
    undo,
    redo,
    canUndo,
    canRedo,
    undoDescription,
    redoDescription,
    isUndoing,
    isRedoing,
  } = useUndoRedo({
    onRefresh: handleRefresh,
    enableKeyboardShortcuts: true,
  });

  // Save layout changes
  useEffect(() => {
    saveLayoutPrefs({ sizes, tab: activeTab });
  }, [sizes, activeTab]);

  const handleSizeChange = (newSizes: number[]) => {
    setSizes(newSizes);
  };

  return (
    <div className="flex flex-col h-screen bg-toucan-dark">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-toucan-dark-border bg-toucan-dark-lighter">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} leftIcon={<ArrowLeft size={16} />}>
            Back
          </Button>

          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-toucan-grey-100">{spec.name}</h1>
            <Badge variant={specStatusVariants[spec.status]}>
              {spec.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo buttons */}
          <div className="flex items-center gap-1 mr-2 border-r border-toucan-dark-border pr-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void undo()}
              disabled={!canUndo || isUndoing}
              title={undoDescription ? `Undo: ${undoDescription}` : 'Nothing to undo (Ctrl+Z)'}
            >
              <Undo2 size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void redo()}
              disabled={!canRedo || isRedoing}
              title={redoDescription ? `Redo: ${redoDescription}` : 'Nothing to redo (Ctrl+Y)'}
            >
              <Redo2 size={16} />
            </Button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowBatchEstimate(true)}
            leftIcon={<Wand2 size={16} />}
            disabled={spec.status !== 'translated' || stories.length === 0}
          >
            Estimate All
          </Button>

          <Link to={`/dependencies/${spec.id}`}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<GitBranch size={16} />}
              disabled={spec.status !== 'translated'}
            >
              Dependencies
            </Button>
          </Link>

          <Link to={`/coverage/${spec.id}`}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<PieChart size={16} />}
              disabled={spec.status !== 'translated'}
            >
              Coverage
            </Button>
          </Link>

          <Link to={`/preferences/${spec.projectId}`}>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Lightbulb size={16} />}
            >
              Preferences
            </Button>
          </Link>

          <Button
            variant="primary"
            size="sm"
            onClick={onExport}
            leftIcon={<Download size={16} />}
            disabled={spec.status !== 'translated'}
          >
            Export to Jira
          </Button>
        </div>
      </header>

      {/* Main content with split pane */}
      <div className="flex-1 overflow-hidden">
        <Allotment
          defaultSizes={sizes}
          onChange={handleSizeChange}
          minSize={200}
        >
          {/* Left pane - Tree */}
          <Allotment.Pane minSize={200} preferredSize={sizes[0] ?? 300}>
            <div className="flex flex-col h-full bg-toucan-dark">
              {/* Tree header */}
              <div className="px-3 py-2 border-b border-toucan-dark-border space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-toucan-grey-200">Work Items</h2>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTreeCollapsed(!treeCollapsed)}
                      title={treeCollapsed ? 'Expand all' : 'Collapse all'}
                    >
                      {treeCollapsed ? <Expand size={14} /> : <Minimize2 size={14} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Plus size={14} />}
                      title="Add story"
                    >
                      Add
                    </Button>
                  </div>
                </div>
                <WorkItemFilters filters={filters} onChange={setFilters} />
                <div className="flex items-center justify-between text-xs text-toucan-grey-500">
                  <span>
                    {filteredIds ? `${filteredIds.size} of ${items.length}` : `${items.length}`} items
                  </span>
                  <span className="flex items-center gap-1 text-toucan-grey-600">
                    <Command size={10} />K to search
                  </span>
                </div>
              </div>

              {/* Tree content */}
              <DraggableWorkBreakdownTree className="flex-1" />
            </div>
          </Allotment.Pane>

          {/* Right pane - Editor/Spec viewer */}
          <Allotment.Pane minSize={400} preferredSize={sizes[1] ?? 700}>
            <div className="flex flex-col h-full bg-toucan-dark-lighter">
              {/* Tabs */}
              <div className="flex border-b border-toucan-dark-border">
                <button
                  onClick={() => setActiveTab('editor')}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                    'border-b-2 -mb-px',
                    activeTab === 'editor'
                      ? 'text-toucan-orange border-toucan-orange'
                      : 'text-toucan-grey-400 border-transparent hover:text-toucan-grey-200'
                  )}
                >
                  <Edit3 size={16} />
                  Editor
                </button>
                <button
                  onClick={() => setActiveTab('spec')}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                    'border-b-2 -mb-px',
                    activeTab === 'spec'
                      ? 'text-toucan-orange border-toucan-orange'
                      : 'text-toucan-grey-400 border-transparent hover:text-toucan-grey-200'
                  )}
                >
                  <FileText size={16} />
                  Source Spec
                </button>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-hidden">
                {activeTab === 'editor' ? (
                  <StoryEditor className="h-full" projectId={spec.projectId} />
                ) : (
                  <SpecViewer spec={spec} />
                )}
              </div>
            </div>
          </Allotment.Pane>
        </Allotment>
      </div>

      {/* Footer */}
      <footer className="flex items-center justify-between px-4 py-2 border-t border-toucan-dark-border bg-toucan-dark-lighter">
        <div className="text-sm text-toucan-grey-400">
          {spec.fileType.toUpperCase()} • {(spec.fileSize / 1024).toFixed(1)} KB
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" leftIcon={<Plus size={14} />}>
            Add Story
          </Button>
          <Button variant="secondary" size="sm">
            Save All
          </Button>
        </div>
      </footer>

      {/* Batch Estimate Modal */}
      <BatchEstimateModal
        isOpen={showBatchEstimate}
        onClose={() => setShowBatchEstimate(false)}
        specId={spec.id}
        existingEstimatesCount={storiesWithEstimates.length}
        totalStoriesCount={stories.length}
        onComplete={() => {
          // Refresh work items to get updated estimates
          handleRefresh();
        }}
      />
    </div>
  );
}

// Spec Viewer component (simplified for now)
interface SpecViewerProps {
  spec: Spec;
}

function SpecViewer({ spec }: SpecViewerProps) {
  if (!spec.extractedText) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-toucan-grey-400 mb-2">No content extracted</p>
        <p className="text-sm text-toucan-grey-600">
          Extract the spec first to view its content
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <pre className="text-sm text-toucan-grey-200 whitespace-pre-wrap font-mono">
        {spec.extractedText}
      </pre>
    </div>
  );
}
