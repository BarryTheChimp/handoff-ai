import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  FileText,
  FileJson,
  FileType,
  File,
  MoreVertical,
  Eye,
  Download,
  Trash2,
  Clock,
  Layers,
  BookOpen,
  ListTodo,
} from 'lucide-react';
import { Badge } from '../atoms/Badge';
import { Button } from '../atoms/Button';
import type { Spec } from '../../types/workItem';

interface SpecCardProps {
  spec: Spec;
  stats?: {
    epics: number;
    features: number;
    stories: number;
  } | undefined;
  onDelete: (spec: Spec) => void;
  onExport: (spec: Spec) => void;
}

// Status to variant mapping
const statusVariants: Record<Spec['status'], 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  uploaded: 'default',
  extracting: 'warning',
  ready: 'info',
  translating: 'warning',
  translated: 'success',
  error: 'error',
};

// File type to icon mapping
function getFileIcon(fileType: string) {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return FileText;
    case 'json':
    case 'yaml':
    case 'yml':
      return FileJson;
    case 'md':
    case 'markdown':
      return FileType;
    default:
      return File;
  }
}

// Format relative time
function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

export function SpecCard({ spec, stats, onDelete, onExport }: SpecCardProps) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const FileIcon = getFileIcon(spec.fileType);

  const handleView = () => {
    navigate(`/review/${spec.id}`);
  };

  const handleExport = () => {
    setShowMenu(false);
    onExport(spec);
  };

  const handleDelete = () => {
    setShowMenu(false);
    onDelete(spec);
  };

  const isProcessing = spec.status === 'extracting' || spec.status === 'translating';
  const canExport = spec.status === 'translated';

  return (
    <div
      className={clsx(
        'group relative bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-4',
        'hover:border-toucan-orange/50 transition-colors cursor-pointer'
      )}
      onClick={handleView}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-toucan-dark rounded-md">
            <FileIcon size={20} className="text-toucan-orange" />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-toucan-grey-100 truncate">{spec.name}</h3>
            <p className="text-xs text-toucan-grey-400 flex items-center gap-1 mt-0.5">
              <Clock size={12} />
              {formatRelativeTime(spec.uploadedAt)}
            </p>
          </div>
        </div>

        {/* Menu button */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical size={16} />
          </Button>

          {/* Dropdown menu */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }}
              />
              <div className="absolute right-0 top-full mt-1 w-40 bg-toucan-dark-lighter border border-toucan-dark-border rounded-md shadow-lg z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleView();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-toucan-grey-200 hover:bg-toucan-dark"
                >
                  <Eye size={14} />
                  View
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExport();
                  }}
                  disabled={!canExport}
                  className={clsx(
                    'flex items-center gap-2 w-full px-3 py-2 text-sm',
                    canExport
                      ? 'text-toucan-grey-200 hover:bg-toucan-dark'
                      : 'text-toucan-grey-600 cursor-not-allowed'
                  )}
                >
                  <Download size={14} />
                  Export
                </button>
                <div className="border-t border-toucan-dark-border" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-toucan-error hover:bg-toucan-dark"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status badge */}
      <div className="mb-3">
        <Badge variant={statusVariants[spec.status]} className={isProcessing ? 'animate-pulse' : ''}>
          {spec.status.replace('_', ' ')}
        </Badge>
      </div>

      {/* Stats */}
      {stats && spec.status === 'translated' && (
        <div className="flex items-center gap-4 text-xs text-toucan-grey-400">
          <span className="flex items-center gap-1" title="Epics">
            <Layers size={12} className="text-toucan-info" />
            {stats.epics}
          </span>
          <span className="flex items-center gap-1" title="Features">
            <BookOpen size={12} className="text-toucan-warning" />
            {stats.features}
          </span>
          <span className="flex items-center gap-1" title="Stories">
            <ListTodo size={12} className="text-toucan-success" />
            {stats.stories}
          </span>
        </div>
      )}

      {/* File info */}
      <div className="mt-3 pt-3 border-t border-toucan-dark-border flex items-center justify-between text-xs text-toucan-grey-500">
        <span>{spec.fileType.toUpperCase()}</span>
        <span>{(spec.fileSize / 1024).toFixed(1)} KB</span>
      </div>
    </div>
  );
}
