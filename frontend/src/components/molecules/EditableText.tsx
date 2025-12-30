import { useState, useRef, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { Edit3, Check, X } from 'lucide-react';

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  inputClassName?: string;
  displayClassName?: string;
}

export function EditableText({
  value,
  onChange,
  placeholder = 'Click to edit...',
  multiline = false,
  className,
  inputClassName,
  displayClassName,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Update internal state when external value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setEditValue(value);
    setIsEditing(true);
  };

  const handleSave = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed !== value) {
      onChange(trimmed);
    }
    setIsEditing(false);
  }, [editValue, value, onChange]);

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && !multiline) {
      handleSave();
    } else if (e.key === 'Enter' && e.metaKey && multiline) {
      handleSave();
    }
  };

  if (isEditing) {
    const InputComponent = multiline ? 'textarea' : 'input';
    return (
      <div className={clsx('flex items-start gap-2', className)}>
        <InputComponent
          ref={inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder={placeholder}
          rows={multiline ? 3 : undefined}
          className={clsx(
            'flex-1 bg-toucan-dark border border-toucan-orange rounded-md',
            'px-3 py-2 text-toucan-grey-100',
            'placeholder-toucan-grey-400',
            'focus:outline-none focus:ring-2 focus:ring-toucan-orange',
            multiline && 'resize-y min-h-[80px]',
            inputClassName
          )}
        />
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={handleSave}
            className="p-1.5 text-toucan-success hover:bg-toucan-dark-lighter rounded"
            title="Save (Enter)"
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 text-toucan-grey-400 hover:bg-toucan-dark-lighter hover:text-toucan-error rounded"
            title="Cancel (Escape)"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleStartEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleStartEdit();
        }
      }}
      tabIndex={0}
      role="button"
      className={clsx(
        'group flex items-start gap-2 cursor-text rounded-md',
        'px-3 py-2 -mx-3 -my-2',
        'hover:bg-toucan-dark-lighter',
        'focus:outline-none focus:ring-1 focus:ring-toucan-orange',
        className
      )}
    >
      <span
        className={clsx(
          'flex-1',
          value ? 'text-toucan-grey-100' : 'text-toucan-grey-400 italic',
          displayClassName
        )}
      >
        {value || placeholder}
      </span>
      <Edit3
        size={14}
        className="text-toucan-grey-600 opacity-0 group-hover:opacity-100 transition-opacity mt-1"
      />
    </div>
  );
}
