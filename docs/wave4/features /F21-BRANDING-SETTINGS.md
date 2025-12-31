# F21: Branding (Logo) + Settings in User Menu

> **Priority:** MEDIUM | **Effort:** 1.5 hours | **Phase:** 1

---

## Overview

**What:** Add Toucan Labs logo to the header and add Settings link to user dropdown menu.

**Why:** The app lacks brand identity - the header is bare. Users also need quick access to Settings without hunting through navigation. These small polish items elevate the professional appearance.

**Success Criteria:**
- Toucan Labs logo appears in header
- Logo links to dashboard/home
- Settings link in user dropdown
- Settings page accessible

---

## User Stories

### Must Have

**US-21.1:** As a user, I want to see the Toucan Labs logo in the header so that I know what product I'm using.
- **AC:** Logo visible in top-left of header
- **AC:** Logo is appropriately sized (32-40px height)
- **AC:** Logo links to dashboard when clicked

**US-21.2:** As a user, I want to access Settings from the user dropdown menu so that I can change my preferences quickly.
- **AC:** Click user avatar/name → See "Settings" option
- **AC:** Click Settings → Navigate to settings page
- **AC:** Settings page shows user preferences

### Should Have

**US-21.3:** As a user, I want the logo to be responsive so that it looks good on mobile.
- **AC:** On mobile (< 640px), show icon-only version or smaller logo
- **AC:** Logo never causes header overflow

---

## Functional Requirements

| ID | Requirement | Testable Criteria |
|----|-------------|-------------------|
| FR-21.1 | Header shall display Toucan Labs logo | Logo visible in header |
| FR-21.2 | Logo shall link to dashboard | Click logo, verify navigation |
| FR-21.3 | User dropdown shall include Settings link | Open dropdown, verify Settings visible |
| FR-21.4 | Settings link shall navigate to settings page | Click Settings, verify navigation |
| FR-21.5 | Logo shall be responsive | Resize browser, verify no overflow |

---

## Technical Design

### Logo Assets

The user will provide logo assets. Expected formats:
- `logo-full.svg` - Full "Toucan Labs" wordmark (for desktop)
- `logo-icon.svg` - Icon only (for mobile/compact)
- `logo-full.png` - Fallback (PNG with transparency)

Location: `frontend/public/assets/`

### Component Changes

#### frontend/src/components/organisms/Header.tsx

```tsx
import { Link } from 'react-router-dom';
import { ProjectSelector } from '../molecules/ProjectSelector';
import { UserDropdown } from '../molecules/UserDropdown';

export function Header() {
  return (
    <header className="h-16 bg-toucan-dark-lighter border-b border-toucan-dark-border px-4 flex items-center justify-between">
      {/* Left: Logo + Project Selector */}
      <div className="flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          {/* Full logo on desktop */}
          <img 
            src="/assets/logo-full.svg" 
            alt="Toucan Labs" 
            className="h-8 hidden sm:block"
          />
          {/* Icon on mobile */}
          <img 
            src="/assets/logo-icon.svg" 
            alt="Toucan Labs" 
            className="h-8 w-8 sm:hidden"
          />
        </Link>
        
        {/* Divider */}
        <div className="h-6 w-px bg-toucan-dark-border hidden sm:block" />
        
        {/* Project Selector */}
        <ProjectSelector />
      </div>
      
      {/* Right: User Dropdown */}
      <UserDropdown />
    </header>
  );
}
```

#### frontend/src/components/molecules/UserDropdown.tsx

```tsx
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  
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
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-toucan-dark transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-toucan-orange flex items-center justify-center text-white font-medium text-sm">
          {user?.username?.charAt(0).toUpperCase() || 'U'}
        </div>
        
        {/* Name (hidden on mobile) */}
        <span className="text-toucan-grey-200 text-sm hidden sm:block">
          {user?.username || 'User'}
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
        <div className="absolute right-0 mt-2 w-48 bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg shadow-lg py-1 z-50">
          {/* User info */}
          <div className="px-4 py-2 border-b border-toucan-dark-border">
            <p className="text-sm font-medium text-toucan-grey-100">
              {user?.username}
            </p>
            <p className="text-xs text-toucan-grey-400">
              {user?.role || 'User'}
            </p>
          </div>
          
          {/* Menu items */}
          <nav className="py-1">
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-toucan-grey-200 hover:bg-toucan-dark transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </Link>
            
            <Link
              to="/help"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-toucan-grey-200 hover:bg-toucan-dark transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Help & Support
            </Link>
          </nav>
          
          {/* Divider */}
          <div className="border-t border-toucan-dark-border my-1" />
          
          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm text-toucan-error hover:bg-toucan-dark transition-colors w-full"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
```

