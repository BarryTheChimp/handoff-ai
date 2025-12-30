# Feature 12: Project Management

## Overview

**What:** Full project CRUD with project selector in header. Remove all hardcoded `default-project` references.

**Why:** Currently all specs go to a hardcoded project. Users need to create projects, switch between them, and have specs properly isolated.

**Success Criteria:**
- Users can create, view, edit, delete projects
- Header shows project selector dropdown
- Selected project persists in localStorage
- All operations scoped to selected project
- No hardcoded project IDs anywhere

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-12.1 | System SHALL display list of all projects at /projects |
| FR-12.2 | System SHALL allow creating new project with name and optional description |
| FR-12.3 | System SHALL allow editing project name, description, Jira key |
| FR-12.4 | System SHALL allow deleting project with confirmation |
| FR-12.5 | Delete SHALL cascade to all specs, work items, preferences |
| FR-12.6 | System SHALL show project selector in header |
| FR-12.7 | Selected project SHALL persist in localStorage |
| FR-12.8 | Dashboard SHALL filter specs by selected project |
| FR-12.9 | System SHALL redirect to /projects if no project selected |
| FR-12.10 | Project card SHALL show spec count and last updated |

## Database

The `Project` model already exists. Add description field:

```prisma
model Project {
  id              String   @id @default(uuid())
  name            String
  description     String?  @db.Text  // ADD THIS
  jiraProjectKey  String?  @map("jira_project_key")
  settings        Json     @default("{}")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // Relations
  specs       Spec[]
  specGroups  SpecGroup[]
  templates   StoryTemplate[]
  preferences TeamPreference[]
  
  @@map("projects")
}
```

**Migration:**
```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;
```

## API Specification

### GET /api/projects

List all projects with stats.

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid-1",
      "name": "Moorfields OpenEyes",
      "description": "OpenEyes EMR integration for Moorfields Eye Hospital",
      "jiraProjectKey": "MOE",
      "specCount": 7,
      "workItemCount": 145,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-20T15:30:00Z"
    }
  ]
}
```

### POST /api/projects

Create new project.

**Request:**
```json
{
  "name": "Moorfields OpenEyes",
  "description": "OpenEyes EMR integration",
  "jiraProjectKey": "MOE"
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid-new",
    "name": "Moorfields OpenEyes",
    "description": "OpenEyes EMR integration",
    "jiraProjectKey": "MOE",
    "specCount": 0,
    "workItemCount": 0,
    "createdAt": "2024-01-20T16:00:00Z",
    "updatedAt": "2024-01-20T16:00:00Z"
  }
}
```

**Validation:**
- `name` required, 1-100 characters
- `description` optional, max 1000 characters
- `jiraProjectKey` optional, uppercase letters/numbers, 2-10 characters

### GET /api/projects/:id

Get single project with details.

**Response 200:**
```json
{
  "data": {
    "id": "uuid-1",
    "name": "Moorfields OpenEyes",
    "description": "OpenEyes EMR integration",
    "jiraProjectKey": "MOE",
    "specCount": 7,
    "workItemCount": 145,
    "specs": [
      { "id": "spec-1", "name": "Allergy Management", "status": "translated" },
      { "id": "spec-2", "name": "Demographics Updates", "status": "ready" }
    ],
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-20T15:30:00Z"
  }
}
```

### PUT /api/projects/:id

Update project.

**Request:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "jiraProjectKey": "NEW"
}
```

**Response 200:** Updated project object.

### DELETE /api/projects/:id

Delete project and all related data.

**Response 204:** No content.

**Cascade deletes:**
- All Specs (and their WorkItems, Sections, etc.)
- All SpecGroups
- All Templates
- All Preferences

## Frontend Components

### ProjectsPage

**File:** `frontend/src/pages/ProjectsPage.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/organisms/Header';
import { api } from '../services/api';

interface Project {
  id: string;
  name: string;
  description?: string;
  jiraProjectKey?: string;
  specCount: number;
  workItemCount: number;
  updatedAt: string;
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const response = await api.get('/projects');
      setProjects(response.data.data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  }

  function selectProject(projectId: string) {
    localStorage.setItem('selected_project_id', projectId);
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-toucan-dark">
      <Header />
      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-toucan-grey-100">Projects</h1>
            <p className="text-toucan-grey-400 mt-1">
              Select a project or create a new one
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn btn-primary"
          >
            + New Project
          </button>
        </div>

        {loading ? (
          <LoadingState />
        ) : projects.length === 0 ? (
          <EmptyState onCreate={() => setShowCreate(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onSelect={() => selectProject(project.id)}
                onEdit={() => navigate(`/projects/${project.id}/settings`)}
              />
            ))}
          </div>
        )}

        {showCreate && (
          <CreateProjectModal
            onClose={() => setShowCreate(false)}
            onCreate={(project) => {
              setProjects([...projects, project]);
              selectProject(project.id);
            }}
          />
        )}
      </main>
    </div>
  );
}
```

