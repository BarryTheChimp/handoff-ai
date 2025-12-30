# Architecture

## System Overview

Handoff AI is a **modular monolith** designed for potential future service extraction.

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│                    React + Zustand + Tailwind                   │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  Upload  │ │ Settings │ │  Review  │ │   Dashboard      │  │
│  │  Page    │ │  Modal   │ │  Page    │ │     Page         │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
│                                                                 │
│  Components: atoms → molecules → organisms → templates          │
│  State: Zustand stores (tree, editor, auth)                    │
│  API Client: Typed fetch wrapper                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP/REST
                         │
┌────────────────────────┼────────────────────────────────────────┐
│                    API LAYER                                    │
│                 Fastify + TypeScript                            │
│                                                                 │
│  Routes: /auth, /specs, /workitems, /exports, /jira             │
│  Middleware: auth, validation, error handling                   │
│  Thin layer - delegates to services                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────────────────┐
│                   SERVICE LAYER                                 │
│              Business Logic (Deep Modules)                      │
│                                                                 │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐      │
│  │   Document     │ │  Translation   │ │    Review      │      │
│  │   Service      │ │    Service     │ │    Service     │      │
│  │                │ │                │ │                │      │
│  │ • upload()     │ │ • translate()  │ │ • update()     │      │
│  │ • extract()    │ │ • Pass 1-4     │ │ • split()      │      │
│  │ • getContent() │ │ • AI pipeline  │ │ • merge()      │      │
│  └────────────────┘ └────────────────┘ └────────────────┘      │
│                                                                 │
│  ┌────────────────┐ ┌────────────────┐                         │
│  │     Jira       │ │   SpecType     │                         │
│  │    Service     │ │    Service     │                         │
│  │                │ │                │                         │
│  │ • auth()       │ │ • loadTypes()  │                         │
│  │ • export()     │ │ • getPrompts() │                         │
│  │ • batchCreate()│ │ • validate()   │                         │
│  └────────────────┘ └────────────────┘                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────┼────────────────────────────────────────┐
│                    DATA LAYER                                   │
│                    Prisma ORM                                   │
│                                                                 │
│  Models: Project, Spec, SpecSection, WorkItem, etc.            │
│  Migrations: Version controlled                                 │
│  Transactions: For atomic operations                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────────┐
│                   EXTERNAL SERVICES                             │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │PostgreSQL│  │  Claude  │  │   File   │  │   Jira   │       │
│  │    DB    │  │   API    │  │  Storage │  │   Cloud  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Upload → Translate → Export

```
User uploads file
       │
       ▼
┌──────────────────┐
│ DocumentService  │
│                  │
│ 1. Validate file │
│ 2. Store to disk │
│ 3. Create record │
│ 4. Extract text  │
│ 5. Parse sections│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│TranslationService│
│                  │
│ Pass 1: Structure│
│ Pass 2: Epics    │
│ Pass 3: Stories  │
│ Pass 4: Enrich   │
│                  │
│ Store WorkItems  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  ReviewService   │
│                  │
│ User edits items │
│ CRUD operations  │
│ History tracking │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   JiraService    │
│                  │
│ 1. Authenticate  │
│ 2. Map fields    │
│ 3. Batch create  │
│ 4. Link parents  │
│ 5. Return keys   │
└──────────────────┘
```

---

## Architecture Decision Records

### ADR-001: Modular Monolith

**Date:** December 2024  
**Status:** Accepted

**Context:**  
Choosing between microservices and monolith architecture.

**Decision:**  
Start as a modular monolith with clear service boundaries.

**Rationale:**
- Internal tool with small team
- Service boundaries aren't proven yet
- Simpler deployment and debugging
- Can extract services later when boundaries are validated

**Consequences:**
- Services communicate via function calls, not HTTP
- Shared database
- Must maintain module boundaries in code

---

### ADR-002: Spec Types as Configuration

**Date:** December 2024  
**Status:** Accepted

**Context:**  
Handoff AI needs to handle multiple document types (API specs, requirements, design docs).

**Decision:**  
Define spec types via JSON configuration files, not code.

**Rationale:**
- Adding new spec type requires no code change
- Prompt templates are data, not code
- Each type can have custom translation rules

**Implementation:**
```
config/spec-types/
├── api-spec.json
├── requirements-doc.json
└── design-doc.json
```

---

### ADR-003: 4-Pass AI Pipeline

**Date:** December 2024  
**Status:** Accepted

**Context:**  
Single-prompt translation produced inconsistent results.

**Decision:**  
Use 4 separate Claude API calls:
1. Structure analysis
2. Epic generation
3. Feature/story generation
4. Enrichment and validation

**Rationale:**
- Each pass has focused responsibility
- Easier to debug which pass is failing
- Can tune temperature/model per pass
- Smaller prompts = better results

---

### ADR-004: PostgreSQL with Prisma

**Date:** December 2024  
**Status:** Accepted

**Context:**  
Need a database for storing specs, work items, and history.

**Decision:**  
Use PostgreSQL with Prisma ORM.

**Rationale:**
- Relational model fits hierarchical work items
- JSONB for flexible metadata
- Prisma provides type-safe queries
- WITH RECURSIVE for tree queries

---

### ADR-005: Zustand for Frontend State

**Date:** December 2024  
**Status:** Accepted

**Context:**  
Need state management for tree view, editor, and async operations.

**Decision:**  
Use Zustand instead of Redux.

**Rationale:**
- Minimal boilerplate
- No provider wrapper needed
- Good TypeScript support
- Sufficient for our complexity level

---

## Module Boundaries

### What Can Import What

```
Routes ──────────► Services ──────────► Utils
   │                  │                   │
   │                  ▼                   │
   │              Models ◄────────────────┘
   │                  │
   └──────────────────┴──────────► Prisma Client
```

### Forbidden Imports

- ❌ Services importing from Routes
- ❌ Utils importing from Services
- ❌ Cross-service imports (DocumentService → JiraService)
- ❌ Frontend importing backend code

---

*Last updated: December 2024*
