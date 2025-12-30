import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 16,
  md: 24,
  lg: 32,
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <Loader2
      size={sizeMap[size]}
      className={clsx('animate-spin text-toucan-orange', className)}
    />
  );
}

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-toucan-dark/80 backdrop-blur-sm z-50">
      <Spinner size="lg" />
      <p className="mt-4 text-toucan-grey-200">{message}</p>
    </div>
  );
}
