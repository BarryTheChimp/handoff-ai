import { useState, useEffect, useRef } from 'react';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import type { WorkItemType, WorkItemStatus, SizeEstimate } from '../../types/workItem';

export interface WorkItemFilterState {
  search: string;
  types: WorkItemType[];
  statuses: WorkItemStatus[];
  sizes: SizeEstimate[];
  hasEstimate: 'all' | 'estimated' | 'unestimated';
}

export const DEFAULT_FILTERS: WorkItemFilterState = {
  search: '',
  types: [],
  statuses: [],
  sizes: [],
  hasEstimate: 'all',
};

interface WorkItemFiltersProps {
  filters: WorkItemFilterState;
  onChange: (filters: WorkItemFilterState) => void;
  compact?: boolean;
}

const TYPE_OPTIONS: { value: WorkItemType; label: string; color: string }[] = [
  { value: 'epic', label: 'Epic', color: 'bg-blue-500' },
  { value: 'feature', label: 'Feature', color: 'bg-green-500' },
  { value: 'story', label: 'Story', color: 'bg-toucan-orange' },
];

const STATUS_OPTIONS: { value: WorkItemStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'ready_for_review', label: 'Ready for Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'exported', label: 'Exported' },
];

const SIZE_OPTIONS: { value: SizeEstimate; label: string }[] = [
  { value: 'XS', label: 'XS' },
  { value: 'S', label: 'S' },
  { value: 'M', label: 'M' },
  { value: 'L', label: 'L' },
  { value: 'XL', label: 'XL' },
];

export function WorkItemFilters({ filters, onChange, compact = false }: WorkItemFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.statuses.length > 0 ||
    filters.sizes.length > 0 ||
    filters.hasEstimate !== 'all';

  const activeFilterCount =
    filters.types.length +
    filters.statuses.length +
    filters.sizes.length +
    (filters.hasEstimate !== 'all' ? 1 : 0);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleType = (type: WorkItemType) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    onChange({ ...filters, types: newTypes });
  };

  const toggleStatus = (status: WorkItemStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    onChange({ ...filters, statuses: newStatuses });
  };

  const toggleSize = (size: SizeEstimate) => {
    const newSizes = filters.sizes.includes(size)
      ? filters.sizes.filter(s => s !== size)
      : [...filters.sizes, size];
    onChange({ ...filters, sizes: newSizes });
  };

  const clearFilters = () => {
    onChange(DEFAULT_FILTERS);
    setShowFilters(false);
  };

  return (
    <div className={clsx('flex gap-2', compact && 'flex-col')}>
      {/* Search input */}
      <div className="relative flex-1">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-toucan-grey-400"
        />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search items..."
          className="w-full pl-8 pr-8 py-1.5 bg-toucan-dark border border-toucan-dark-border rounded-md
            text-toucan-grey-100 placeholder-toucan-grey-500 text-sm
            focus:outline-none focus:ring-1 focus:ring-toucan-orange focus:border-transparent"
        />
        {filters.search && (
          <button
            onClick={() => onChange({ ...filters, search: '' })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-toucan-grey-400 hover:text-toucan-grey-200"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter dropdown trigger */}
      <div className="relative" ref={filterRef}>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={clsx(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-sm transition-colors',
            hasActiveFilters
              ? 'border-toucan-orange bg-toucan-orange/10 text-toucan-orange'
              : 'border-toucan-dark-border text-toucan-grey-400 hover:border-toucan-grey-600 hover:text-toucan-grey-200'
          )}
        >
          <Filter size={14} />
          {activeFilterCount > 0 && (
            <span className="min-w-[18px] h-[18px] flex items-center justify-center bg-toucan-orange text-white text-xs rounded-full">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown size={14} className={clsx('transition-transform', showFilters && 'rotate-180')} />
        </button>

        {/* Filter dropdown */}
        {showFilters && (
          <div className="absolute right-0 top-full mt-1 w-72 bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg shadow-xl z-50">
            <div className="p-3 space-y-4">
              {/* Type filter */}
              <div>
                <label className="block text-xs font-medium text-toucan-grey-400 mb-2 uppercase tracking-wide">
                  Type
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TYPE_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => toggleType(option.value)}
                      className={clsx(
                        'flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors',
                        filters.types.includes(option.value)
                          ? 'bg-toucan-orange/20 text-toucan-orange border border-toucan-orange'
                          : 'bg-toucan-dark border border-toucan-dark-border text-toucan-grey-300 hover:border-toucan-grey-600'
                      )}
                    >
                      <span className={clsx('w-2 h-2 rounded-full', option.color)} />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status filter */}
              <div>
                <label className="block text-xs font-medium text-toucan-grey-400 mb-2 uppercase tracking-wide">
                  Status
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => toggleStatus(option.value)}
                      className={clsx(
                        'px-2 py-1 rounded text-xs transition-colors',
                        filters.statuses.includes(option.value)
                          ? 'bg-toucan-orange/20 text-toucan-orange border border-toucan-orange'
                          : 'bg-toucan-dark border border-toucan-dark-border text-toucan-grey-300 hover:border-toucan-grey-600'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size filter */}
              <div>
                <label className="block text-xs font-medium text-toucan-grey-400 mb-2 uppercase tracking-wide">
                  Size
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SIZE_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => toggleSize(option.value)}
                      className={clsx(
                        'w-8 h-8 rounded text-xs font-medium transition-colors',
                        filters.sizes.includes(option.value)
                          ? 'bg-toucan-orange/20 text-toucan-orange border border-toucan-orange'
                          : 'bg-toucan-dark border border-toucan-dark-border text-toucan-grey-300 hover:border-toucan-grey-600'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estimate filter */}
              <div>
                <label className="block text-xs font-medium text-toucan-grey-400 mb-2 uppercase tracking-wide">
                  Estimation
                </label>
                <div className="flex gap-1.5">
                  {[
                    { value: 'all' as const, label: 'All' },
                    { value: 'estimated' as const, label: 'Estimated' },
                    { value: 'unestimated' as const, label: 'Unestimated' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => onChange({ ...filters, hasEstimate: option.value })}
                      className={clsx(
                        'px-2 py-1 rounded text-xs transition-colors',
                        filters.hasEstimate === option.value
                          ? 'bg-toucan-orange/20 text-toucan-orange border border-toucan-orange'
                          : 'bg-toucan-dark border border-toucan-dark-border text-toucan-grey-300 hover:border-toucan-grey-600'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            {hasActiveFilters && (
              <div className="px-3 py-2 border-t border-toucan-dark-border">
                <button
                  onClick={clearFilters}
                  className="text-xs text-toucan-grey-400 hover:text-toucan-orange transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
