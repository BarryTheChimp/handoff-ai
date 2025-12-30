# CLAUDE.md - Handoff AI

> **This file is the single source of truth for this project.**
> Claude Code: Read this file completely before starting any work.

---

## Project Overview

| Field | Value |
|-------|-------|
| **Name** | Handoff AI |
| **Purpose** | The bridge between product specs and developer-ready work. Transforms specification documents into structured, actionable Jira tickets. |
| **Owner** | Toucan Labs |
| **Status** | Phase 1 - Foundation |

### What Handoff AI Does

1. **Upload** any specification document (API specs, requirements, design docs)
2. **AI translates** product language into developer-ready work packages
3. **Review & refine** the generated breakdown in an interactive UI
4. **Export** directly to Jira with proper linking

### The Problem It Solves

The handoff between product/management and engineering is messy:
- Specs are written in product language, devs need technical tasks
- Breaking down specs takes hours and is inconsistent
- Context gets lost in translation

Handoff AI bridges that gap. Clean specs in, actionable tickets out.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your CLAUDE_API_KEY

# 3. Start database (requires Docker)
docker-compose up -d db

# 4. Run migrations
cd backend && npx prisma migrate dev && cd ..

# 5. Start development
npm run dev
```

Frontend: `http://localhost:3000`
Backend: `http://localhost:3001`

---

## Documentation Map

| Document | Location | Read When |
|----------|----------|-----------|
| Technical Spec | `docs/SPEC.md` | Understanding full requirements |
| Architecture | `docs/ARCHITECTURE.md` | Making structural decisions |
| Implementation Prompts | `docs/PROMPTS.md` | Starting each build phase |
| API Reference | `docs/API.md` | Working on endpoints |
| Decisions Log | `docs/DECISIONS.md` | Recording/reviewing choices |
| Branding | `design/BRANDING.md` | Working on UI |
| Design Tokens | `design/tokens.json` | Styling components |

---

## Tech Stack

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| **Frontend** | React | 18.x | Functional components, hooks |
| **State** | Zustand | 4.x | Simple, no boilerplate |
| **Styling** | Tailwind CSS | 3.x | Custom Toucan theme |
| **Backend** | Node.js | 20.x LTS | |
| **Framework** | Fastify | 4.x | Fast, schema validation |
| **Database** | PostgreSQL | 15.x | With Prisma ORM 5.x |
| **AI** | Claude API | claude-sonnet-4-20250514 | For translation/decomposition |
| **Testing** | Vitest + Playwright | Latest | Unit + E2E |

---

## Project Structure

```
handoff-ai/
├── CLAUDE.md                    ← YOU ARE HERE
├── README.md                    # Human-readable overview
├── package.json                 # Workspace root
├── docker-compose.yml           # Local services
├── .env.example                 # Environment template
│
├── docs/                        # Documentation
│   ├── SPEC.md                  # Full technical specification
│   ├── ARCHITECTURE.md          # System design & ADRs
│   ├── PROMPTS.md               # Phase-by-phase build prompts
│   ├── API.md                   # API endpoint documentation
│   └── DECISIONS.md             # Decision log
│
├── design/                      # Design system
│   ├── BRANDING.md              # Brand guidelines
│   ├── tokens.json              # Design tokens (colours, spacing)
│   └── components/              # Component mockups (if any)
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts             # Entry point
│   │   ├── app.ts               # Fastify app setup
│   │   ├── services/            # Business logic (DEEP MODULES)
│   │   │   ├── DocumentService.ts
│   │   │   ├── TranslationService.ts
│   │   │   ├── ReviewService.ts
│   │   │   ├── JiraService.ts
│   │   │   └── SpecTypeService.ts
│   │   ├── routes/              # API endpoints (THIN LAYER)
│   │   │   ├── auth.ts
│   │   │   ├── specs.ts
│   │   │   ├── workitems.ts
│   │   │   └── exports.ts
│   │   ├── models/              # Type definitions
│   │   ├── config/
│   │   │   └── spec-types/      # Spec type configurations
│   │   │       ├── api-spec.json
│   │   │       ├── requirements-doc.json
│   │   │       └── design-doc.json
│   │   ├── prompts/             # LLM prompt templates
│   │   │   ├── api-spec/
│   │   │   ├── requirements-doc/
│   │   │   └── design-doc/
│   │   └── utils/
│   ├── prisma/
│   │   └── schema.prisma
│   └── tests/
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx             # Entry point
│   │   ├── App.tsx              # Root component
│   │   ├── components/
│   │   │   ├── atoms/           # Button, Input, Badge, Icon, Spinner
│   │   │   ├── molecules/       # FormField, TreeNode, EditableText
│   │   │   ├── organisms/       # WorkBreakdownTree, StoryEditor
│   │   │   └── templates/       # ReviewLayout, DashboardLayout
│   │   ├── pages/               # Route pages
│   │   ├── stores/              # Zustand stores
│   │   ├── hooks/               # Custom hooks
│   │   ├── services/            # API client
│   │   └── styles/              # Global styles
│   └── tests/
│
└── scripts/
    └── setup.sh                 # Initial setup script
```

