import { clsx } from 'clsx';

interface ProgressBarProps {
  progress: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const variantStyles = {
  default: 'bg-toucan-orange',
  success: 'bg-toucan-success',
  warning: 'bg-toucan-warning',
  error: 'bg-toucan-error',
};

export function ProgressBar({
  progress,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  animated = true,
  className,
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={clsx('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          {label && (
            <span className="text-xs text-toucan-grey-400">{label}</span>
          )}
          {showLabel && (
            <span className="text-xs text-toucan-grey-400">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      )}
      <div
        className={clsx(
          'w-full bg-toucan-dark-border rounded-full overflow-hidden',
          sizeStyles[size]
        )}
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || `Progress: ${Math.round(clampedProgress)}%`}
      >
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-300',
            variantStyles[variant],
            animated && clampedProgress < 100 && 'animate-pulse'
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}
