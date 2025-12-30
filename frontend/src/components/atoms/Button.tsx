import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: clsx(
    'bg-toucan-orange text-white',
    'hover:bg-toucan-orange-light active:bg-toucan-orange-dark',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  ),
  secondary: clsx(
    'bg-transparent text-toucan-grey-100 border border-toucan-dark-border',
    'hover:bg-toucan-dark-lighter active:bg-toucan-dark',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  ),
  ghost: clsx(
    'bg-transparent text-toucan-grey-400',
    'hover:text-toucan-grey-100 hover:bg-toucan-dark-lighter',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  ),
  danger: clsx(
    'bg-toucan-error text-white',
    'hover:bg-toucan-error/80 active:bg-toucan-error/60',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  ),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center font-medium rounded-md',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-toucan-orange focus:ring-offset-2 focus:ring-offset-toucan-dark',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="animate-spin" size={size === 'lg' ? 20 : 16} />
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