---

## Coding Conventions

### The Golden Rules

1. **Deep modules** - Services have simple interfaces, complex implementations hidden inside
2. **Information hiding** - Implementation details stay in modules, not exposed via interfaces
3. **Consistency** - Same patterns everywhere, no special cases
4. **Test alongside** - Write tests as you build, not after

### TypeScript

```typescript
// ✅ DO: Explicit types for function signatures
async function translateSpec(specId: string): Promise<TranslationResult> {
  // ...
}

// ✅ DO: Interfaces for object shapes
interface WorkItem {
  id: string;
  title: string;
  type: WorkItemType;
  parentId: string | null;
}

// ✅ DO: Enums for fixed sets of values
type WorkItemType = 'epic' | 'feature' | 'story';
type WorkItemStatus = 'draft' | 'ready_for_review' | 'approved' | 'exported';

// ❌ DON'T: Use 'any'
function process(data: any): any { } // NEVER DO THIS

// ❌ DON'T: Inline object types repeatedly
function create(item: { id: string; title: string }) { } // Define an interface
```

### React Components

```tsx
// ✅ DO: Named exports with explicit props interface
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export function Button({ 
  variant, 
  size = 'md', 
  disabled = false,
  onClick, 
  children 
}: ButtonProps) {
  return (
    <button
      className={cn(
        'btn',
        `btn-${variant}`,
        `btn-${size}`,
        disabled && 'btn-disabled'
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ❌ DON'T: Default exports
export default function Button() { } // Makes refactoring harder

// ❌ DON'T: Props without interface
export function Button(props) { } // No type safety
```

### Services (Backend)

```typescript
// ✅ DO: Services are deep modules with simple interfaces
// TranslationService.ts

interface TranslationService {
  translate(specId: string): Promise<TranslationResult>;
  getWorkItems(specId: string): Promise<WorkItem[]>;
}

// Implementation is complex but hidden
class TranslationServiceImpl implements TranslationService {
  async translate(specId: string): Promise<TranslationResult> {
    // 1. Load spec and sections
    // 2. Run 4-pass AI pipeline
    // 3. Create work item hierarchy
    // 4. Link to source sections
    // 5. Return result with stats
    // All complexity hidden behind simple interface
  }
}

// ❌ DON'T: Shallow modules that just pass through
class BadService {
  async save(item: WorkItem) {
    return this.repository.save(item); // No value added
  }
}
```

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| React Components | PascalCase | `StoryEditor.tsx` |
| Hooks | camelCase, 'use' prefix | `useTreeState.ts` |
| Services | PascalCase, 'Service' suffix | `TranslationService.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Types/Interfaces | PascalCase | `WorkItem.ts` |
| Constants | SCREAMING_SNAKE | `API_ENDPOINTS.ts` |
| Test files | Same name + `.test` | `StoryEditor.test.tsx` |
| Config files | kebab-case | `api-spec.json` |

### Comments

```typescript
// ✅ DO: Comment WHY, not WHAT
// Retry 3x because Claude API has occasional cold-start timeouts
const result = await retryWithBackoff(apiCall, { maxRetries: 3 });

// ✅ DO: Interface comments for public functions
/**
 * Translates a specification into work items using a 4-pass AI pipeline.
 * 
 * @param specId - The spec to translate (must have status 'ready')
 * @returns Translation result including epics, stories, and any warnings
 * @throws {TranslationError} If AI calls fail after retries
 * @throws {SpecNotFoundError} If specId doesn't exist
 */
async function translate(specId: string): Promise<TranslationResult>

// ❌ DON'T: Comment obvious code
// Loop through items (USELESS - we can see it's a loop)
for (const item of items) { }

// ❌ DON'T: Leave commented-out code
// const oldWay = doThing(); // DELETE THIS, don't comment it
```

### Error Handling

```typescript
// ✅ DO: Specific error types
class SpecNotFoundError extends Error {
  constructor(specId: string) {
    super(`Spec not found: ${specId}`);
    this.name = 'SpecNotFoundError';
  }
}

// ✅ DO: Handle errors at appropriate level
async function getSpec(id: string) {
  const spec = await db.spec.findUnique({ where: { id } });
  if (!spec) {
    throw new SpecNotFoundError(id);
  }
  return spec;
}