#### frontend/src/pages/SettingsPage.tsx

```tsx
import { PageLayout } from '../components/templates/PageLayout';
import { useAuthStore } from '../stores/authStore';

export function SettingsPage() {
  const { user } = useAuthStore();
  
  return (
    <PageLayout title="Settings">
      <div className="max-w-2xl">
        {/* Account Section */}
        <section className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-toucan-grey-100 mb-4">
            Account
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-toucan-grey-400 mb-1">
                Username
              </label>
              <p className="text-toucan-grey-100">{user?.username}</p>
            </div>
            
            <div>
              <label className="block text-sm text-toucan-grey-400 mb-1">
                Role
              </label>
              <p className="text-toucan-grey-100">{user?.role || 'User'}</p>
            </div>
          </div>
        </section>
        
        {/* Preferences Section */}
        <section className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-toucan-grey-100 mb-4">
            Preferences
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-toucan-grey-100">
                  Email Notifications
                </p>
                <p className="text-xs text-toucan-grey-400">
                  Receive emails when specs are translated
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-toucan-dark-border peer-focus:ring-2 peer-focus:ring-toucan-orange rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-toucan-orange"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-toucan-grey-100">
                  Auto-refresh Dashboard
                </p>
                <p className="text-xs text-toucan-grey-400">
                  Automatically refresh spec list every 30 seconds
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-toucan-dark-border peer-focus:ring-2 peer-focus:ring-toucan-orange rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-toucan-orange"></div>
              </label>
            </div>
          </div>
        </section>
        
        {/* About Section */}
        <section className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-toucan-grey-100 mb-4">
            About
          </h2>
          
          <div className="space-y-2 text-sm text-toucan-grey-400">
            <p><strong className="text-toucan-grey-200">Version:</strong> 0.4.0</p>
            <p><strong className="text-toucan-grey-200">Build:</strong> Wave 4</p>
            <p>
              <strong className="text-toucan-grey-200">Made by:</strong>{' '}
              <a 
                href="https://toucanlabs.co.uk" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-toucan-orange hover:underline"
              >
                Toucan Labs
              </a>
            </p>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
```

#### Update router (frontend/src/App.tsx)

```tsx
import { SettingsPage } from './pages/SettingsPage';

// Add route
<Route path="/settings" element={<SettingsPage />} />
```

### Placeholder Logo SVG

Until the user provides the actual logo, create a placeholder:

#### frontend/public/assets/logo-full.svg

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 40" fill="none">
  <rect x="4" y="8" width="24" height="24" rx="6" fill="#FF6B35"/>
  <path d="M16 14L22 20L16 26" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="40" y="27" font-family="Inter, system-ui, sans-serif" font-size="18" font-weight="600" fill="#F5F5F7">
    Handoff AI
  </text>
</svg>
```

#### frontend/public/assets/logo-icon.svg

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect x="4" y="4" width="24" height="24" rx="6" fill="#FF6B35"/>
  <path d="M14 10L20 16L14 22" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

---

## Database Changes

None required.

---

## Testing Checklist

### Unit Tests

- [ ] `Header` renders logo with correct src
- [ ] `UserDropdown` opens/closes on click
- [ ] `UserDropdown` closes on outside click
- [ ] `UserDropdown` closes on Escape key
- [ ] Settings link navigates correctly

### E2E Tests

- [ ] Logo visible in header
- [ ] Click logo → Navigate to dashboard
- [ ] Open user dropdown → See Settings
- [ ] Click Settings → See settings page
- [ ] Resize to mobile → See icon-only logo

### Visual Tests

- [ ] Logo looks correct at different zoom levels
- [ ] Dropdown aligns to right edge properly
- [ ] No overflow on narrow screens

---

## Rollback Plan

If logo causes issues:
1. Replace with text "Handoff AI" in a styled span
2. Keep dropdown changes (they're independent)

---

## Dependencies

None - uses existing assets and React Router.

---

## Notes for User

**ACTION REQUIRED:** Please provide logo assets:
1. `logo-full.svg` - Full wordmark for desktop
2. `logo-icon.svg` - Icon only for mobile

Place in `frontend/public/assets/`

If not provided before build, placeholder logos will be used.

---

*F21 Specification v1.0*
