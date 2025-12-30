import { Search, Filter, X } from 'lucide-react';
import { Button } from '../atoms/Button';
import type { Spec } from '../../types/workItem';

interface SpecFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: Spec['status'] | 'all';
  onStatusFilterChange: (value: Spec['status'] | 'all') => void;
}

const statusOptions: Array<{ value: Spec['status'] | 'all'; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'uploaded', label: 'Uploaded' },
  { value: 'extracting', label: 'Extracting' },
  { value: 'ready', label: 'Ready' },
  { value: 'translating', label: 'Translating' },
  { value: 'translated', label: 'Translated' },
  { value: 'error', label: 'Error' },
];

export function SpecFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: SpecFiltersProps) {
  const hasFilters = search !== '' || statusFilter !== 'all';

  const clearFilters = () => {
    onSearchChange('');
    onStatusFilterChange('all');
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search input */}
      <div className="relative flex-1">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-toucan-grey-400"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search specs..."
          className="w-full pl-9 pr-3 py-2 bg-toucan-dark border border-toucan-dark-border rounded-md
            text-toucan-grey-100 placeholder-toucan-grey-400 text-sm
            focus:outline-none focus:ring-2 focus:ring-toucan-orange focus:border-transparent"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-toucan-grey-400 hover:text-toucan-grey-200"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Status filter */}
      <div className="relative">
        <Filter
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-toucan-grey-400 pointer-events-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as Spec['status'] | 'all')}
          className="pl-9 pr-8 py-2 bg-toucan-dark border border-toucan-dark-border rounded-md
            text-toucan-grey-100 text-sm appearance-none cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-toucan-orange focus:border-transparent"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className="text-toucan-grey-400"
          >
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Clear filters button */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} leftIcon={<X size={14} />}>
          Clear
        </Button>
      )}
    </div>
  );
}
