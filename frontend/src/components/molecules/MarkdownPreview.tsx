import { useState } from 'react';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';
import { Eye, Edit3 } from 'lucide-react';

interface MarkdownPreviewProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function MarkdownPreview({
  value,
  onChange,
  label,
  placeholder = 'Enter markdown content...',
  className,
}: MarkdownPreviewProps) {
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');

  return (
    <div className={clsx('flex flex-col', className)}>
      {/* Header with label and toggle */}
      <div className="flex items-center justify-between mb-2">
        {label && (
          <label className="text-sm font-medium text-toucan-grey-200">{label}</label>
        )}
        <div className="flex bg-toucan-dark rounded-md p-0.5">
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors',
              mode === 'preview'
                ? 'bg-toucan-dark-lighter text-toucan-grey-100'
                : 'text-toucan-grey-400 hover:text-toucan-grey-200'
            )}
          >
            <Eye size={12} />
            Preview
          </button>
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={clsx(
              'flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-colors',
              mode === 'edit'
                ? 'bg-toucan-dark-lighter text-toucan-grey-100'
                : 'text-toucan-grey-400 hover:text-toucan-grey-200'
            )}
          >
            <Edit3 size={12} />
            Edit
          </button>
        </div>
      </div>

      {/* Content */}
      {mode === 'edit' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={clsx(
            'w-full min-h-[150px] bg-toucan-dark border border-toucan-dark-border rounded-md',
            'px-3 py-2 text-sm text-toucan-grey-100 font-mono',
            'placeholder-toucan-grey-400 resize-y',
            'focus:outline-none focus:ring-2 focus:ring-toucan-orange focus:border-transparent'
          )}
        />
      ) : (
        <div
          className={clsx(
            'min-h-[150px] bg-toucan-dark border border-toucan-dark-border rounded-md',
            'px-3 py-2 text-sm overflow-y-auto',
            'prose prose-sm prose-invert max-w-none',
            // Custom prose styles for our theme
            'prose-headings:text-toucan-grey-100 prose-headings:font-semibold',
            'prose-p:text-toucan-grey-200 prose-p:my-2',
            'prose-a:text-toucan-info prose-a:no-underline hover:prose-a:underline',
            'prose-strong:text-toucan-grey-100',
            'prose-code:text-toucan-orange prose-code:bg-toucan-dark-lighter prose-code:px-1 prose-code:rounded',
            'prose-pre:bg-toucan-dark-lighter prose-pre:border prose-pre:border-toucan-dark-border',
            'prose-ul:my-2 prose-ol:my-2 prose-li:text-toucan-grey-200 prose-li:my-0.5',
            'prose-hr:border-toucan-dark-border'
          )}
        >
          {value ? (
            <ReactMarkdown>{value}</ReactMarkdown>
          ) : (
            <p className="text-toucan-grey-400 italic">{placeholder}</p>
          )}
        </div>
      )}
    </div>
  );
}
