import clsx from 'clsx';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Toast as ToastType, useToastStore } from '../../stores/toastStore';

interface ToastProps {
  toast: ToastType;
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  success: {
    bg: 'bg-toucan-success/10',
    border: 'border-toucan-success/30',
    icon: 'text-toucan-success',
    title: 'text-toucan-success',
  },
  error: {
    bg: 'bg-toucan-error/10',
    border: 'border-toucan-error/30',
    icon: 'text-toucan-error',
    title: 'text-toucan-error',
  },
  warning: {
    bg: 'bg-toucan-warning/10',
    border: 'border-toucan-warning/30',
    icon: 'text-toucan-warning',
    title: 'text-toucan-warning',
  },
  info: {
    bg: 'bg-toucan-info/10',
    border: 'border-toucan-info/30',
    icon: 'text-toucan-info',
    title: 'text-toucan-info',
  },
};

export function Toast({ toast }: ToastProps) {
  const removeToast = useToastStore((state) => state.removeToast);
  const Icon = iconMap[toast.type];
  const colors = colorMap[toast.type];

  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg',
        'animate-slide-in-right',
        colors.bg,
        colors.border
      )}
      role="alert"
      aria-live="polite"
    >
      <Icon className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', colors.icon)} />

      <div className="flex-1 min-w-0">
        <p className={clsx('font-medium text-sm', colors.title)}>
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-sm text-toucan-grey-400 mt-1">
            {toast.message}
          </p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className={clsx(
              'mt-2 text-sm font-medium underline-offset-2 hover:underline',
              colors.title
            )}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 text-toucan-grey-400 hover:text-toucan-grey-100 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
