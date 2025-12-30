import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders children correctly', () => {
    render(<Badge variant="default">Status</Badge>);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('applies correct variant classes for default', () => {
    render(<Badge variant="default">Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge).toHaveClass('bg-toucan-dark-border');
  });

  it('applies correct variant classes for success', () => {
    render(<Badge variant="success">Success</Badge>);
    const badge = screen.getByText('Success');
    expect(badge).toHaveClass('bg-toucan-success/20');
  });

  it('applies correct variant classes for warning', () => {
    render(<Badge variant="warning">Warning</Badge>);
    const badge = screen.getByText('Warning');
    expect(badge).toHaveClass('bg-toucan-warning/20');
  });

  it('applies correct variant classes for error', () => {
    render(<Badge variant="error">Error</Badge>);
    const badge = screen.getByText('Error');
    expect(badge).toHaveClass('bg-toucan-error/20');
  });

  it('applies correct variant classes for info', () => {
    render(<Badge variant="info">Info</Badge>);
    const badge = screen.getByText('Info');
    expect(badge).toHaveClass('bg-toucan-info/20');
  });

  it('applies additional className', () => {
    render(
      <Badge variant="default" className="custom-class">
        With Class
      </Badge>
    );
    const badge = screen.getByText('With Class');
    expect(badge).toHaveClass('custom-class');
  });
});