### ProjectCard

**File:** `frontend/src/components/molecules/ProjectCard.tsx`

```typescript
import React from 'react';

interface Project {
  id: string;
  name: string;
  description?: string;
  specCount: number;
  workItemCount: number;
  updatedAt: string;
}

interface ProjectCardProps {
  project: Project;
  onSelect: () => void;
  onEdit: () => void;
}

export function ProjectCard({ project, onSelect, onEdit }: ProjectCardProps) {
  const timeAgo = formatTimeAgo(project.updatedAt);

  return (
    <div
      onClick={onSelect}
      className="bg-toucan-dark-card border border-toucan-dark-border rounded-lg p-6 
                 hover:border-toucan-orange/50 cursor-pointer transition-all
                 hover:shadow-lg hover:shadow-toucan-orange/5 group"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-toucan-grey-100 
                         group-hover:text-toucan-orange transition-colors truncate">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-sm text-toucan-grey-400 mt-1 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-2 text-toucan-grey-500 hover:text-toucan-grey-200 
                     rounded-md hover:bg-toucan-dark-lighter ml-2"
          aria-label="Project settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mt-4 text-sm text-toucan-grey-400">
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {project.specCount} specs
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {project.workItemCount} stories
        </span>
      </div>

      {/* Footer */}
      <div className="text-xs text-toucan-grey-500 mt-4 pt-4 border-t border-toucan-dark-border">
        Updated {timeAgo}
      </div>
    </div>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
```

### ProjectSelector

**File:** `frontend/src/components/molecules/ProjectSelector.tsx`

```typescript
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

interface Project {
  id: string;
  name: string;
}

interface ProjectSelectorProps {
  selectedProjectId: string | null;
  onSelect: (projectId: string) => void;
}

export function ProjectSelector({ selectedProjectId, onSelect }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId && projects.length > 0) {
      const project = projects.find((p) => p.id === selectedProjectId);
      setSelectedProject(project || null);
    }
  }, [selectedProjectId, projects]);

  async function loadProjects() {
    try {
      const response = await api.get('/projects');
      setProjects(response.data.data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  }

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

  function handleSelect(project: Project) {
    setSelectedProject(project);
    onSelect(project.id);
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md 
                   bg-toucan-dark-lighter border border-toucan-dark-border
                   hover:border-toucan-grey-600 transition-colors text-sm"
      >
        <svg className="w-4 h-4 text-toucan-grey-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span className="text-toucan-grey-200 max-w-[150px] truncate">
          {selectedProject ? selectedProject.name : 'Select Project'}
        </span>
        <svg 
          className={`w-4 h-4 text-toucan-grey-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 bg-toucan-dark-card border border-toucan-dark-border rounded-lg shadow-xl z-50">
          {/* Project List */}
          <div className="py-1 max-h-64 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="px-4 py-3 text-sm text-toucan-grey-400">
                No projects yet
              </div>
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleSelect(project)}
                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                    project.id === selectedProjectId
                      ? 'bg-toucan-orange/10 text-toucan-orange'
                      : 'text-toucan-grey-200 hover:bg-toucan-dark-lighter'
                  }`}
                >
                  {project.id === selectedProjectId && (
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  <span className={`truncate ${project.id === selectedProjectId ? '' : 'ml-6'}`}>
                    {project.name}
                  </span>
                </button>
              ))
            )}
          </div>
          
          {/* Footer */}
          <div className="border-t border-toucan-dark-border py-1">
            <Link
              to="/projects"
              className="block px-4 py-2 text-sm text-toucan-grey-400 hover:text-toucan-grey-200 hover:bg-toucan-dark-lighter"
              onClick={() => setIsOpen(false)}
            >
              Manage Projects →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
```

### useProject Hook

**File:** `frontend/src/hooks/useProject.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';

export function useProject() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('selected_project_id');
    if (stored) {
      setSelectedProjectId(stored);
    }
  }, []);

  const selectProject = useCallback((projectId: string) => {
    localStorage.setItem('selected_project_id', projectId);
    setSelectedProjectId(projectId);
  }, []);

  const clearProject = useCallback(() => {
    localStorage.removeItem('selected_project_id');
    setSelectedProjectId(null);
  }, []);

  return {
    selectedProjectId,
    selectProject,
    clearProject,
    hasProject: selectedProjectId !== null,
  };
}
```

## Backend Implementation

**File:** `backend/src/routes/projects.ts`

