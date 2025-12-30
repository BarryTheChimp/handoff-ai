# Feature 13: Global Navigation

## Overview

**What:** Add consistent navigation bar and breadcrumbs across all pages. Create a shared page layout template.

**Why:** Users get lost. Can't navigate from Review page to Templates. No breadcrumbs showing location. Inconsistent headers across pages.

**Success Criteria:**
- Navigation bar on all authenticated pages
- Active nav item highlighted
- Breadcrumbs show current location
- Consistent page layout across app

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-13.1 | Navigation bar SHALL appear on all authenticated pages |
| FR-13.2 | Navigation SHALL include: Dashboard, Templates, Preferences |
| FR-13.3 | Active navigation item SHALL be visually distinct |
| FR-13.4 | Navigation items SHALL be disabled when no project selected |
| FR-13.5 | Breadcrumbs SHALL show path from project to current page |
| FR-13.6 | Breadcrumb segments SHALL be clickable (except current) |
| FR-13.7 | Page layout SHALL be consistent (header, nav, breadcrumbs, content) |
| FR-13.8 | Navigation SHALL work on mobile (responsive) |

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER                                                         │
│  ┌──────────┐ ┌─────────────────┐              ┌─────────────┐ │
│  │  Logo    │ │ ProjectSelector │              │ UserDropdown│ │
│  └──────────┘ └─────────────────┘              └─────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  NAVIGATION                                                     │
│  ┌───────────┐ ┌───────────┐ ┌─────────────┐                   │
│  │ Dashboard │ │ Templates │ │ Preferences │                   │
│  └───────────┘ └───────────┘ └─────────────┘                   │
├─────────────────────────────────────────────────────────────────┤
│  BREADCRUMBS                                                    │
│  🏠 > Moorfields OpenEyes > Allergy Management > Review         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PAGE CONTENT                                                   │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Technical Specification

### Navigation Component

**File:** `frontend/src/components/organisms/Navigation.tsx`

```typescript
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useProject } from '../../hooks/useProject';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  requiresProject?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/',
    requiresProject: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Templates',
    path: '/templates',
    requiresProject: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
  {
    label: 'Preferences',
    path: '/preferences',
    requiresProject: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
  },
];

export function Navigation() {
  const location = useLocation();
  const { selectedProjectId } = useProject();

  function isActive(path: string): boolean {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  }

  function getPath(item: NavItem): string {
    // For preferences, append project ID
    if (item.path === '/preferences' && selectedProjectId) {
      return `/preferences/${selectedProjectId}`;
    }
    return item.path;
  }

  return (
    <nav className="bg-toucan-dark-card border-b border-toucan-dark-border">
      <div className="container mx-auto px-6">
        <div className="flex items-center gap-1 -mb-px">
          {NAV_ITEMS.map((item) => {
            const isDisabled = item.requiresProject && !selectedProjectId;
            const active = isActive(item.path);
            const path = getPath(item);

            if (isDisabled) {
              return (
                <span
                  key={item.path}
                  className="flex items-center gap-2 px-4 py-3 text-sm 
                             text-toucan-grey-600 cursor-not-allowed border-b-2 border-transparent"
                  title="Select a project first"
                >
                  {item.icon}
                  <span className="hidden sm:inline">{item.label}</span>
                </span>
              );
            }

            return (
              <Link
                key={item.path}
                to={path}
                className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors border-b-2 ${
                  active
                    ? 'text-toucan-orange border-toucan-orange'
                    : 'text-toucan-grey-300 border-transparent hover:text-toucan-grey-100 hover:border-toucan-grey-600'
                }`}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
