import { clsx } from 'clsx';
import type { WorkItemStatus, WorkItemType, SizeEstimate } from '../../types/workItem';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string | undefined;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-toucan-dark-border text-toucan-grey-200',
  success: 'bg-toucan-success/20 text-toucan-success',
  warning: 'bg-toucan-warning/20 text-toucan-warning',
  error: 'bg-toucan-error/20 text-toucan-error',
  info: 'bg-toucan-info/20 text-toucan-info',
};

const sizeStyles = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2 py-1 text-sm',
};

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-sm',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
}

// Status badge with pre-configured variants
const statusVariants: Record<WorkItemStatus, BadgeVariant> = {
  draft: 'default',
  ready_for_review: 'warning',
  approved: 'success',
  exported: 'info',
};

const statusLabels: Record<WorkItemStatus, string> = {
  draft: 'Draft',
  ready_for_review: 'Review',
  approved: 'Approved',
  exported: 'Exported',
};

interface StatusBadgeProps {
  status: WorkItemStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, size = 'sm', className }: StatusBadgeProps) {
  return (
    <Badge variant={statusVariants[status]} size={size} className={className}>
      {statusLabels[status]}
    </Badge>
  );
}

// Type badge
const typeLabels: Record<WorkItemType, string> = {
  epic: 'Epic',
  feature: 'Feature',
  story: 'Story',
};

interface TypeBadgeProps {
  type: WorkItemType;
  size?: 'sm' | 'md';
  className?: string;
}

export function TypeBadge({ type, size = 'sm', className }: TypeBadgeProps) {
  return (
    <Badge variant="default" size={size} className={className}>
      {typeLabels[type]}
    </Badge>
  );
}

// Size badge
const sizeVariants: Record<SizeEstimate, BadgeVariant> = {
  XS: 'success',
  S: 'success',
  M: 'info',
  L: 'warning',
  XL: 'error',
};

interface SizeBadgeProps {
  size: SizeEstimate;
  badgeSize?: 'sm' | 'md';
  className?: string;
}

export function SizeBadge({ size, badgeSize = 'sm', className }: SizeBadgeProps) {
  return (
    <Badge variant={sizeVariants[size]} size={badgeSize} className={className}>
      {size}
    </Badge>
  );
}
