# Handoff AI - Complete System Context for AI-Driven Data Population

**Purpose:** This document provides exhaustive context for an AI agent to populate a fully realistic "Morefields" property management project in Handoff AI. Every piece of data created must be production-quality and interconnected.

**Critical Understanding:** Handoff AI is itself an AI-powered application. The data you create will be used to train/configure an AI translation system. Poor quality input data = poor quality AI output. Everything must be realistic, consistent, and interconnected.

---

## Table of Contents
1. [System Overview](#1-system-overview)
2. [The AI Context System](#2-the-ai-context-system)
3. [Data Models - Complete Reference](#3-data-models---complete-reference)
4. [Morefields Project - Complete Data Set](#4-morefields-project---complete-data-set)
5. [Quality Standards](#5-quality-standards)
6. [API Reference](#6-api-reference)
7. [Validation Checklist](#7-validation-checklist)

---

## 1. System Overview

### What Handoff AI Does
Handoff AI transforms product specification documents into developer-ready work items. It uses Claude AI to:
1. Parse and understand uploaded specifications
2. Extract structured sections from documents
3. Generate a hierarchy of Epics → Features → Stories
4. Maintain traceability between specs and generated items
5. Learn from user edits to improve over time

### The Core Problem
Product managers write specs in business language:
> "Users should be able to pay their rent online using various payment methods"

Developers need technical tickets:
> "Integrate Stripe ACH payment processing with webhook handlers for async status updates, storing payment tokens securely and updating tenant ledger in real-time"

Handoff AI bridges this gap automatically.

### Work Item Hierarchy
```
EPIC (Major Capability - e.g., "Tenant Portal")
  └── FEATURE (Functional Group - e.g., "Online Payments")
       └── STORY (Single Deliverable - e.g., "Integrate ACH payments")
```

**Sizing Guide:**
- **S (Small):** 2-4 hours, simple CRUD, single component
- **M (Medium):** 1-2 days, integration work, multiple components
- **L (Large):** 3-5 days, complex logic, cross-cutting concerns
- **XL (Extra Large):** 1+ week, architectural changes, multiple integrations

---

## 2. The AI Context System

### How AI Uses Project Context
When translating a spec, the AI receives:

1. **Project Brief** - High-level understanding of what we're building
2. **Glossary** - Domain terms so AI uses correct terminology
3. **Preferences** - How the team wants stories formatted
4. **Previous Specs** - Context from other translated specs in the project
5. **Reference Documents** - Architecture docs, API specs, process docs

**The quality of AI output directly depends on the quality of this context.**

### Context Priority (Most → Least Important)
1. **Glossary Terms** - AI will use these exact terms instead of generic ones
2. **Project Brief** - Shapes overall understanding
3. **Preferences** - Formatting and style
4. **Reference Docs** - Technical details

### How the Learning Loop Works
1. AI generates a story with title, description, acceptance criteria
2. User edits the story (changes wording, adds criteria, etc.)
3. System records the edit (before/after values)
4. System detects patterns across multiple edits
5. Patterns become suggestions (e.g., "Always include error handling AC")
6. User accepts suggestions → become preferences
7. Future generations incorporate learned preferences

**This means:** The initial data quality affects all future AI outputs. Good glossary + good preferences = AI that generates exactly what the team expects.

---

## 3. Data Models - Complete Reference

### Project
The top-level container. Everything belongs to a project.

```typescript
{
  id: "uuid",
  name: "Morefields Property Management Platform",
  description: "Comprehensive property management SaaS for commercial real estate...",
  jiraProjectKey: "MORE",  // Optional - for Jira export
  settings: {
    defaultSpecType: "api-spec",
    autoTranslate: false,
    notifyOnComplete: true
  }
}
```

### Spec (Specification Document)
An uploaded document awaiting or completed translation.

```typescript
{
  id: "uuid",
  projectId: "project-uuid",
  name: "Tenant Portal API Specification v2.1",
  filePath: "/uploads/specs/tenant-portal-api-v2.1.pdf",
  fileType: "pdf",  // pdf, docx, yaml, json, md, txt
  fileSize: 245000,  // bytes
  extractedText: "Full extracted text content...",
  status: "translated",  // uploaded → extracting → ready → translating → translated
  specType: "api-spec",  // api-spec, requirements-doc, design-doc
  uploadedBy: "user-123",
  metadata: {
    pageCount: 24,
    version: "2.1",
    author: "Product Team",
    extractedAt: "2025-01-02T10:30:00Z"
  }
}
```

**Status Flow:**
- `uploaded` - File received, not yet processed
- `extracting` - Text extraction in progress
- `ready` - Extracted, awaiting translation
- `translating` - AI translation in progress
- `translated` - Complete with work items
- `error` - Something failed (check errorMessage)

### SpecSection
Structured sections extracted from the document.

```typescript
{
  id: "uuid",
  specId: "spec-uuid",
  sectionRef: "2.3.1",  // Hierarchical reference
  heading: "Payment Processing",
  content: "The system shall support multiple payment methods including ACH bank transfers, credit cards, and debit cards. ACH transfers shall incur no additional fee to the tenant. Card payments shall pass through the standard processing fee of 2.9% + $0.30...",
  orderIndex: 5,
  intentionallyUncovered: false  // Set true if section doesn't need work items
}
```

### WorkItem
Generated Epics, Features, and Stories.

```typescript
{
  id: "uuid",
  specId: "spec-uuid",
  parentId: "parent-workitem-uuid",  // null for Epics
  type: "story",  // epic, feature, story
  title: "Integrate ACH payment processing via Stripe",
  description: "Enable tenants to pay rent via ACH bank transfer from the tenant portal. ACH payments should have no additional fee to encourage adoption. The tenant ledger must update in real-time upon successful payment completion.",
  acceptanceCriteria: "- Tenant can securely add and verify a bank account using micro-deposit verification\n- Tenant can initiate one-time ACH payment for any outstanding balance\n- Payment status (pending, processing, completed, failed) displays in real-time\n- Tenant ledger updates immediately upon successful payment\n- Payment confirmation email sent within 60 seconds of completion\n- Failed payments trigger appropriate error messaging with retry option",
  technicalNotes: "- Use Stripe ACH for payment processing (already integrated for card payments)\n- Store Stripe bank account tokens, never raw account numbers\n- Implement Stripe webhook handler for payment_intent.succeeded and payment_intent.failed events\n- ACH has 3-5 business day clearing time - show this to user\n- Consider implementing Plaid for instant bank verification as future enhancement",
  sizeEstimate: "M",
  status: "draft",  // draft → ready_for_review → approved → exported
  orderIndex: 0,
  jiraKey: null,  // Populated after export: "MORE-123"
  templateId: null,
  customFields: {},
  dependsOnIds: ["uuid-of-bank-account-verification-story"]
}
```

**Acceptance Criteria Formats:**
```
// Bullets (default)
- User can do X
- System validates Y
- Error displays when Z

// Gherkin
Given the user is on the payment page
When they select ACH payment
Then the bank account form displays

// Checklist
[ ] User can add bank account
[ ] Verification completes within 2 business days
[ ] Payment can be initiated after verification
```

### WorkItemSource
Links work items back to spec sections (traceability).

```typescript
{
  workItemId: "workitem-uuid",
  sectionId: "section-uuid",
  relevanceScore: 0.95  // How relevant this section is (0-1)
}
```

### StoryTemplate
Templates for consistent story generation.

```typescript
{
  id: "uuid",
  projectId: "project-uuid",
  name: "API Endpoint Story",
  isDefault: false,
  acFormat: "bullets",  // gherkin, bullets, checklist
  requiredSections: ["description", "acceptanceCriteria", "technicalNotes"],
  customFields: [
    {
      name: "api_method",
      label: "HTTP Method",
      type: "select",
      required: true,
      options: ["GET", "POST", "PUT", "PATCH", "DELETE"]
    },
    {
      name: "requires_auth",
      label: "Requires Authentication",
      type: "boolean",
      required: true
    }
  ]
}
```

### GlossaryTerm
Domain terminology - **CRITICAL for AI quality**.

```typescript
{
  id: "uuid",
  projectId: "project-uuid",
  term: "CAM",
  definition: "Common Area Maintenance - Operating expenses for shared spaces (lobbies, parking, landscaping) that are proportionally charged to tenants based on their leased square footage. Calculated annually and reconciled against actual expenses.",
  aliases: ["Common Area Maintenance", "CAM Charges", "CAM Fees"],
  category: "Financial",
  useInstead: null,  // If this term is preferred over another
  avoidTerms: ["maintenance fee"],  // Don't use these terms
  isManual: true,  // false if auto-extracted from specs
  confidence: null  // Only for auto-extracted
}
```

**Why Glossary Matters:**
Without glossary: AI might say "maintenance charges" or "shared costs"
With glossary: AI correctly uses "CAM charges" consistently

### ProjectKnowledge (Project Brief)
The single most important context document.

```typescript
{
  id: "uuid",
  projectId: "project-uuid",
  brief: "# Morefields Property Management Platform\n\n## Overview\nMorefields is a comprehensive..."  // Full markdown
}
```

### TeamPreferencesConfig
How the team wants AI to format output.

```typescript
{
  id: "uuid",
  projectId: "project-uuid",
  acFormat: "bullets",  // gherkin, bullets, checklist, numbered
  requiredSections: ["description", "acceptanceCriteria", "technicalNotes"],
  maxAcCount: 6,  // Max acceptance criteria per story
  verbosity: "balanced",  // concise, balanced, detailed
  technicalDepth: "moderate",  // high_level, moderate, implementation
  customPrefs: [
    "Always include error handling acceptance criteria",
    "Reference specific integrations (Stripe, QuickBooks) where applicable",
    "Consider multi-tenant data isolation in technical notes",
    "Include performance expectations for API endpoints (response time)",
    "Specify authentication requirements for each endpoint"
  ]
}
```

### ReferenceDocument
Supporting documents for AI context.

```typescript
{
  id: "uuid",
  projectId: "project-uuid",
  name: "System Architecture Overview",
  fileName: "morefields-architecture.pdf",
  filePath: "/uploads/docs/morefields-architecture.pdf",
  fileType: "pdf",
  fileSize: 1250000,
  extractedText: "Extracted content...",
  summary: "AI-generated summary of the architecture document covering microservices structure, database design, and integration points.",
  docType: "architecture",  // architecture, process, technical, business, other
  isActive: true  // Include in AI context
}
```

### AIFeedback
User ratings on AI-generated content.

```typescript
{
  id: "uuid",
  workItemId: "workitem-uuid",
  userId: "user-123",
  rating: 5,  // 1 (thumbs down) or 5 (thumbs up)
  feedback: "Good technical depth, correctly identified the Stripe integration requirement",
  categories: ["accurate", "well-structured"]
}
```

### StoryEdit
Tracked changes for learning loop.

```typescript
{
  id: "uuid",
  projectId: "project-uuid",
  workItemId: "workitem-uuid",
  field: "acceptanceCriteria",  // title, description, acceptanceCriteria, technicalNotes, size
  beforeValue: "- User can pay rent\n- Payment is processed",
  afterValue: "- User can pay rent via ACH with no additional fee\n- Payment is processed within 3-5 business days\n- User receives email confirmation",
  editType: "modification",  // addition, removal, modification, complete
  specId: "spec-uuid",
  userId: "user-123"
}
```

### LearnedPattern
Patterns detected from edits.

```typescript
{
  id: "uuid",
  projectId: "project-uuid",
  pattern: "User consistently adds email confirmation requirement to payment stories",
  description: "In 4 out of 5 payment-related stories, user added acceptance criteria about email confirmations",
  confidence: 0.85,
  occurrences: 4,
  field: "acceptanceCriteria",
  context: "payment processing",
  suggestion: "Always include email confirmation acceptance criteria for payment-related stories",
  suggestionType: "addToPreferences",
  status: "pending"  // pending, suggested, accepted, dismissed, applied
}
```

### ProjectHealth
Project context quality score.

```typescript
{
  id: "uuid",
  projectId: "project-uuid",
  score: 78,  // 0-100 overall
  level: "good",  // minimal (0-25), basic (26-50), good (51-75), excellent (76-100)
  briefScore: 90,  // Has comprehensive brief
  glossaryScore: 75,  // Good glossary coverage
  prefsScore: 80,  // Preferences configured
  specsScore: 70,  // Multiple specs translated
  sourcesScore: 65,  // Some reference docs
  learningScore: 60,  // Some patterns learned
  recommendations: [
    "Add more glossary terms for financial concepts",
    "Upload architecture documentation for better technical context",
    "Configure Jira integration for seamless export"
  ]
}
```

### UserSettings
User-specific settings.

```typescript
{
  id: "uuid",
  userId: "user-123",
  branding: {
    companyName: "Morefields",
    logoUrl: "data:image/png;base64,...",
    primaryColor: "#FF6B35",
    accentColor: "#1A1A2E",
    darkMode: true
  },
  jira: {
    cloudId: null,
    siteUrl: null,
    defaultProjectKey: "MORE"
  },
  exportSettings: {
    defaultFormat: "json",
    includeMetadata: true,
    flattenHierarchy: false
  }
}
```

---

## 4. Morefields Project - Complete Data Set

### About Morefields
Morefields is a property management SaaS platform for commercial real estate companies managing portfolios of 50-500 properties. It handles the full lifecycle of property management from tenant acquisition to lease management to maintenance operations.

### Project Brief (Full Markdown)

```markdown
# Morefields Property Management Platform

## Executive Summary
Morefields is a next-generation property management platform designed specifically for commercial real estate operators. Unlike residential-focused competitors, Morefields understands the complexity of commercial leases, CAM reconciliation, and multi-tenant buildings.

## Target Market
- **Primary:** Commercial property management companies (50-500 properties)
- **Secondary:** Mixed-use developers, REITs with commercial portfolios
- **Company Size:** 10-200 employees, $10M-$500M AUM

## User Personas

### 1. Property Manager (Patricia)
- **Role:** Day-to-day operations for 5-15 properties
- **Goals:** Efficient tenant communication, quick work order resolution, accurate rent collection
- **Pain Points:** Juggling multiple systems, manual CAM calculations, tenant communication overhead
- **Key Features:** Dashboard, tenant portal, work order management, payment processing

### 2. Asset Manager (Marcus)
- **Role:** Portfolio oversight, financial performance, investor reporting
- **Goals:** Maximize NOI, reduce vacancy, accurate reporting
- **Pain Points:** Scattered data, manual report generation, delayed visibility
- **Key Features:** Portfolio dashboard, financial reports, occupancy analytics, investor portal

### 3. Tenant (Tenant User - varies)
- **Role:** Occupies space, pays rent, submits requests
- **Goals:** Easy payments, quick maintenance resolution, access to documents
- **Pain Points:** Can't find lease, payment issues, slow maintenance response
- **Key Features:** Tenant portal, online payments, maintenance requests, document access

### 4. Maintenance Technician (Mike)
- **Role:** Responds to work orders, preventive maintenance
- **Goals:** Clear work assignments, parts availability, completion tracking
- **Pain Points:** Paper work orders, unclear priorities, no history visibility
- **Key Features:** Mobile app, work order queue, parts inventory, time tracking

## Core Modules

### 1. Property Management
- Property records with full details (address, size, units, amenities)
- Unit/suite tracking with floor plans
- Lease management (terms, rent schedules, options)
- Document storage (leases, certificates, inspections)

### 2. Tenant Portal
- Self-service login (SSO supported)
- Online rent payment (ACH, card)
- Maintenance request submission
- Document access (lease, CAM statements)
- Announcement viewing

### 3. Maintenance Operations
- Work order creation and assignment
- Priority and SLA tracking
- Vendor management
- Preventive maintenance scheduling
- Parts/inventory tracking

### 4. Financial Management
- Rent roll and collection
- Late fee automation
- CAM calculation and reconciliation
- Accounts receivable aging
- QuickBooks integration

### 5. Reporting & Analytics
- Occupancy reports
- Revenue and NOI dashboards
- Maintenance metrics
- Tenant aging reports
- Custom report builder

## Technical Architecture

### Stack
- **Frontend:** React 18 with TypeScript, Tailwind CSS
- **Backend:** Node.js with Fastify, PostgreSQL
- **Auth:** JWT with optional SSO (SAML 2.0, OIDC)
- **Payments:** Stripe (ACH + Cards)
- **Accounting:** QuickBooks Online integration
- **Storage:** AWS S3 for documents
- **Hosting:** AWS (ECS, RDS, CloudFront)

### Multi-Tenancy
Each customer (property management company) has isolated data. The system uses row-level security with `company_id` on all tables. Tenants (renters) belong to properties which belong to companies.

### API Design
RESTful API with consistent patterns:
- Authentication via Bearer token
- Standard error responses with codes
- Pagination for list endpoints
- Versioned endpoints (/v1/, /v2/)

## Integration Points
1. **Stripe** - Payment processing (ACH, cards)
2. **QuickBooks Online** - Accounting sync
3. **Plaid** - Bank account verification (planned)
4. **Twilio** - SMS notifications (planned)
5. **SendGrid** - Email delivery
6. **AWS S3** - Document storage

## Security Requirements
- SOC 2 Type II compliance (in progress)
- Encrypted data at rest (AES-256)
- TLS 1.3 for data in transit
- PCI DSS compliance for payment data (via Stripe)
- Regular penetration testing
- Audit logging for all data access

## Non-Functional Requirements
- 99.9% uptime SLA
- <500ms API response time (p95)
- Support 1000+ concurrent users
- Mobile-responsive UI
- WCAG 2.1 AA accessibility
```

### Complete Glossary

| Term | Definition | Aliases | Category | Avoid |
|------|------------|---------|----------|-------|
| CAM | Common Area Maintenance - Operating expenses for shared building spaces (lobbies, hallways, parking areas, landscaping) that are proportionally charged to tenants based on their pro-rata share of leased square footage. Calculated annually with year-end reconciliation against actual expenses. | Common Area Maintenance, CAM Charges, CAM Fees, Operating Expenses | Financial | maintenance fee, shared costs |
| NNN | Triple Net Lease - A lease structure where the tenant pays base rent plus their proportional share of three categories: property taxes, building insurance, and common area maintenance. The landlord has minimal operating expenses. | Triple Net, Net Net Net, NNN Lease | Leasing | gross lease |
| NOI | Net Operating Income - The property's revenue minus all operating expenses, excluding debt service and capital expenditures. The primary metric for evaluating commercial property profitability. Calculated as: Gross Revenue - Operating Expenses = NOI | Net Operating Income | Financial | profit, net income |
| Rent Roll | A report listing all units/spaces in a property with current tenant, lease terms, rent amounts, and payment status. Used for financial analysis, due diligence, and operations. | Rent Schedule | Reporting | tenant list |
| Lease Abstract | A summarized version of a lease containing key terms: parties, premises, term dates, rent schedule, options, CAM structure, and special provisions. Used for quick reference without reading full lease. | Lease Summary | Leasing | lease copy |
| Pro-Rata Share | A tenant's proportional share of building expenses, typically calculated as tenant's square footage divided by total building square footage. Used for CAM, tax, and insurance allocations. | Proportional Share, Pro Rata | Financial | percentage, share |
| Work Order | A formal request for maintenance or repair work. Contains description, location, priority, assigned technician, and status tracking. Can be generated by tenants, staff, or inspections. | Maintenance Request, Service Request, WO | Maintenance | ticket, task |
| Turn | The process of preparing a unit for a new tenant after the previous tenant vacates. Includes cleaning, repairs, painting, and inspections. Turn time affects vacancy loss. | Unit Turn, Make-Ready, Turnover | Operations | prep, refresh |
| Vacancy Loss | Revenue lost due to unoccupied units. Calculated as potential rent minus actual collected rent due to vacancies. A key metric for asset performance. | Vacancy Cost, Lost Rent | Financial | empty units |
| Effective Rent | The actual rent received after accounting for concessions, free rent periods, and allowances. Lower than face rent when incentives are given. | Net Effective Rent | Financial | actual rent |
| Base Rent | The fixed rental amount specified in the lease, before additional charges like CAM, taxes, and insurance. In NNN leases, this is typically lower. | Minimum Rent, Contract Rent | Financial | rent |
| Gross Lease | A lease structure where the landlord pays all operating expenses and the tenant pays a single all-inclusive rent amount. Common in office buildings. | Full Service Lease | Leasing | net lease |
| Escalation | An annual rent increase built into the lease, typically a fixed percentage (2-3%) or tied to CPI. Protects landlord against inflation. | Rent Increase, Annual Increase, Bump | Leasing | raise |
| LOI | Letter of Intent - A preliminary document outlining proposed lease terms before formal lease negotiation. Not legally binding but shows serious intent. | Letter of Intent | Leasing | proposal |
| COI | Certificate of Insurance - Documentation proving a tenant or vendor has required insurance coverage. Must be collected before occupancy/work. | Certificate of Insurance, Insurance Certificate | Compliance | insurance proof |
| Estoppel | An estoppel certificate confirms the current status of a lease (terms, rent, deposits, defaults). Required during property sales or refinancing. | Estoppel Certificate, Tenant Estoppel | Legal | lease verification |
| SNDA | Subordination, Non-Disturbance, and Attornment Agreement - Protects tenant rights if the property is sold or foreclosed. Common in financed properties. | Subordination Agreement | Legal | tenant protection |
| Buildout | The construction or modification of a space to meet tenant specifications. Can be funded by landlord (TI) or tenant. | Tenant Improvements, TI, Leasehold Improvements | Construction | renovation |
| TI | Tenant Improvement Allowance - Money provided by landlord for tenant to customize their space. Typically expressed as dollars per square foot. | Tenant Improvement Allowance, Improvement Allowance | Financial | buildout money |
| RSF | Rentable Square Feet - The square footage used for rent calculation, includes the usable space plus a proportional share of common areas. Always larger than USF. | Rentable Square Footage, Rentable Area | Measurement | square footage |
| USF | Usable Square Feet - The actual space occupied exclusively by the tenant, not including shared areas. Used for space planning. | Usable Square Footage, Usable Area | Measurement | actual space |
| Load Factor | The multiplier applied to USF to calculate RSF. Reflects the building's efficiency. Lower is better for tenants. Typically 1.10-1.25 for office. | Common Area Factor, Add-On Factor | Measurement | efficiency |
| BOMA | Building Owners and Managers Association - Industry organization that sets standards for measuring rentable area (BOMA Standards). | Building Owners and Managers Association | Industry | measurement standard |
| AR | Accounts Receivable - Money owed to the property by tenants. Includes rent, CAM, and other charges. Aging report shows overdue amounts. | Accounts Receivable, Receivables | Financial | money owed |
| AR Aging | A report categorizing outstanding receivables by how overdue they are: Current, 1-30 days, 31-60 days, 61-90 days, 90+ days. | Aging Report, Receivables Aging | Reporting | overdue report |
| Security Deposit | Money held by landlord as protection against tenant default or damages. Typically 1-2 months rent for commercial. Must be returned per lease terms. | Deposit | Financial | holding |
| Late Fee | Penalty charged when rent is paid after the grace period (typically 5-10 days). Usually 5-10% of monthly rent. Must be specified in lease. | Late Charge, Late Penalty | Financial | penalty |
| Grace Period | The number of days after rent due date before late fees apply. Typically 5-10 days for commercial leases. | | Leasing | free days |
| Commencement Date | The date when a lease term officially begins and rent obligations start. May differ from occupancy date if there's a free rent period. | Lease Start Date, Start Date | Leasing | move-in date |
| Expiration Date | The date when a lease term ends. Tenant must renew, vacate, or become holdover tenant. | Lease End Date, Term End | Leasing | end date |
| Holdover | A tenant who remains in possession after lease expiration without a new agreement. Typically charged 150-200% of rent until resolved. | Holdover Tenant | Legal | staying over |
| Option to Renew | A lease provision giving tenant the right (not obligation) to extend the lease for additional term(s) at predetermined or fair market rent. | Renewal Option | Leasing | extension right |
| Right of First Refusal | A lease provision requiring landlord to offer tenant the opportunity to lease additional or adjacent space before offering to others. | ROFR | Leasing | first right |
| Preventive Maintenance | Scheduled maintenance performed to prevent equipment failures. Includes HVAC filters, roof inspections, fire system testing. | PM, Scheduled Maintenance | Maintenance | regular maintenance |
| Capex | Capital Expenditure - Major expenses for property improvements or equipment that are capitalized rather than expensed. Examples: roof replacement, HVAC system, parking lot repaving. | Capital Expenditure, Capital Expense | Financial | big expenses |
| Opex | Operating Expenditure - Ongoing expenses to run the property. Examples: utilities, repairs, landscaping, management fees. Recovered through CAM charges in NNN leases. | Operating Expense, Operating Cost | Financial | running costs |

### Team Preferences Configuration

```json
{
  "acFormat": "bullets",
  "requiredSections": ["description", "acceptanceCriteria", "technicalNotes"],
  "maxAcCount": 8,
  "verbosity": "balanced",
  "technicalDepth": "implementation",
  "customPrefs": [
    "Always include error handling acceptance criteria with specific error messages",
    "Reference specific integrations by name (Stripe, QuickBooks, SendGrid) where applicable",
    "Include multi-tenant data isolation requirements in technical notes",
    "Specify API response time expectations (<500ms for reads, <2s for writes)",
    "Include authentication and authorization requirements for each endpoint",
    "Consider audit logging requirements for financial and sensitive operations",
    "Include email/notification triggers where user communication is implied",
    "Specify validation rules for all user inputs",
    "Consider mobile responsiveness for tenant-facing features",
    "Include data migration considerations for new features",
    "Reference existing patterns from codebase when similar functionality exists"
  ]
}
```

### Reference Documents to Upload

**1. API Design Standards (architecture)**
Document covering REST API patterns, error handling, pagination, authentication.

**2. Database Schema Overview (technical)**
Document explaining the multi-tenant data model, key relationships, and indexing strategy.

**3. Integration Architecture (architecture)**
Document covering Stripe, QuickBooks, and other third-party integrations.

**4. Security & Compliance Requirements (process)**
SOC 2 requirements, data handling policies, encryption standards.

### Sample Specifications

#### Spec 1: Tenant Portal API Specification

**Sections to include:**

**1. Introduction**
```
The Tenant Portal provides self-service capabilities for commercial tenants to manage their relationship with property management. This specification covers the API endpoints powering the tenant-facing portal application.

All endpoints require authentication via JWT token with tenant role. Tenants can only access data for their own lease(s) and associated properties.
```

**2. Authentication & Authorization**
```
2.1 Authentication
Tenants authenticate via email/password or SSO (SAML 2.0/OIDC). Upon successful authentication, a JWT is issued with 24-hour expiry. Refresh tokens valid for 30 days enable silent re-authentication.

2.2 Authorization
The tenant role provides access to:
- Own profile and contact information
- Leases where tenant is the lessee
- Payment history and current balance
- Maintenance requests for occupied units
- Documents shared with tenant (lease, COI, CAM statements)
- Property announcements for occupied properties

2.3 Multi-Tenant Isolation
All queries are automatically scoped to the authenticated tenant's company and lease relationships. Cross-tenant data access must be prevented at the API layer.
```

**3. Dashboard**
```
3.1 Dashboard Overview
The dashboard provides at-a-glance view of the tenant's current status including:
- Current balance and next payment due date
- Open maintenance requests with status
- Recent announcements from property management
- Quick action buttons for common tasks

3.2 GET /api/v1/tenant/dashboard
Returns aggregated dashboard data including:
- balance: Current total balance owed
- dueDate: Next payment due date
- openWorkOrders: Count and list of open maintenance requests
- announcements: Recent announcements (last 30 days)
- leases: Summary of active leases

Response time requirement: <500ms
```

**4. Online Payments**
```
4.1 Payment Methods
Tenants may pay via:
- ACH Bank Transfer: No additional fee, 3-5 business day processing
- Credit Card: 2.9% + $0.30 fee (passed to tenant)
- Debit Card: 2.9% + $0.30 fee (passed to tenant)

4.2 Bank Account Management
POST /api/v1/tenant/payment-methods/bank-accounts
Adds a new bank account for ACH payments. Uses Stripe for tokenization. Micro-deposit verification required before account can be used.

GET /api/v1/tenant/payment-methods
Lists all saved payment methods (bank accounts and cards) with masked account numbers.

DELETE /api/v1/tenant/payment-methods/{id}
Removes a saved payment method. Cannot remove if there are pending payments using this method.

4.3 Making Payments
POST /api/v1/tenant/payments
Creates a new payment. Request body includes:
- amount: Payment amount (must be > 0)
- paymentMethodId: Saved payment method to use
- leaseId: Which lease this payment applies to

Payment is processed via Stripe. For ACH, status begins as "pending" and updates via webhook. For cards, status is immediately "completed" or "failed".

4.4 Payment History
GET /api/v1/tenant/payments
Returns paginated list of all payments with status, date, amount, and method. Includes both completed and pending payments.
```

**5. Maintenance Requests**
```
5.1 Submitting Requests
POST /api/v1/tenant/work-orders
Creates a new maintenance request. Required fields:
- unitId: The unit where issue exists
- category: Plumbing, Electrical, HVAC, Structural, Other
- description: Detailed description of issue
- urgency: Low, Medium, High, Emergency
- preferredAccessTimes: When tenant is available for access

Optional fields:
- photos: Up to 5 images showing the issue

5.2 Request Status
GET /api/v1/tenant/work-orders/{id}
Returns full details of a work order including:
- Current status: Submitted, Assigned, In Progress, Completed, Cancelled
- Assigned technician (if assigned)
- Scheduled date/time (if scheduled)
- Completion notes (if completed)
- Activity log of status changes

5.3 Request List
GET /api/v1/tenant/work-orders
Returns paginated list of all maintenance requests for tenant's units. Supports filtering by status.

5.4 Cancellation
DELETE /api/v1/tenant/work-orders/{id}
Cancels a pending work order. Cannot cancel if already in progress or completed.
```

**6. Documents**
```
6.1 Document Access
GET /api/v1/tenant/documents
Returns list of documents shared with tenant:
- Executed lease agreements
- CAM reconciliation statements
- Certificates of Insurance
- Move-in/move-out inspection reports
- Property rules and regulations

6.2 Document Download
GET /api/v1/tenant/documents/{id}/download
Returns signed URL for document download. URL valid for 15 minutes.
```

**7. Profile Management**
```
7.1 View Profile
GET /api/v1/tenant/profile
Returns tenant profile including contact information and notification preferences.

7.2 Update Profile
PATCH /api/v1/tenant/profile
Updates tenant profile. Editable fields:
- phone: Primary phone number
- alternateEmail: Secondary email for notifications
- notificationPreferences: Email/SMS preferences for different notification types

7.3 Change Password
POST /api/v1/tenant/profile/change-password
Changes the tenant's password. Requires current password verification.
```

#### Spec 2: Work Order Management API

**Sections to include:**

**1. Overview**
```
The Work Order Management module handles maintenance requests from submission through completion. This specification covers the staff-facing API endpoints for managing work orders.

Work orders flow through the following statuses:
1. Submitted - Initial request received
2. Triaged - Priority and category confirmed
3. Assigned - Technician assigned
4. Scheduled - Appointment scheduled with tenant
5. In Progress - Technician working on issue
6. Completed - Work finished, awaiting approval
7. Closed - Approved and closed
8. Cancelled - Cancelled before completion
```

**2. Work Order CRUD**
```
2.1 Create Work Order
POST /api/v1/work-orders
Staff can create work orders on behalf of tenants or for internal/preventive maintenance.

Required fields:
- propertyId: Property where work is needed
- unitId: Specific unit (null for common areas)
- category: Plumbing, Electrical, HVAC, Structural, Grounds, Other
- priority: Low, Medium, High, Emergency
- description: Detailed issue description
- source: Tenant Request, Staff Inspection, Preventive, Vendor Recommendation

Optional:
- requestedBy: Tenant ID if tenant-initiated
- dueDate: When work should be completed by
- estimatedCost: Initial cost estimate
- vendorId: If external vendor required

2.2 Get Work Order
GET /api/v1/work-orders/{id}
Returns complete work order details including full activity log.

2.3 Update Work Order
PATCH /api/v1/work-orders/{id}
Updates work order fields. Status changes have specific validation rules.

2.4 List Work Orders
GET /api/v1/work-orders
Paginated list with filtering:
- status: Filter by one or more statuses
- propertyId: Filter by property
- assignedTo: Filter by technician
- priority: Filter by priority level
- dateRange: Filter by created/due date
```

**3. Assignment & Scheduling**
```
3.1 Assign Technician
POST /api/v1/work-orders/{id}/assign
Assigns work order to internal technician or external vendor.

Request body:
- assigneeType: "internal" or "vendor"
- assigneeId: User ID or Vendor ID
- notes: Assignment instructions

3.2 Schedule Appointment
POST /api/v1/work-orders/{id}/schedule
Schedules tenant access appointment.

Request body:
- scheduledDate: Date and time
- estimatedDuration: In minutes
- notifyTenant: Boolean to send notification

3.3 Reassign
POST /api/v1/work-orders/{id}/reassign
Changes assignment with reason tracking.
```

**4. Status Transitions**
```
4.1 Start Work
POST /api/v1/work-orders/{id}/start
Technician marks work as started. Records start time for tracking.

4.2 Complete Work
POST /api/v1/work-orders/{id}/complete
Marks work as completed.

Request body:
- resolutionNotes: What was done
- laborHours: Time spent
- partsUsed: Array of parts/materials used
- photos: Completion photos
- actualCost: Final cost

4.3 Close Work Order
POST /api/v1/work-orders/{id}/close
Manager approves and closes completed work.

4.4 Cancel Work Order
POST /api/v1/work-orders/{id}/cancel
Cancels work order with reason.
```

**5. Comments & Activity**
```
5.1 Add Comment
POST /api/v1/work-orders/{id}/comments
Adds internal note or tenant-visible comment.

Request body:
- content: Comment text
- isInternal: Boolean (internal notes not visible to tenant)
- attachments: Optional file attachments

5.2 Get Activity Log
GET /api/v1/work-orders/{id}/activity
Returns complete chronological log of all actions, comments, and status changes.
```

### Expected Work Items (Sample Output)

When the above specs are translated, expect work items like:

**EPIC: Tenant Portal**
```
Title: Tenant Portal
Description: Self-service portal enabling commercial tenants to manage payments, maintenance requests, documents, and communication with property management.
```

**FEATURE: Tenant Authentication**
```
Title: Tenant Authentication
Description: Secure authentication system for tenant portal supporting email/password and enterprise SSO integration.
Parent: Tenant Portal Epic
```

**STORY: Implement Tenant Login with Email/Password**
```
Title: Implement tenant login with email/password authentication
Description: Enable tenants to log into the portal using their registered email address and password. This is the primary authentication method for most tenants.
Acceptance Criteria:
- Tenant can enter email and password on login form
- Invalid credentials display "Invalid email or password" message without revealing which is wrong
- Successful login redirects to tenant dashboard
- JWT token issued with 24-hour expiration
- Refresh token issued with 30-day expiration
- Failed login attempts are rate limited (5 attempts per 15 minutes)
- Account lockout after 10 failed attempts with email notification
- Login activity logged for security audit
Technical Notes:
- Use existing auth service pattern from staff authentication
- Store passwords with bcrypt (cost factor 12)
- JWT payload: { tenantId, leaseIds[], companyId, role: "tenant" }
- Implement refresh token rotation on each use
- Log to audit_log table: { action: "tenant_login", tenantId, success, ip, userAgent }
Size: M
Dependencies: None
```

**STORY: Integrate Stripe ACH Payment Processing**
```
Title: Integrate Stripe ACH payment processing for rent payments
Description: Enable tenants to pay rent via ACH bank transfer from the tenant portal. ACH payments have no additional fee to encourage adoption over card payments.
Acceptance Criteria:
- Tenant can add a bank account using Stripe bank account form
- Micro-deposit verification flow for account verification (2-3 business days)
- Tenant can initiate one-time ACH payment for any amount up to current balance
- Payment status displays real-time (pending → processing → completed/failed)
- Tenant ledger updates immediately upon successful payment completion
- Payment confirmation email sent within 60 seconds of status change
- Failed payments display clear error message with retry option
- ACH processing timeline (3-5 business days) clearly communicated to user
- Payment history shows all ACH transactions with status
Technical Notes:
- Use Stripe ACH via Payment Intents API (already integrated for cards)
- Store Stripe bank account tokens (pm_*), never raw account/routing numbers
- Implement webhook handler for payment_intent.succeeded and payment_intent.failed
- Update tenant_ledger table with payment amount and reference
- Queue email via SendGrid for payment confirmation
- Consider adding Plaid integration for instant verification in future phase
- Multi-tenant isolation: payments scoped to tenant's own leases only
Size: L
Dependencies: Tenant Authentication stories, Payment Method Management
```

---

## 5. Quality Standards

### What Makes Good Work Items

**Good Title:**
- Action-oriented: "Implement", "Create", "Integrate", "Build"
- Specific: mentions the feature/component
- Concise: typically 5-10 words

```
✅ "Implement ACH payment processing via Stripe"
✅ "Create tenant dashboard with balance widget"
❌ "Payments" (too vague)
❌ "Implement the feature that allows tenants to make payments using their bank account through ACH transfers" (too long)
```

**Good Description:**
- States the goal (what user can do)
- Explains the value (why it matters)
- Provides context (how it fits in)

```
✅ "Enable tenants to pay rent via ACH bank transfer from the tenant portal. ACH payments have no additional fee to encourage adoption over card payments."
❌ "Add ACH payments." (no context)
```

**Good Acceptance Criteria:**
- Testable (can verify pass/fail)
- Specific (includes values, messages, behaviors)
- Complete (covers happy path, edge cases, errors)

```
✅ "Invalid credentials display 'Invalid email or password' message without revealing which is wrong"
✅ "Failed login attempts are rate limited (5 attempts per 15 minutes)"
❌ "Login should work" (not testable)
❌ "Handle errors appropriately" (not specific)
```

**Good Technical Notes:**
- References specific technologies/services
- Mentions existing patterns to follow
- Highlights non-obvious requirements
- Considers security and performance

```
✅ "Use existing auth service pattern from staff authentication"
✅ "Multi-tenant isolation: payments scoped to tenant's own leases only"
❌ "Use best practices" (not actionable)
```

### Glossary Quality

**Good Glossary Term:**
- Complete definition, not just expansion of acronym
- Includes context for how it's used
- Lists aliases people might search for
- Specifies terms to avoid

```
✅ CAM: "Common Area Maintenance - Operating expenses for shared building spaces (lobbies, hallways, parking areas, landscaping) that are proportionally charged to tenants based on their pro-rata share of leased square footage. Calculated annually with year-end reconciliation against actual expenses."

❌ CAM: "Common Area Maintenance"
```

### Preference Quality

**Good Custom Preference:**
- Specific and actionable
- References concrete technologies/patterns
- Provides clear guidance

```
✅ "Include multi-tenant data isolation requirements in technical notes"
✅ "Reference specific integrations by name (Stripe, QuickBooks, SendGrid) where applicable"
❌ "Write good stories"
❌ "Consider security"
```

---

## 6. API Reference

### Authentication
```
POST /api/auth/login
Body: { username: string, password: string }
Returns: { data: { token: string, user: {...} } }
```

### Projects
```
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
DELETE /api/projects/:id
GET    /api/projects/:id/health
GET    /api/projects/:id/work-breakdown
```

### Specs
```
POST   /api/projects/:id/specs           (multipart/form-data)
POST   /api/projects/:id/specs/batch     (multipart/form-data, multiple files)
GET    /api/specs/:id
DELETE /api/specs/:id
POST   /api/specs/:id/extract
POST   /api/specs/:id/translate
GET    /api/specs/:id/sections
GET    /api/specs/:id/workitems
GET    /api/specs/:id/analysis
GET    /api/specs/:id/coverage
GET    /api/specs/:id/relationships
GET    /api/specs/:id/duplicates
```

### Work Items
```
GET    /api/workitems/:id
PATCH  /api/workitems/:id
DELETE /api/workitems/:id
POST   /api/workitems/:id/split
POST   /api/workitems/merge
POST   /api/workitems/bulk-update
GET    /api/workitems/:id/invest
GET    /api/workitems/:id/split-analysis
```

### Knowledge Base
```
GET    /api/projects/:id/knowledge
PATCH  /api/projects/:id/knowledge/brief
GET    /api/projects/:id/glossary
POST   /api/projects/:id/glossary
PATCH  /api/projects/:id/glossary/:termId
DELETE /api/projects/:id/glossary/:termId
GET    /api/projects/:id/documents
POST   /api/projects/:id/documents
DELETE /api/projects/:id/documents/:docId
```

### Preferences
```
GET    /api/projects/:id/preferences
PATCH  /api/projects/:id/preferences
```

### Templates
```
GET    /api/templates
POST   /api/templates
GET    /api/templates/:id
PUT    /api/templates/:id
DELETE /api/templates/:id
```

### Settings
```
GET    /api/settings
PATCH  /api/settings/branding
PATCH  /api/settings/export
POST   /api/settings/logo
DELETE /api/settings/logo
```

### Exports
```
POST   /api/specs/:id/export
GET    /api/exports/:id
GET    /api/specs/:id/export/csv
GET    /api/specs/:id/export/json
GET    /api/specs/:id/export/markdown
```

---

## 7. Validation Checklist

Before considering the Morefields project complete, verify:

### Project Level
- [ ] Project created with full name and description
- [ ] Project brief is comprehensive (1000+ words)
- [ ] Jira project key set if applicable

### Glossary
- [ ] Minimum 25 terms defined
- [ ] Each term has full definition (not just acronym expansion)
- [ ] Aliases included for commonly searched variants
- [ ] Categories assigned for organization
- [ ] Avoid terms specified where applicable

### Preferences
- [ ] AC format selected
- [ ] Verbosity level set
- [ ] Technical depth configured
- [ ] At least 5 custom preferences defined
- [ ] Required sections specified

### Specifications
- [ ] At least 2 spec documents uploaded
- [ ] Each spec has 10+ sections
- [ ] Sections cover different features/modules
- [ ] Specs are realistic (not lorem ipsum)

### Work Items (after translation)
- [ ] Hierarchy makes sense (Epics > Features > Stories)
- [ ] Stories have all required fields populated
- [ ] Acceptance criteria are specific and testable
- [ ] Technical notes reference actual technologies
- [ ] Size estimates are reasonable
- [ ] Dependencies identified between related stories

### Health Score
- [ ] Project health score is "Good" (51+) or "Excellent" (76+)
- [ ] All component scores are reasonable
- [ ] Recommendations addressed

---

*This context document should enable an AI agent to fully populate the Morefields project with production-quality data that will enable Handoff AI's translation system to generate excellent work items.*

*Last Updated: January 2025*
