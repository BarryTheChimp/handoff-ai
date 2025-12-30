# Feature 11: User Session & Logout

## Overview

**What:** Add logout functionality, user info display, and proper session management.

**Why:** Users can log in but can't log out. No way to see who's logged in or switch users. Basic UX gap.

**Success Criteria:**
- User can log out and is redirected to login page
- Header shows current user's name
- Token cleared on logout
- All related localStorage cleared

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-11.1 | System SHALL display logged-in user's name in header |
| FR-11.2 | System SHALL provide logout button accessible from any page |
| FR-11.3 | Logout SHALL clear auth_token from localStorage |
| FR-11.4 | Logout SHALL clear selected_project_id from localStorage |
| FR-11.5 | Logout SHALL redirect user to /login page |
| FR-11.6 | Protected routes SHALL redirect to /login after logout |
| FR-11.7 | User dropdown SHALL show user email and role |
| FR-11.8 | User dropdown SHALL close when clicking outside |
| FR-11.9 | User dropdown SHALL close on Escape key |

## Technical Specification

### Component: UserDropdown

**File:** `frontend/src/components/molecules/UserDropdown.tsx`

```typescript
import React, { useState, useRef, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
}

interface UserDropdownProps {
  user: User;
  onLogout: () => void;
}

export function UserDropdown({ user, onLogout }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-toucan-dark-lighter transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-toucan-orange flex items-center justify-center text-white font-medium text-sm">
          {user.displayName.charAt(0).toUpperCase()}
        </div>
        {/* Name */}
        <span className="text-toucan-grey-200 text-sm hidden sm:inline">
          {user.displayName}
        </span>
        {/* Chevron */}
        <svg 
          className={`w-4 h-4 text-toucan-grey-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-toucan-dark-card border border-toucan-dark-border rounded-lg shadow-xl z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-toucan-dark-border">
            <p className="text-sm font-medium text-toucan-grey-100">{user.displayName}</p>
            <p className="text-xs text-toucan-grey-400 mt-0.5">{user.email}</p>
            <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full bg-toucan-orange/20 text-toucan-orange capitalize">
              {user.role}
            </span>
          </div>
          
          {/* Actions */}
          <div className="py-1">
            <button
              onClick={onLogout}
              className="w-full px-4 py-2 text-left text-sm text-toucan-grey-200 hover:bg-toucan-dark-lighter flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Hook: useAuth

**File:** `frontend/src/hooks/useAuth.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const navigate = useNavigate();

  // Load user from JWT on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        // Decode JWT payload (base64)
        const payload = JSON.parse(atob(token.split('.')[1]));
        setState({
          user: {
            id: payload.id,
            username: payload.username,
            displayName: payload.displayName || payload.username,
            email: payload.email || `${payload.username}@toucanlabs.co.uk`,
            role: payload.role || 'user',
          },
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        // Invalid token - clear it
        localStorage.removeItem('auth_token');
        setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  const logout = useCallback(() => {
    // Clear all auth-related storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('selected_project_id');
    
    // Update state
    setState({ user: null, isAuthenticated: false, isLoading: false });
    
    // Redirect to login
    navigate('/login', { replace: true });
  }, [navigate]);

  return {
    ...state,
    logout,
  };
}
```

### Update: Header Component

**File:** `frontend/src/components/organisms/Header.tsx`

```typescript
import React from 'react';
import { Link } from 'react-router-dom';
import { UserDropdown } from '../molecules/UserDropdown';
import { useAuth } from '../../hooks/useAuth';

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="bg-toucan-dark-card border-b border-toucan-dark-border">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-bold flex items-center">
            <span className="text-toucan-orange">Handoff</span>
            <span className="text-toucan-grey-200 ml-1">AI</span>
          </Link>
          
          {/* Project selector will be added in Feature 12 */}
          {/* Navigation will be added in Feature 13 */}
        </div>

        {/* Right: User */}
        <div className="flex items-center gap-4">
          {isAuthenticated && user && (
            <UserDropdown user={user} onLogout={logout} />
          )}
        </div>
      </div>
    </header>
  );
}
```

### Integration

Update `App.tsx` to use shared Header (if pages have inline headers, extract to shared component).

Each page should import and use the shared Header:

```typescript
import { Header } from './components/organisms/Header';

export function DashboardPage() {
  return (
    <div className="min-h-screen bg-toucan-dark">
      <Header />
      {/* Page content */}
    </div>
  );
}
```

## Testing Checklist

- [ ] Login with valid credentials → see username in header
- [ ] Click username → dropdown opens showing email and role
- [ ] Click outside dropdown → closes
- [ ] Press Escape → dropdown closes
- [ ] Click "Sign out" → redirected to /login
- [ ] After logout, try accessing /dashboard → redirected to /login
- [ ] After logout, localStorage has no auth_token
- [ ] Refresh page while logged in → stays logged in
- [ ] Refresh page after logout → stays on login

## Files to Create

```
frontend/src/
├── components/
│   ├── molecules/
│   │   └── UserDropdown.tsx       # NEW
│   └── organisms/
│       └── Header.tsx             # NEW or UPDATE
└── hooks/
    └── useAuth.ts                 # NEW
```

## Files to Modify

- `frontend/src/App.tsx` - ensure Header is used consistently
- `frontend/src/pages/DashboardPage.tsx` - use shared Header
- Other pages - use shared Header

## Dependencies

None - this is a foundation feature.

## Effort Estimate

**2 hours**
- UserDropdown component: 30 min
- useAuth hook: 30 min  
- Header component: 30 min
- Integration with pages: 20 min
- Testing: 10 min