```typescript
import { FastifyPluginCallback } from 'fastify';
import { PrismaClient } from '@prisma/client';

interface ProjectsPluginOptions {
  prisma: PrismaClient;
}

export const projectRoutes: FastifyPluginCallback<ProjectsPluginOptions> = (
  app,
  { prisma },
  done
) => {
  // GET /api/projects
  app.get('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const projects = await prisma.project.findMany({
      include: {
        _count: { select: { specs: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        const workItemCount = await prisma.workItem.count({
          where: { spec: { projectId: project.id } },
        });
        return {
          id: project.id,
          name: project.name,
          description: project.description,
          jiraProjectKey: project.jiraProjectKey,
          specCount: project._count.specs,
          workItemCount,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        };
      })
    );

    return reply.send({ data: projectsWithCounts });
  });

  // POST /api/projects
  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { name, description, jiraProjectKey } = request.body as {
      name: string;
      description?: string;
      jiraProjectKey?: string;
    };

    if (!name?.trim()) {
      return reply.status(400).send({ error: { message: 'Name is required' } });
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        jiraProjectKey: jiraProjectKey?.trim().toUpperCase() || null,
      },
    });

    return reply.status(201).send({
      data: {
        ...project,
        specCount: 0,
        workItemCount: 0,
      },
    });
  });

  // GET /api/projects/:id
  app.get('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        specs: {
          select: { id: true, name: true, status: true, uploadedAt: true },
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });

    if (!project) {
      return reply.status(404).send({ error: { message: 'Project not found' } });
    }

    const workItemCount = await prisma.workItem.count({
      where: { spec: { projectId: id } },
    });

    return reply.send({
      data: {
        ...project,
        specCount: project.specs.length,
        workItemCount,
      },
    });
  });

  // PUT /api/projects/:id
  app.put('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, description, jiraProjectKey } = request.body as {
      name?: string;
      description?: string;
      jiraProjectKey?: string;
    };

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: { message: 'Project not found' } });
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        name: name?.trim() || existing.name,
        description: description !== undefined ? description?.trim() || null : existing.description,
        jiraProjectKey: jiraProjectKey !== undefined 
          ? jiraProjectKey?.trim().toUpperCase() || null 
          : existing.jiraProjectKey,
      },
    });

    return reply.send({ data: project });
  });

  // DELETE /api/projects/:id
  app.delete('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: { message: 'Project not found' } });
    }

    // Cascade handled by Prisma schema
    await prisma.project.delete({ where: { id } });

    return reply.status(204).send();
  });

  done();
};
```

## Critical: Remove Hardcoded Project ID

**Search and replace ALL instances of `default-project` or hardcoded project IDs.**

Pattern to find:
```typescript
// BAD - hardcoded
const projectId = 'default-project';
projectId: 'default-project'
```

Replace with:
```typescript
// GOOD - from hook
const { selectedProjectId } = useProject();

// Then use selectedProjectId, with redirect if null
if (!selectedProjectId) {
  return <Navigate to="/projects" replace />;
}
```

**Files likely containing hardcoded IDs:**
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/services/api.ts`
- `frontend/src/pages/TemplatesPage.tsx`
- `frontend/src/pages/PreferencesPage.tsx`

## Routes Update

**File:** `frontend/src/App.tsx`

Add new routes:
```typescript
import { ProjectsPage } from './pages/ProjectsPage';

// In Routes:
<Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
```

## Testing Checklist

- [ ] Navigate to /projects → see empty state or project list
- [ ] Click "New Project" → create modal opens
- [ ] Create project → project appears in list
- [ ] Create project → automatically selected and redirected to dashboard
- [ ] Click project card → project selected, go to dashboard
- [ ] Header shows project selector with selected project name
- [ ] Switch project in selector → dashboard updates
- [ ] Edit project settings → changes saved
- [ ] Delete project → confirmation dialog → removed
- [ ] Delete selected project → selection cleared, redirect to /projects
- [ ] No project selected + visit dashboard → redirect to /projects
- [ ] Refresh page → selected project persists

## Files to Create

```
frontend/src/
├── pages/
│   └── ProjectsPage.tsx
├── components/
│   └── molecules/
│       ├── ProjectCard.tsx
│       ├── ProjectSelector.tsx
│       └── CreateProjectModal.tsx
└── hooks/
    └── useProject.ts

backend/src/
└── routes/
    └── projects.ts
```

## Files to Modify

- `frontend/src/App.tsx` - add routes
- `frontend/src/components/organisms/Header.tsx` - add ProjectSelector
- `frontend/src/pages/DashboardPage.tsx` - use useProject, remove hardcoding
- `backend/src/index.ts` - register project routes
- `backend/prisma/schema.prisma` - add description field

## Dependencies

- Feature 11 (User Session) - Header component exists

## Effort Estimate

**4 hours**
- Backend routes: 1 hour
- ProjectsPage + ProjectCard: 1 hour
- ProjectSelector: 30 min
- useProject hook: 15 min
- Remove hardcoded IDs: 45 min
- CreateProjectModal: 20 min
- Testing: 10 min