```

### Breadcrumbs Component

**File:** `frontend/src/components/molecules/Breadcrumbs.tsx`

```typescript
import React from 'react';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  path?: string; // Undefined = current page (not clickable)
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm py-4">
      {/* Home Icon */}
      <Link 
        to="/" 
        className="text-toucan-grey-400 hover:text-toucan-grey-200 transition-colors"
        aria-label="Home"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </Link>

      {items.map((item, index) => (
        <React.Fragment key={index}>
          {/* Separator */}
          <svg className="w-4 h-4 text-toucan-grey-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          
          {/* Breadcrumb Item */}
          {item.path ? (
            <Link
              to={item.path}
              className="text-toucan-grey-400 hover:text-toucan-grey-200 transition-colors truncate max-w-[150px]"
              title={item.label}
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-toucan-grey-200 truncate max-w-[200px]" title={item.label}>
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
```

### PageLayout Template

**File:** `frontend/src/components/templates/PageLayout.tsx`

```typescript
import React from 'react';
import { Navigate } from 'react-router-dom';
import { Header } from '../organisms/Header';
import { Navigation } from '../organisms/Navigation';
import { Breadcrumbs, BreadcrumbItem } from '../molecules/Breadcrumbs';
import { useProject } from '../../hooks/useProject';

interface PageLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  requiresProject?: boolean;
}

export function PageLayout({ 
  children, 
  breadcrumbs, 
  title, 
  subtitle,
  actions,
  requiresProject = true 
}: PageLayoutProps) {
  const { selectedProjectId } = useProject();

  // Redirect to projects page if project required but not selected
  if (requiresProject && !selectedProjectId) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <div className="min-h-screen bg-toucan-dark flex flex-col">
      <Header />
      <Navigation />
      
      <main className="flex-1">
        <div className="container mx-auto px-6">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumbs items={breadcrumbs} />
          )}

          {/* Page Header */}
          {(title || actions) && (
            <div className="flex items-start justify-between py-4">
              <div>
                {title && (
                  <h1 className="text-2xl font-bold text-toucan-grey-100">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-toucan-grey-400 mt-1">
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && (
                <div className="flex items-center gap-3">
                  {actions}
                </div>
              )}
            </div>
          )}

          {/* Page Content */}
          <div className="pb-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
```

### Updated Header Component

**File:** `frontend/src/components/organisms/Header.tsx`

```typescript
import React from 'react';
import { Link } from 'react-router-dom';
import { UserDropdown } from '../molecules/UserDropdown';
import { ProjectSelector } from '../molecules/ProjectSelector';
import { useAuth } from '../../hooks/useAuth';
import { useProject } from '../../hooks/useProject';

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { selectedProjectId, selectProject } = useProject();

  return (
    <header className="bg-toucan-dark-card border-b border-toucan-dark-border">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between">
        {/* Left Side */}
        <div className="flex items-center gap-4">
          {/* Logo */}
          <Link to="/" className="text-xl font-bold flex items-center">
            <span className="text-toucan-orange">Handoff</span>
            <span className="text-toucan-grey-200 ml-1">AI</span>
          </Link>

          {/* Separator */}
          <div className="hidden sm:block w-px h-6 bg-toucan-dark-border" />

          {/* Project Selector */}
          <div className="hidden sm:block">
            <ProjectSelector
              selectedProjectId={selectedProjectId}
              onSelect={selectProject}
            />
          </div>
        </div>

        {/* Right Side */}
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

### Example: DashboardPage Using PageLayout

**File:** `frontend/src/pages/DashboardPage.tsx` (update)

```typescript
import React, { useState, useEffect } from 'react';
import { PageLayout } from '../components/templates/PageLayout';
import { useProject } from '../hooks/useProject';
import { api } from '../services/api';

export function DashboardPage() {
  const { selectedProjectId } = useProject();
  const [projectName, setProjectName] = useState('');
  const [specs, setSpecs] = useState([]);

  useEffect(() => {
    if (selectedProjectId) {
      loadProject();
      loadSpecs();
    }
  }, [selectedProjectId]);

  async function loadProject() {
    const response = await api.get(`/projects/${selectedProjectId}`);
    setProjectName(response.data.data.name);
  }

  async function loadSpecs() {
    // Load specs for this project
  }

  const breadcrumbs = projectName 
    ? [{ label: projectName }] 
    : [];

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Specifications"
      subtitle="Upload and manage your specification documents"
      actions={
        <button className="btn btn-primary">
          + Upload Spec
        </button>
      }
    >
      {/* Dashboard content */}
      <div className="grid gap-6">
        {/* Spec cards go here */}
      </div>
    </PageLayout>
  );
}
```

### Example: ReviewPage Using PageLayout

**File:** `frontend/src/pages/ReviewPage.tsx` (update)

```typescript
import React from 'react';
import { useParams } from 'react-router-dom';
import { PageLayout } from '../components/templates/PageLayout';

export function ReviewPage() {
  const { specId } = useParams();
  const projectName = 'Moorfields OpenEyes'; // Load from context
  const specName = 'Allergy Management'; // Load from spec

  const breadcrumbs = [
    { label: projectName, path: '/' },
    { label: specName }, // Current page, no path
  ];

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title={specName}
      actions={
        <>
          <button className="btn btn-secondary">Export to Jira</button>
          <button className="btn btn-primary">Translate</button>
        </>
      }
    >
      {/* Review page content */}
    </PageLayout>
  );
}
```

## Pages to Update

All pages should use `PageLayout`:

| Page | Breadcrumbs |
|------|-------------|
| DashboardPage | [Project Name] |
| ReviewPage | [Project Name, path=/] → [Spec Name] |
| TemplatesPage | [Project Name, path=/] → Templates |
| PreferencesPage | [Project Name, path=/] → Preferences |
| DependencyGraphPage | [Project Name, path=/] → [Spec Name, path=/review/:id] → Dependencies |
| CoveragePage | [Project Name, path=/] → [Spec Name, path=/review/:id] → Coverage |
| GroupStatusPage | [Project Name, path=/] → [Group Name] |
| ProjectsPage | Projects (no PageLayout - standalone) |

## Mobile Responsiveness

Navigation should collapse on mobile:

```typescript
// In Navigation.tsx
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

return (
  <nav className="bg-toucan-dark-card border-b border-toucan-dark-border">
    {/* Mobile Menu Button */}
    <div className="sm:hidden flex items-center justify-between px-4 py-3">
      <button 
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="text-toucan-grey-300"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {mobileMenuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>
    </div>
    
    {/* Desktop Navigation */}
    <div className="hidden sm:flex container mx-auto px-6">
      {/* Nav items */}
    </div>
    
    {/* Mobile Navigation */}
    {mobileMenuOpen && (
      <div className="sm:hidden border-t border-toucan-dark-border">
        {/* Nav items stacked vertically */}
      </div>
    )}
  </nav>
);
```

## Testing Checklist

- [ ] Navigation visible on dashboard
- [ ] Navigation visible on review page
- [ ] Dashboard link highlighted when on dashboard
- [ ] Templates link highlighted when on templates
- [ ] Nav items disabled when no project selected
- [ ] Breadcrumbs show correct path on each page
- [ ] Breadcrumb links navigate correctly
- [ ] Current breadcrumb is not clickable
- [ ] Mobile menu toggle works
- [ ] Page titles and actions display correctly
- [ ] Consistent layout across all pages

## Files to Create

```
frontend/src/
├── components/
│   ├── molecules/
│   │   └── Breadcrumbs.tsx
│   ├── organisms/
│   │   └── Navigation.tsx
│   └── templates/
│       └── PageLayout.tsx
```

## Files to Modify

- `frontend/src/components/organisms/Header.tsx` - integrate ProjectSelector
- `frontend/src/pages/DashboardPage.tsx` - use PageLayout
- `frontend/src/pages/ReviewPage.tsx` - use PageLayout
- `frontend/src/pages/TemplatesPage.tsx` - use PageLayout
- `frontend/src/pages/PreferencesPage.tsx` - use PageLayout
- `frontend/src/pages/DependencyGraphPage.tsx` - use PageLayout
- `frontend/src/pages/CoveragePage.tsx` - use PageLayout
- `frontend/src/pages/GroupStatusPage.tsx` - use PageLayout

## Dependencies

- Feature 11 (User Session) - Header, UserDropdown
- Feature 12 (Project Management) - ProjectSelector, useProject

## Effort Estimate

**2 hours**
- Navigation component: 30 min
- Breadcrumbs component: 20 min
- PageLayout template: 20 min
- Update existing pages: 40 min
- Mobile responsiveness: 10 min
- Testing: 10 min
