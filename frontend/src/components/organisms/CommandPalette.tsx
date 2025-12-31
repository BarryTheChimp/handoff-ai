import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  FileText,
  GitBranch,
  Settings,
  Home,
  FolderOpen,
  PieChart,
  Lightbulb,
  Command,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useTreeStore } from '../../stores/treeStore';
import type { WorkItem, WorkItemType } from '../../types/workItem';

interface CommandItem {
  id: string;
  type: 'work-item' | 'page' | 'action';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onSelect: () => void;
  keywords?: string[];
}

const TYPE_COLORS: Record<WorkItemType, string> = {
  epic: 'text-blue-400',
  feature: 'text-green-400',
  story: 'text-toucan-orange',
};

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const items = useTreeStore((state) => state.items);
  const setSelected = useTreeStore((state) => state.setSelected);

  // Build command list
  const commands = useMemo(() => {
    const result: CommandItem[] = [];

    // Navigation commands
    const navigationCommands: CommandItem[] = [
      {
        id: 'nav-dashboard',
        type: 'page',
        title: 'Go to Dashboard',
        icon: <Home size={16} />,
        onSelect: () => navigate('/dashboard'),
        keywords: ['home', 'main'],
      },
      {
        id: 'nav-projects',
        type: 'page',
        title: 'Go to Projects',
        icon: <FolderOpen size={16} />,
        onSelect: () => navigate('/projects'),
        keywords: ['list', 'all'],
      },
      {
        id: 'nav-settings',
        type: 'page',
        title: 'Go to Settings',
        icon: <Settings size={16} />,
        onSelect: () => navigate('/settings'),
        keywords: ['config', 'preferences'],
      },
    ];

    result.push(...navigationCommands);

    // Work items (only when viewing a spec)
    if (items.length > 0) {
      const workItemCommands = items.map((item): CommandItem => ({
        id: item.id,
        type: 'work-item',
        title: item.title,
        subtitle: `${item.type.charAt(0).toUpperCase() + item.type.slice(1)}${item.sizeEstimate ? ` • ${item.sizeEstimate}` : ''}`,
        icon: <FileText size={16} className={TYPE_COLORS[item.type]} />,
        onSelect: () => {
          setSelected(item.id);
          setIsOpen(false);
        },
        keywords: [item.type, item.status, item.sizeEstimate || ''].filter(Boolean),
      }));

      result.push(...workItemCommands);
    }

    return result;
  }, [items, navigate, setSelected]);

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search.trim()) {
      // Show pages first, then work items (limited)
      const pages = commands.filter(c => c.type === 'page');
      const workItems = commands.filter(c => c.type === 'work-item').slice(0, 10);
      return [...pages, ...workItems];
    }

    const searchLower = search.toLowerCase();
    return commands.filter(cmd => {
      if (cmd.title.toLowerCase().includes(searchLower)) return true;
      if (cmd.subtitle?.toLowerCase().includes(searchLower)) return true;
      if (cmd.keywords?.some(k => k.toLowerCase().includes(searchLower))) return true;
      return false;
    }).slice(0, 20);
  }, [commands, search]);

  // Handle keyboard shortcuts to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setSearch('');
        setSelectedIndex(0);
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure portal is mounted
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle navigation within list
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].onSelect();
          setIsOpen(false);
        }
        break;
    }
  }, [filteredCommands, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      onClick={() => setIsOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-xl bg-toucan-dark-lighter border border-toucan-dark-border rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-toucan-dark-border">
          <Search size={18} className="text-toucan-grey-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search work items, pages..."
            className="flex-1 bg-transparent text-toucan-grey-100 placeholder-toucan-grey-500 text-base
              focus:outline-none"
          />
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 bg-toucan-dark rounded text-xs text-toucan-grey-500 border border-toucan-dark-border">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-toucan-grey-400">
              No results found for "{search}"
            </div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                onClick={() => {
                  cmd.onSelect();
                  setIsOpen(false);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                  index === selectedIndex
                    ? 'bg-toucan-orange/20'
                    : 'hover:bg-toucan-dark'
                )}
              >
                <span className={clsx(
                  'flex-shrink-0',
                  index === selectedIndex ? 'text-toucan-orange' : 'text-toucan-grey-400'
                )}>
                  {cmd.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={clsx(
                    'text-sm truncate',
                    index === selectedIndex ? 'text-toucan-grey-100' : 'text-toucan-grey-200'
                  )}>
                    {cmd.title}
                  </div>
                  {cmd.subtitle && (
                    <div className="text-xs text-toucan-grey-500 truncate">
                      {cmd.subtitle}
                    </div>
                  )}
                </div>
                {index === selectedIndex && (
                  <span className="flex-shrink-0 text-xs text-toucan-grey-500 flex items-center gap-1">
                    <CornerDownLeft size={12} />
                    Select
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-toucan-dark-border bg-toucan-dark/50">
          <div className="flex items-center gap-3 text-xs text-toucan-grey-500">
            <span className="flex items-center gap-1">
              <ArrowUp size={12} />
              <ArrowDown size={12} />
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft size={12} />
              Select
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-toucan-grey-500">
            <Command size={12} />
            <span>K to open</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
