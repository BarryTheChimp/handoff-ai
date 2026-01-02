# Handoff AI - Complete Feature Context

**Purpose:** This document provides complete context for generating realistic mock data and test projects for Handoff AI.

**Application:** Handoff AI transforms product specification documents into developer-ready Jira tickets (Epics > Features > Stories).

---

## Table of Contents
1. [Core Workflow](#1-core-workflow)
2. [Data Models](#2-data-models)
3. [Features by Area](#3-features-by-area)
4. [UI Pages](#4-ui-pages)
5. [API Endpoints](#5-api-endpoints)
6. [Creating Realistic Mock Data](#6-creating-realistic-mock-data)

---

## 1. Core Workflow

### The Problem Handoff AI Solves
Product managers write specifications in product language. Developers need technical tasks. The handoff is messy, takes hours, and context gets lost.

### How It Works
1. **Upload** a specification document (PDF, DOCX, YAML, JSON, Markdown)
2. **AI extracts** sections and analyzes the document structure
3. **AI translates** product language into work items (Epics > Features > Stories)
4. **User reviews** the generated breakdown in an interactive tree view
5. **User refines** by editing, splitting, merging, and reordering items
6. **Export** to Jira with proper parent/child linking

### Work Item Hierarchy
```
Epic (major capability)
  └── Feature (grouped functionality)
       └── Story (single deliverable with acceptance criteria)
```

---

## 2. Data Models

### Project
The top-level container for all work.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | String | Project name (e.g., "Mobile Banking App") |
| description | Text | Project description/overview |
| jiraProjectKey | String? | Jira project key (e.g., "BANK") |
| settings | JSON | Project-specific settings |

### Spec (Specification Document)
An uploaded document to be translated.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| projectId | UUID | Parent project |
| specGroupId | UUID? | If part of a multi-file upload |
| name | String | Document name |
| filePath | String | Storage path |
| fileType | String | pdf, docx, yaml, json, md, txt |
| fileSize | Int | Size in bytes |
| extractedText | Text? | Full extracted text content |
| status | Enum | uploaded, extracting, ready, translating, translated, error |
| specType | String | api-spec, requirements-doc, design-doc |
| uploadedBy | String | User ID who uploaded |
| metadata | JSON | Additional metadata |

**Status Flow:** `uploaded` → `extracting` → `ready` → `translating` → `translated`

### SpecSection
A section/heading extracted from the document.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| specId | UUID | Parent spec |
| sectionRef | String | Reference like "1.2.3" or "API-001" |
| heading | String | Section heading text |
| content | Text | Section body content |
| orderIndex | Int | Display order |
| intentionallyUncovered | Boolean | Marked as not needing work items |

### WorkItem
An Epic, Feature, or Story generated from the spec.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| specId | UUID | Source spec |
| parentId | UUID? | Parent work item (for hierarchy) |
| type | Enum | epic, feature, story |
| title | String | Work item title |
| description | Text? | Detailed description |
| acceptanceCriteria | Text? | AC (typically bullet points or Gherkin) |
| technicalNotes | Text? | Implementation notes |
| sizeEstimate | Enum? | S, M, L, XL |
| status | Enum | draft, ready_for_review, approved, exported |
| orderIndex | Int | Display order within parent |
| jiraKey | String? | Jira issue key after export (e.g., "BANK-123") |
| templateId | UUID? | Story template used |
| customFields | JSON | Custom field values |
| dependsOnIds | String[] | IDs of work items this depends on |

**Status Flow:** `draft` → `ready_for_review` → `approved` → `exported`

### SpecGroup (Multi-File Upload)
A collection of related spec documents uploaded together.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| projectId | UUID | Parent project |
| name | String | Group name |
| primarySpecId | UUID? | The main/primary document |
| stitchedContext | Text? | Combined context from all docs |
| status | Enum | pending, analyzing, conflicts_detected, ready, error |

### SpecConflict
Detected conflicts between specs in a group.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| specGroupId | UUID | Parent group |
| spec1Id, spec2Id | UUID | The conflicting specs |
| spec1Section, spec2Section | String | Section references |
| spec1Text, spec2Text | Text | Conflicting content |
| conflictType | String | Type of conflict |
| severity | String | warning, error |
| resolution | String? | How it was resolved |
| mergedText | Text? | Merged resolution |

### StoryTemplate
Template for generating stories with specific format.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| projectId | UUID | Parent project |
| name | String | Template name (e.g., "API Story") |
| isDefault | Boolean | Use by default |
| acFormat | String | gherkin, bullets, checklist |
| requiredSections | String[] | Required sections |
| customFields | JSON | Custom field definitions |

### GlossaryTerm
Domain terminology for consistent AI generation.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| projectId | UUID | Parent project |
| term | String | The term (e.g., "ACH") |
| definition | Text | Definition (e.g., "Automated Clearing House - electronic payment network") |
| aliases | String[] | Alternative names |
| category | String? | Category (e.g., "Payments", "Security") |
| useInstead | String? | Preferred term |
| avoidTerms | String[] | Terms to avoid |

### ProjectKnowledge (Project Brief)
Core project context for AI.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| projectId | UUID | Parent project (1:1) |
| brief | Text? | Markdown project brief |

### TeamPreferencesConfig
Team conventions for AI generation.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| projectId | UUID | Parent project (1:1) |
| acFormat | Enum | gherkin, bullets, checklist, numbered |
| requiredSections | String[] | Always include these sections |
| maxAcCount | Int | Max acceptance criteria per story (default: 8) |
| verbosity | Enum | concise, balanced, detailed |
| technicalDepth | Enum | high_level, moderate, implementation |
| customPrefs | JSON | Custom preferences array |

### ReferenceDocument
Uploaded context documents (architecture docs, etc.).

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| projectId | UUID | Parent project |
| name | String | Display name |
| fileName | String | Original filename |
| filePath | String | Storage path |
| fileType | String | File extension |
| fileSize | Int | Size in bytes |
| extractedText | Text? | Extracted content |
| summary | Text? | AI-generated summary |
| docType | Enum | architecture, process, technical, business, other |
| isActive | Boolean | Include in AI context |

### AIFeedback
User feedback on AI-generated items.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| workItemId | UUID | The work item rated |
| userId | String | User who rated |
| rating | Int | 1 (thumbs down) or 5 (thumbs up) |
| feedback | Text? | Optional text feedback |
| categories | String[] | Issue categories |

### StoryEdit (Learning Loop)
Tracks changes made to AI-generated stories.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| projectId | UUID | Parent project |
| workItemId | UUID | Edited work item |
| field | Enum | title, description, acceptanceCriteria, technicalNotes, size, priority |
| beforeValue | Text | Original AI value |
| afterValue | Text | User's edited value |
| editType | Enum | addition, removal, modification, complete |

### LearnedPattern
Patterns detected from user edits.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| projectId | UUID | Parent project |
| pattern | Text | Detected pattern |
| description | Text | Human-readable description |
| confidence | Float | 0-1 confidence score |
| occurrences | Int | How many times observed |
| suggestion | Text | Suggested preference |
| suggestionType | Enum | addToPreferences, addToGlossary, updateTemplate, addRequiredSection |
| status | Enum | pending, suggested, accepted, dismissed, applied |

### ProjectHealth
Cached health score for project context setup.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| projectId | UUID | Parent project (1:1) |
| score | Int | 0-100 overall score |
| level | Enum | minimal, basic, good, excellent |
| briefScore | Int | 0-100 |
| glossaryScore | Int | 0-100 |
| prefsScore | Int | 0-100 |
| specsScore | Int | 0-100 |
| sourcesScore | Int | 0-100 |
| learningScore | Int | 0-100 |
| recommendations | JSON | String array of recommendations |

### UserSettings
User-specific settings (branding, exports).

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| userId | String | User ID (unique) |
| branding | JSON | {companyName, logoUrl, primaryColor, accentColor, darkMode} |
| jira | JSON | Jira connection settings |
| exportSettings | JSON | {defaultFormat, includeMetadata, flattenHierarchy} |

### Export
Tracks a Jira export job.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| specId | UUID | Spec being exported |
| userId | String | User who initiated |
| jiraProjectKey | String | Target Jira project |
| status | Enum | pending, in_progress, completed, failed, cancelled |
| isDryRun | Boolean | Preview only |
| totalItems | Int | Total work items |
| processedItems | Int | Items processed |
| failedItems | Int | Items that failed |
| results | JSON | Array of {workItemId, jiraKey, status, error?} |

---

## 3. Features by Area

### Document Upload & Processing
- **Single file upload:** PDF, DOCX, YAML, JSON, MD, TXT (up to 50MB)
- **Batch upload:** Multiple related files as a SpecGroup
- **Text extraction:** Preserves document structure
- **Section detection:** Identifies headings and content blocks
- **Conflict detection:** Finds contradictions between grouped specs

### AI Translation
- **4-pass pipeline:**
  1. Structure analysis (identify capabilities)
  2. Epic generation
  3. Feature grouping
  4. Story decomposition with AC
- **Context-aware:** Uses project brief, glossary, preferences
- **Traceability:** Links each story to source sections
- **Size estimation:** S/M/L/XL complexity estimates
- **Dependency detection:** Identifies cross-story dependencies

### Review & Editing
- **Tree view:** Hierarchical display of Epics > Features > Stories
- **Inline editing:** Click to edit any field
- **Drag & drop:** Reorder and reparent items
- **Split story:** Break one story into multiple
- **Merge stories:** Combine multiple into one
- **Bulk operations:** Update multiple items at once
- **Source viewer:** Split-pane showing original spec
- **Coverage highlighting:** See which spec sections are covered

### Knowledge Base (Per Project)
- **Project Brief:** Markdown overview of the project
- **Glossary:** Domain terms with definitions and aliases
- **Preferences:** Team conventions for story format
- **Reference Documents:** Architecture docs, process docs
- **Context Sources:** Connected sources (Jira, other specs)

### Quality Features
- **INVEST scoring:** Evaluates story quality (Independent, Negotiable, Valuable, Estimable, Small, Testable)
- **Pre-translation analysis:** Analyzes spec before translation
- **Duplicate detection:** Finds similar stories
- **Relationship mapping:** Visualizes entity relationships

### Export
- **Jira export:** OAuth integration, creates issues with links
- **CSV export:** For spreadsheet import
- **JSON export:** Full data export
- **Markdown export:** For documentation
- **Dry run:** Preview without creating

### Settings
- **Branding:** Company name, logo, colors
- **Export defaults:** Default format, metadata options

---

## 4. UI Pages

### Dashboard (`/`)
- Project list with health scores
- Recent specs
- Quick actions (upload, create project)

### Projects (`/projects`)
- List all projects
- Create new project
- Project cards with stats

### Review Page (`/review/:specId`)
- Main work breakdown tree
- Inline editor for selected item
- Source spec viewer (split pane)
- Coverage indicators

### Work Breakdown (`/work-breakdown/:projectId` or `/work-breakdown/spec/:specId`)
- Full work breakdown tree
- Filtering and search
- Bulk operations
- Export options

### Coverage Page (`/coverage/:specId`)
- Visual coverage map
- Spec sections with coverage status
- Mark sections as intentionally uncovered

### Dependencies (`/dependencies/:specId`)
- Dependency graph visualization
- Interactive node clicking

### Knowledge Base (`/knowledge`)
- Project brief editor
- Glossary management
- Reference documents

### Preferences (`/preferences/:projectId`)
- AC format selection
- Verbosity settings
- Technical depth
- Custom preferences

### Templates (`/templates`)
- Story template management
- Custom field definitions

### Settings (`/settings`)
- Branding (logo, colors)
- Export defaults
- About section

### Spec Groups (`/spec-groups/:groupId`)
- Multi-file upload status
- Conflict resolution

---

## 5. API Endpoints

### Authentication
```
POST /api/auth/login              Login (returns JWT)
GET  /api/auth/me                 Current user info
```

### Projects
```
GET    /api/projects              List all projects
POST   /api/projects              Create project
GET    /api/projects/:id          Get project
PATCH  /api/projects/:id          Update project
DELETE /api/projects/:id          Delete project
GET    /api/projects/:id/health   Get project health score
```

### Specs
```
POST   /api/projects/:id/specs         Upload spec to project
POST   /api/projects/:id/specs/batch   Batch upload
GET    /api/specs/:id                  Get spec
DELETE /api/specs/:id                  Delete spec
POST   /api/specs/:id/extract          Trigger extraction
POST   /api/specs/:id/translate        Trigger AI translation
GET    /api/specs/:id/sections         Get sections
GET    /api/specs/:id/analysis         Get pre-translation analysis
```

### Work Items
```
GET    /api/specs/:id/workitems        Get work items for spec
GET    /api/workitems/:id              Get single work item
PATCH  /api/workitems/:id              Update work item
DELETE /api/workitems/:id              Delete work item
POST   /api/workitems/:id/split        Split into multiple
POST   /api/workitems/merge            Merge multiple items
GET    /api/workitems/:id/invest       Get INVEST score
```

### Knowledge Base
```
GET    /api/projects/:id/knowledge     Get project knowledge
PATCH  /api/projects/:id/knowledge     Update knowledge
GET    /api/projects/:id/glossary      Get glossary
POST   /api/projects/:id/glossary      Add term
GET    /api/projects/:id/documents     Get reference docs
POST   /api/projects/:id/documents     Upload doc
```

### Preferences
```
GET    /api/projects/:id/preferences   Get preferences
PATCH  /api/projects/:id/preferences   Update preferences
```

### Templates
```
GET    /api/templates                  List templates
POST   /api/templates                  Create template
GET    /api/templates/:id              Get template
PATCH  /api/templates/:id              Update template
DELETE /api/templates/:id              Delete template
```

### Export
```
POST   /api/specs/:id/export           Export to Jira
GET    /api/exports/:id                Get export status
GET    /api/specs/:id/export/csv       Export as CSV
GET    /api/specs/:id/export/json      Export as JSON
GET    /api/specs/:id/export/markdown  Export as Markdown
```

### Settings
```
GET    /api/settings                   Get all settings
PATCH  /api/settings/branding          Update branding
PATCH  /api/settings/export            Update export settings
POST   /api/settings/logo              Upload logo
DELETE /api/settings/logo              Delete logo
```

---

## 6. Creating Realistic Mock Data

### Example Project: "Morefields Property Management Platform"

A property management SaaS for commercial real estate.

#### Project Brief (Markdown)
```markdown
# Morefields Property Management Platform

## Overview
Morefields is a comprehensive property management platform designed for commercial real estate companies managing portfolios of 50-500 properties.

## Target Users
- Property Managers (day-to-day operations)
- Asset Managers (portfolio oversight)
- Tenants (self-service portal)
- Maintenance Teams (work orders)

## Core Capabilities
1. **Property Management** - Property records, unit tracking, lease management
2. **Tenant Portal** - Self-service for tenants (payments, requests, documents)
3. **Maintenance** - Work order management, vendor coordination
4. **Financial** - Rent collection, accounting integration, reporting
5. **Reporting** - Occupancy, revenue, maintenance analytics

## Technical Context
- React frontend, Node.js backend
- PostgreSQL database
- Multi-tenant SaaS architecture
- Integration with QuickBooks, Stripe
```

#### Glossary Terms
| Term | Definition | Category |
|------|------------|----------|
| CAM | Common Area Maintenance - shared expenses charged to tenants | Financial |
| NNN | Triple Net Lease - tenant pays property taxes, insurance, maintenance | Leasing |
| Occupancy Rate | Percentage of rented units vs total units | Metrics |
| Work Order | Maintenance request from tenant or property manager | Maintenance |
| Lease Abstract | Summary of key lease terms | Leasing |
| NOI | Net Operating Income - revenue minus operating expenses | Financial |
| Turn | Process of preparing a unit for new tenant after vacancy | Operations |

#### Sample Spec Sections
For a "Tenant Portal" spec:

**Section 1.1: Authentication**
```
Tenants shall be able to log in using email/password or SSO via their company's identity provider.
Two-factor authentication shall be optional but encourageable.
Password reset shall be self-service via email verification.
```

**Section 1.2: Dashboard**
```
Upon login, tenants see a dashboard showing:
- Current balance and payment due date
- Recent announcements from property management
- Open maintenance requests with status
- Quick actions (make payment, submit request)
```

**Section 2.1: Online Payments**
```
Tenants can pay rent online via:
- ACH bank transfer (no fee)
- Credit/debit card (2.9% + $0.30 fee passed to tenant)
- Scheduled recurring payments
System shall send payment confirmation emails and update ledger in real-time.
```

#### Expected Work Items
From the above spec, AI should generate:

**Epic: Tenant Portal**

**Feature: Tenant Authentication**
- Story: Implement email/password login for tenants
- Story: Integrate SSO with identity providers (SAML/OIDC)
- Story: Add optional two-factor authentication
- Story: Build self-service password reset flow

**Feature: Tenant Dashboard**
- Story: Create dashboard layout with key widgets
- Story: Display current balance and due date
- Story: Show recent property announcements
- Story: List open maintenance requests with status

**Feature: Online Payments**
- Story: Integrate ACH payment processing
- Story: Integrate credit card payments with fee calculation
- Story: Build recurring payment scheduling
- Story: Implement payment confirmation emails

#### Sample Story Format
```
Title: Integrate ACH payment processing

Description:
Enable tenants to pay rent via ACH bank transfer from the tenant portal.
ACH payments should have no additional fee and update the tenant ledger in real-time.

Acceptance Criteria:
- Tenant can add and verify a bank account (micro-deposit verification)
- Tenant can initiate one-time ACH payment for current balance
- Payment status updates (pending, processing, completed, failed) are shown
- Tenant ledger updates immediately upon successful payment
- Payment confirmation email is sent to tenant

Technical Notes:
- Use Stripe ACH for payment processing
- Store bank account tokens, not raw account numbers
- Implement webhook handler for async payment status updates
- Consider 3-5 business day ACH clearing time

Size: M
Dependencies: None
```

#### Preferences to Set
```json
{
  "acFormat": "bullets",
  "verbosity": "balanced",
  "technicalDepth": "moderate",
  "maxAcCount": 6,
  "requiredSections": ["description", "acceptanceCriteria", "technicalNotes"],
  "customPrefs": [
    "Always include error handling acceptance criteria",
    "Reference specific integrations (Stripe, QuickBooks) where applicable",
    "Consider multi-tenant data isolation in technical notes"
  ]
}
```

### Tips for Realistic Mock Data

1. **Use real industry terminology** - Property management has specific terms (CAM, NNN, NOI)

2. **Create interconnected features** - Payments connect to ledger, ledger connects to reports

3. **Include edge cases in specs** - "What happens if payment fails?" should generate stories

4. **Vary story sizes** - Mix of S (simple CRUD), M (integration), L (complex logic), XL (epic)

5. **Add dependencies** - "Payment processing" depends on "Bank account verification"

6. **Include different doc types** - API spec, requirements doc, architecture doc

7. **Set up glossary first** - AI uses glossary for consistent terminology

8. **Write a real project brief** - AI uses this for context in every translation

---

## Quick Reference: Status Enums

**SpecStatus:** uploaded → extracting → ready → translating → translated (or error)

**WorkItemStatus:** draft → ready_for_review → approved → exported

**SizeEstimate:** S (hours), M (1-2 days), L (3-5 days), XL (1+ week)

**WorkItemType:** epic > feature > story

**ACFormat:** gherkin | bullets | checklist | numbered

**Verbosity:** concise | balanced | detailed

**TechnicalDepth:** high_level | moderate | implementation

---

*Last Updated: January 2025*