// ✅ DO: Catch and transform in routes
fastify.get('/specs/:id', async (request, reply) => {
  try {
    const spec = await specService.getSpec(request.params.id);
    return spec;
  } catch (error) {
    if (error instanceof SpecNotFoundError) {
      return reply.status(404).send({ 
        error: { code: 'NOT_FOUND', message: error.message } 
      });
    }
    throw error; // Let Fastify handle unexpected errors
  }
});

// ❌ DON'T: Swallow errors silently
try {
  await riskyOperation();
} catch (e) {
  // This hides bugs!
}
```

---

## Design System

### Colours (Toucan Labs)

```css
/* Primary - Use for actions, highlights, emphasis */
--toucan-orange: #FF6B35;
--toucan-orange-light: #FF8F66;    /* Hover states */
--toucan-orange-dark: #E55A2B;     /* Active/pressed */

/* Backgrounds - Dark theme */
--toucan-dark: #1A1A2E;            /* Page background */
--toucan-dark-lighter: #252542;    /* Cards, panels */
--toucan-dark-border: #3D3D5C;     /* Borders, dividers */

/* Text */
--toucan-grey-100: #F5F5F7;        /* Primary text */
--toucan-grey-200: #E5E5E7;        /* Secondary text */
--toucan-grey-400: #9999A5;        /* Muted/placeholder */
--toucan-grey-600: #66667A;        /* Disabled */

/* Semantic */
--toucan-success: #4ADE80;         /* Success, approved */
--toucan-warning: #FBBF24;         /* Warning, needs attention */
--toucan-error: #F87171;           /* Error, destructive */
--toucan-info: #60A5FA;            /* Info, links */
```

### Typography

- **Primary Font:** Inter
- **Mono Font:** JetBrains Mono

| Scale | Size | Line Height | Usage |
|-------|------|-------------|-------|
| xs | 12px | 16px | Labels, captions |
| sm | 14px | 20px | Secondary text, metadata |
| base | 16px | 24px | Body text |
| lg | 18px | 28px | Subheadings |
| xl | 20px | 28px | Section headers |
| 2xl | 24px | 32px | Page titles |
| 3xl | 30px | 36px | Hero text |

### Spacing

Use Tailwind's scale: `1 = 4px`

Common values: `1`(4px), `2`(8px), `3`(12px), `4`(16px), `6`(24px), `8`(32px)

### Border Radius

- `sm`: 4px - Badges, chips
- `md`: 6px - Buttons, inputs
- `lg`: 8px - Cards, modals

### Component Patterns

**Buttons:**
```tsx
// Primary action
<button className="bg-toucan-orange text-white px-4 py-2 rounded-md 
  hover:bg-toucan-orange-light active:bg-toucan-orange-dark
  disabled:opacity-50 disabled:cursor-not-allowed">

// Secondary
<button className="bg-transparent text-toucan-grey-100 border border-toucan-dark-border 
  px-4 py-2 rounded-md hover:bg-toucan-dark-lighter">

// Ghost
<button className="bg-transparent text-toucan-grey-400 px-4 py-2 rounded-md 
  hover:text-toucan-grey-100 hover:bg-toucan-dark-lighter">
```

**Cards:**
```tsx
<div className="bg-toucan-dark-lighter border border-toucan-dark-border 
  rounded-lg p-6">
```

**Inputs:**
```tsx
<input className="bg-toucan-dark border border-toucan-dark-border rounded-md 
  px-3 py-2 text-toucan-grey-100 placeholder-toucan-grey-400
  focus:outline-none focus:ring-2 focus:ring-toucan-orange focus:border-transparent">
```

**Tree Node (selected):**
```tsx
<div className="bg-toucan-orange/20 border-l-3 border-toucan-orange 
  px-3 py-2 text-toucan-grey-100">
```

---

## API Conventions

### Endpoints

```
# Resources follow REST conventions
GET    /api/specs              # List all specs
POST   /api/specs              # Upload new spec
GET    /api/specs/:id          # Get spec by ID
DELETE /api/specs/:id          # Delete spec

# Actions use POST with verb
POST   /api/specs/:id/extract     # Trigger text extraction
POST   /api/specs/:id/translate   # Trigger AI translation
POST   /api/specs/:id/export      # Export to Jira

# Nested resources
GET    /api/specs/:id/sections    # Get spec sections
GET    /api/specs/:id/workitems   # Get work items for spec

# Work item operations
GET    /api/workitems             # List (with filters)
PATCH  /api/workitems/:id         # Update fields
POST   /api/workitems/:id/split   # Split into multiple
POST   /api/workitems/:id/move    # Change parent
POST   /api/workitems/merge       # Merge multiple

# Auth
POST   /api/auth/login            # Get JWT token
GET    /api/auth/me               # Get current user
```

### Response Format

```typescript
// Success response
interface SuccessResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

