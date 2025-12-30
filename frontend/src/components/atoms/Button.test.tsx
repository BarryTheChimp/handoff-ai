import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(
      <Button variant="primary" onClick={handleClick}>
        Click me
      </Button>
    );
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(
      <Button variant="primary" onClick={handleClick} disabled>
        Click me
      </Button>
    );
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows loading spinner when loading', () => {
    render(
      <Button variant="primary" loading>
        Submit
      </Button>
    );
    // Button should be disabled when loading
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('renders with left icon', () => {
    const Icon = () => <span data-testid="icon">Icon</span>;
    render(
      <Button variant="primary" leftIcon={<Icon />}>
        With Icon
      </Button>
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('With Icon')).toBeInTheDocument();
  });

  it('applies correct variant classes', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-toucan-orange');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('border');

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-transparent');
  });

  it('applies correct size classes', () => {
    const { rerender } = render(
      <Button variant="primary" size="sm">
        Small
      </Button>
    );
    expect(screen.getByRole('button')).toHaveClass('px-2.5');

    rerender(
      <Button variant="primary" size="lg">
        Large
      </Button>
    );
    expect(screen.getByRole('button')).toHaveClass('px-6');
  });
});
