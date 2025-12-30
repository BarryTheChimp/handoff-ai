import { FileUp, Search, AlertCircle } from 'lucide-react';
import { Button } from '../atoms/Button';

interface EmptyStateProps {
  type: 'no-specs' | 'no-results' | 'error';
  onUpload?: () => void;
  onClearFilters?: () => void;
  onRetry?: () => void;
  errorMessage?: string;
}

export function EmptyState({
  type,
  onUpload,
  onClearFilters,
  onRetry,
  errorMessage,
}: EmptyStateProps) {
  if (type === 'no-specs') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="p-4 bg-toucan-dark rounded-full mb-4">
          <FileUp size={32} className="text-toucan-orange" />
        </div>
        <h3 className="text-lg font-medium text-toucan-grey-100 mb-2">
          No specifications yet
        </h3>
        <p className="text-toucan-grey-400 text-center max-w-md mb-6">
          Upload your first specification document to get started. We support PDF, YAML, JSON, and Markdown files.
        </p>
        {onUpload && (
          <Button variant="primary" onClick={onUpload} leftIcon={<FileUp size={16} />}>
            Upload Spec
          </Button>
        )}
      </div>
    );
  }

  if (type === 'no-results') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="p-4 bg-toucan-dark rounded-full mb-4">
          <Search size={32} className="text-toucan-grey-400" />
        </div>
        <h3 className="text-lg font-medium text-toucan-grey-100 mb-2">
          No specs found
        </h3>
        <p className="text-toucan-grey-400 text-center max-w-md mb-6">
          No specifications match your current filters. Try adjusting your search or filter criteria.
        </p>
        {onClearFilters && (
          <Button variant="secondary" onClick={onClearFilters}>
            Clear Filters
          </Button>
        )}
      </div>
    );
  }

  if (type === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="p-4 bg-toucan-error/20 rounded-full mb-4">
          <AlertCircle size={32} className="text-toucan-error" />
        </div>
        <h3 className="text-lg font-medium text-toucan-grey-100 mb-2">
          Failed to load specs
        </h3>
        <p className="text-toucan-grey-400 text-center max-w-md mb-6">
          {errorMessage || 'An error occurred while loading specifications. Please try again.'}
        </p>
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Try Again
          </Button>
        )}
      </div>
    );
  }

  return null;
}
