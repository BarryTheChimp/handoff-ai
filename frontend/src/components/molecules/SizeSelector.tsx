import { clsx } from 'clsx';
import type { SizeEstimate } from '../../types/workItem';

interface SizeSelectorProps {
  value: SizeEstimate | null;
  onChange: (size: SizeEstimate) => void;
  label?: string;
  className?: string;
}

const sizes: SizeEstimate[] = ['S', 'M', 'L', 'XL'];

const sizeDescriptions: Record<SizeEstimate, string> = {
  S: '~1 day',
  M: '2-3 days',
  L: '4-5 days',
  XL: 'Needs splitting',
};

const sizeColors: Record<SizeEstimate, string> = {
  S: 'bg-toucan-success/20 text-toucan-success border-toucan-success/30 hover:bg-toucan-success/30',
  M: 'bg-toucan-info/20 text-toucan-info border-toucan-info/30 hover:bg-toucan-info/30',
  L: 'bg-toucan-warning/20 text-toucan-warning border-toucan-warning/30 hover:bg-toucan-warning/30',
  XL: 'bg-toucan-error/20 text-toucan-error border-toucan-error/30 hover:bg-toucan-error/30',
};

const selectedSizeColors: Record<SizeEstimate, string> = {
  S: 'bg-toucan-success text-white border-toucan-success',
  M: 'bg-toucan-info text-white border-toucan-info',
  L: 'bg-toucan-warning text-toucan-dark border-toucan-warning',
  XL: 'bg-toucan-error text-white border-toucan-error',
};

export function SizeSelector({ value, onChange, label, className }: SizeSelectorProps) {
  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      {label && (
        <label className="text-sm font-medium text-toucan-grey-200">{label}</label>
      )}
      <div className="flex gap-2">
        {sizes.map((size) => {
          const isSelected = value === size;
          return (
            <button
              key={size}
              type="button"
              onClick={() => onChange(size)}
              title={sizeDescriptions[size]}
              className={clsx(
                'flex flex-col items-center justify-center',
                'w-14 h-14 rounded-md border transition-all',
                'focus:outline-none focus:ring-2 focus:ring-toucan-orange focus:ring-offset-2 focus:ring-offset-toucan-dark',
                isSelected ? selectedSizeColors[size] : sizeColors[size]
              )}
            >
              <span className="text-lg font-bold">{size}</span>
              <span className="text-[10px] opacity-80">{sizeDescriptions[size]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
