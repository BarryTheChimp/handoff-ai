import { useEffect } from 'react';
import { clsx } from 'clsx';
import { Save, Loader2, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { EditableText } from '../molecules/EditableText';
import { MarkdownPreview } from '../molecules/MarkdownPreview';
import { SizeSelector } from '../molecules/SizeSelector';
import { StatusBadge, TypeBadge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import { useEditorStore } from '../../stores/editorStore';
import { useTreeStore } from '../../stores/treeStore';
import type { WorkItemStatus } from '../../types/workItem';

interface StoryEditorProps {
  className?: string;
}

const statusOptions: WorkItemStatus[] = ['draft', 'ready_for_review', 'approved', 'exported'];

export function StoryEditor({ className }: StoryEditorProps) {
  const selectedItem = useTreeStore((state) => state.getSelectedItem());
  const {
    currentItem,
    isDirty,
    isSaving,
    lastSaved,
    saveError,
    setCurrentItem,
    setField,
    save,
  } = useEditorStore();

  // Sync selected item to editor
  useEffect(() => {
    if (selectedItem?.id !== currentItem?.id) {
      setCurrentItem(selectedItem);
    }
  }, [selectedItem, currentItem?.id, setCurrentItem]);

  if (!currentItem) {
    return (
      <div className={clsx('flex flex-col items-center justify-center p-8 text-center', className)}>
        <p className="text-toucan-grey-400 mb-2">No item selected</p>
        <p className="text-sm text-toucan-grey-600">
          Select an item from the tree to view and edit its details
        </p>
      </div>
    );
  }

  return (
    <div className={clsx('flex flex-col h-full', className)}>
      {/* Header with save status */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-toucan-dark-border">
        <div className="flex items-center gap-3">
          <TypeBadge type={currentItem.type} size="md" />
          {currentItem.jiraKey && (
            <a
              href={`https://your-jira.atlassian.net/browse/${currentItem.jiraKey}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-toucan-info hover:underline"
            >
              {currentItem.jiraKey}
              <ExternalLink size={12} />
            </a>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Save status */}
          {saveError && (
            <span className="flex items-center gap-1 text-sm text-toucan-error">
              <AlertCircle size={14} />
              {saveError}
            </span>
          )}
          {isSaving && (
            <span className="flex items-center gap-1 text-sm text-toucan-grey-400">
              <Loader2 size={14} className="animate-spin" />
              Saving...
            </span>
          )}
          {!isSaving && !saveError && lastSaved && (
            <span className="flex items-center gap-1 text-sm text-toucan-success">
              <Check size={14} />
              Saved
            </span>
          )}
          {isDirty && !isSaving && (
            <span className="text-sm text-toucan-warning">Unsaved changes</span>
          )}

          {/* Manual save button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={save}
            disabled={!isDirty || isSaving}
            leftIcon={isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          >
            Save
          </Button>
        </div>
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-toucan-grey-200 mb-2">
            Title
          </label>
          <EditableText
            value={currentItem.title}
            onChange={(value) => setField('title', value)}
            placeholder="Enter title..."
            displayClassName="text-lg font-semibold"
          />
        </div>

        {/* Status and Size row */}
        <div className="flex gap-6">
          {/* Status */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-toucan-grey-200 mb-2">
              Status
            </label>
            <div className="flex gap-2">
              {statusOptions.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setField('status', status)}
                  className={clsx(
                    'px-3 py-2 rounded-md border transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-toucan-orange',
                    currentItem.status === status
                      ? 'border-toucan-orange bg-toucan-orange/20'
                      : 'border-toucan-dark-border hover:border-toucan-grey-600'
                  )}
                >
                  <StatusBadge status={status} size="md" />
                </button>
              ))}
            </div>
          </div>

          {/* Size (only for stories) */}
          {currentItem.type === 'story' && (
            <SizeSelector
              value={currentItem.sizeEstimate}
              onChange={(size) => setField('sizeEstimate', size)}
              label="Size Estimate"
            />
          )}
        </div>

        {/* Description */}
        <MarkdownPreview
          value={currentItem.description || ''}
          onChange={(value) => setField('description', value)}
          label="Description"
          placeholder="Add a description..."
        />

        {/* Acceptance Criteria (only for stories) */}
        {currentItem.type === 'story' && (
          <MarkdownPreview
            value={currentItem.acceptanceCriteria || ''}
            onChange={(value) => setField('acceptanceCriteria', value)}
            label="Acceptance Criteria"
            placeholder="Given... When... Then..."
          />
        )}

        {/* Technical Notes */}
        <MarkdownPreview
          value={currentItem.technicalNotes || ''}
          onChange={(value) => setField('technicalNotes', value)}
          label="Technical Notes"
          placeholder="Add implementation notes, API details, DB changes..."
        />

        {/* Source References */}
        {currentItem.sources && currentItem.sources.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-toucan-grey-200 mb-2">
              Source References
            </label>
            <div className="bg-toucan-dark rounded-md border border-toucan-dark-border p-3">
              <ul className="space-y-1.5">
                {currentItem.sources.map((source) => (
                  <li key={source.sectionId} className="flex items-center gap-2">
                    <span className="text-toucan-grey-400 text-sm font-mono">
                      [{source.section?.sectionRef || source.sectionId}]
                    </span>
                    <span className="text-toucan-grey-200 text-sm">
                      {source.section?.heading || 'Unknown section'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="pt-4 border-t border-toucan-dark-border">
          <p className="text-xs text-toucan-grey-600">
            Created: {new Date(currentItem.createdAt).toLocaleString()}
            {' | '}
            Updated: {new Date(currentItem.updatedAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
