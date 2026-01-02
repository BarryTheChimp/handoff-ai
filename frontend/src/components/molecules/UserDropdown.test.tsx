import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UserDropdown } from './UserDropdown';
import type { User } from '../../hooks/useAuth';

const mockUser: User = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  displayName: 'Test User',
  role: 'admin',
  status: 'active',
  avatarUrl: null,
  authProvider: 'email',
};

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('UserDropdown', () => {
  it('renders user avatar with first letter of display name', () => {
    const onLogout = vi.fn();
    renderWithRouter(<UserDropdown user={mockUser} onLogout={onLogout} />);

    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('renders display name on larger screens', () => {
    const onLogout = vi.fn();
    renderWithRouter(<UserDropdown user={mockUser} onLogout={onLogout} />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('opens dropdown when clicked', () => {
    const onLogout = vi.fn();
    renderWithRouter(<UserDropdown user={mockUser} onLogout={onLogout} />);

    const trigger = screen.getByTestId('user-dropdown-trigger');
    fireEvent.click(trigger);

    expect(screen.getByTestId('user-dropdown-menu')).toBeInTheDocument();
  });

  it('shows user email and role in dropdown', () => {
    const onLogout = vi.fn();
    renderWithRouter(<UserDropdown user={mockUser} onLogout={onLogout} />);

    const trigger = screen.getByTestId('user-dropdown-trigger');
    fireEvent.click(trigger);

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('calls onLogout when sign out is clicked', () => {
    const onLogout = vi.fn();
    renderWithRouter(<UserDropdown user={mockUser} onLogout={onLogout} />);

    const trigger = screen.getByTestId('user-dropdown-trigger');
    fireEvent.click(trigger);

    const logoutButton = screen.getByTestId('logout-button');
    fireEvent.click(logoutButton);

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('closes dropdown when clicking outside', () => {
    const onLogout = vi.fn();
    renderWithRouter(
      <div>
        <div data-testid="outside">Outside</div>
        <UserDropdown user={mockUser} onLogout={onLogout} />
      </div>
    );

    const trigger = screen.getByTestId('user-dropdown-trigger');
    fireEvent.click(trigger);

    expect(screen.getByTestId('user-dropdown-menu')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));

    expect(screen.queryByTestId('user-dropdown-menu')).not.toBeInTheDocument();
  });

  it('closes dropdown on Escape key', () => {
    const onLogout = vi.fn();
    renderWithRouter(<UserDropdown user={mockUser} onLogout={onLogout} />);

    const trigger = screen.getByTestId('user-dropdown-trigger');
    fireEvent.click(trigger);

    expect(screen.getByTestId('user-dropdown-menu')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByTestId('user-dropdown-menu')).not.toBeInTheDocument();
  });

  it('shows Manage Users link for admin users', () => {
    const onLogout = vi.fn();
    renderWithRouter(<UserDropdown user={mockUser} onLogout={onLogout} />);

    const trigger = screen.getByTestId('user-dropdown-trigger');
    fireEvent.click(trigger);

    expect(screen.getByTestId('users-button')).toBeInTheDocument();
    expect(screen.getByText('Manage Users')).toBeInTheDocument();
  });

  it('hides Manage Users link for non-admin users', () => {
    const onLogout = vi.fn();
    const memberUser: User = { ...mockUser, role: 'member' };
    renderWithRouter(<UserDropdown user={memberUser} onLogout={onLogout} />);

    const trigger = screen.getByTestId('user-dropdown-trigger');
    fireEvent.click(trigger);

    expect(screen.queryByTestId('users-button')).not.toBeInTheDocument();
  });
});