// Error response
interface ErrorResponse {
  error: {
    code: string;       // Machine-readable: 'VALIDATION_ERROR'
    message: string;    // Human-readable: 'Invalid email format'
    details?: Record<string, string>;  // Field-level errors
  };
}
```

### HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success (GET, PATCH) |
| 201 | Created (POST) |
| 202 | Accepted (async operations) |
| 204 | No Content (DELETE) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (e.g., concurrent edit) |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## Testing Standards

### Test Pyramid

```
         ╱╲
        ╱  ╲       E2E Tests (10%)
       ╱────╲      Critical user journeys only
      ╱      ╲
     ╱────────╲    Integration Tests (20%)
    ╱          ╲   API endpoints, DB operations
   ╱────────────╲
  ╱              ╲  Unit Tests (70%)
 ╱────────────────╲ Functions, services, components
```

### Test Location

Tests live next to the code:
```
services/
  TranslationService.ts
  TranslationService.test.ts
components/
  atoms/
    Button.tsx
    Button.test.tsx
```

### Test Naming

```typescript
describe('TranslationService', () => {
  describe('translate', () => {
    it('generates epics from API spec sections', async () => {
      // Arrange
      const spec = await createTestSpec('api');
      
      // Act
      const result = await translationService.translate(spec.id);
      
      // Assert
      expect(result.epics).toHaveLength(2);
      expect(result.epics[0].title).toContain('API');
    });

    it('throws TranslationError when AI fails after retries', async () => {
      mockClaudeApi.failAll();
      
      await expect(translationService.translate('spec-123'))
        .rejects.toThrow(TranslationError);
    });
  });
});
```

### What to Test

**Always test:**
- Service methods (business logic)
- Utility functions
- API endpoint responses
- Component rendering with different props
- Error conditions

**Don't test:**
- Third-party libraries
- Trivial code (getters/setters)
- Implementation details (private methods)

---

## Git Workflow

### Branch Names

```
feature/add-jira-export
feature/story-split-merge
fix/tree-drag-drop-order
fix/export-rate-limiting
refactor/translation-pipeline
docs/update-api-reference
test/add-export-integration-tests
```

### Commit Messages

Follow Conventional Commits:

```
feat: add story split functionality
fix: correct parent linking during Jira export
refactor: simplify translation pipeline
docs: update API documentation
test: add integration tests for export service
chore: update dependencies
```

### Commit Frequency

- Commit after each logical unit of work
- Don't commit broken code
- Each commit should pass tests

---

## Common Pitfalls

### ❌ Things That Will Break The Build

1. **Using `any` type** - Always define proper types
2. **Skipping error handling** - Every async needs try/catch
3. **Hardcoding values** - Use config/env vars
4. **Business logic in routes** - Routes are thin, services are deep
5. **Forgetting loading states** - Every async action needs loading/error/success
6. **Not running lint** - Always run `npm run lint` before commit

### ✅ Things That Will Make The Code Better

1. **Check existing components** - Don't reinvent, reuse atoms/molecules
2. **Follow the spec type pattern** - For any new document types
3. **Update DECISIONS.md** - Record why you made choices
4. **Write tests alongside** - Not after, alongside
5. **Keep services deep** - Simple interface, complex implementation hidden

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `CLAUDE_API_KEY` | Yes | - | Anthropic API key |
| `JWT_SECRET` | Yes | - | Secret for JWT signing |
| `PORT` | No | 3001 | Backend server port |
| `NODE_ENV` | No | development | Environment mode |
| `JIRA_CLIENT_ID` | No | - | Jira OAuth client ID |
| `JIRA_CLIENT_SECRET` | No | - | Jira OAuth secret |
| `STORAGE_PATH` | No | ./uploads | File upload directory |

---

## Current Status

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation | 🔲 Not started |
| 2 | Document Processing | 🔲 Not started |
| 3 | AI Translation | 🔲 Not started |
| 4 | Review Interface | 🔲 Not started |
| 5 | Advanced Editing | 🔲 Not started |
| 6 | Jira Export | 🔲 Not started |
| 7 | Polish | 🔲 Not started |
| 8 | Testing & Launch | 🔲 Not started |

**Next Action:** Start Phase 1 - See `docs/PROMPTS.md`

---

## How to Use This File

When starting a Claude Code session:

1. Tell Claude Code to read this file first
2. Reference the specific phase/prompt from `docs/PROMPTS.md`
3. Let Claude Code implement according to these standards

Example first message:
> "Read CLAUDE.md completely. Then read docs/PROMPTS.md and implement Phase 1, Prompt 1.1 (Project Setup)."

---

*Last updated: December 2024*
