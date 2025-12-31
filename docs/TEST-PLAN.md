# Handoff AI - Complete Test Plan

**Version:** Full Application (Wave 1-3)
**Last Updated:** December 31, 2025

---

## Pre-Test Setup

### 1. Database Connection
- [ ] Verify Supabase project is active (not paused)
- [ ] Run `curl http://localhost:3001/api/health` - database should show "connected"
- [ ] If disconnected, check `.env` file has correct `DATABASE_URL`

### 2. Run Database Migrations
```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

### 3. Verify Servers Running
- [ ] Backend: http://localhost:3001 (should return `{"status":"ok"}`)
- [ ] Frontend: http://localhost:3000 (should show login page)

---

## Test Categories

| Category | Features | Priority |
|----------|----------|----------|
| Authentication | Login, Register, Session | Critical |
| Projects | CRUD, Navigation | Critical |
| Specs | Upload, View, Edit | Critical |
| Work Items | Tree, Edit, Actions | Critical |
| Knowledge Base | Brief, Glossary, Preferences | High |
| Context Sources | CRUD, Sync | High |
| Health & Wizard | Score, Setup | Medium |
| Advanced Features | Bulk ops, Dependencies, Estimates | Medium |

---

## TEST SECTION 1: Authentication

### T1.1 - Registration
- [ ] Navigate to http://localhost:3000
- [ ] Click "Sign Up" or navigate to /register
- [ ] Enter test email (e.g., `test@example.com`)
- [ ] Enter password (min 6 characters)
- [ ] Submit form
- [ ] **Expected:** Redirected to dashboard/projects page

### T1.2 - Login
- [ ] Navigate to http://localhost:3000/login
- [ ] Enter registered email and password
- [ ] Click "Sign In"
- [ ] **Expected:** Redirected to dashboard with user email in header

### T1.3 - User Session
- [ ] After login, verify user email appears in top-right corner
- [ ] Click on user menu (avatar/email)
- [ ] **Expected:** Dropdown shows email, settings link, logout option

### T1.4 - Logout
- [ ] Click logout from user menu
- [ ] **Expected:** Redirected to login page
- [ ] Try accessing /projects directly
- [ ] **Expected:** Redirected back to login (protected route)

### T1.5 - Session Persistence
- [ ] Login successfully
- [ ] Refresh the page (F5)
- [ ] **Expected:** Still logged in, not redirected to login

---

## TEST SECTION 2: Project Management

### T2.1 - Create Project
- [ ] Click "New Project" button
- [ ] Enter project name: "Test Project Alpha"
- [ ] Enter description: "Testing all features"
- [ ] Click Create
- [ ] **Expected:** Project appears in list, redirected to project view

### T2.2 - View Projects List
- [ ] Navigate to /projects
- [ ] **Expected:** See grid/list of projects with cards
- [ ] Each card shows: name, description preview, created date

### T2.3 - Edit Project
- [ ] Click three-dot menu on project card
- [ ] Select "Edit"
- [ ] Change name to "Test Project Beta"
- [ ] Save changes
- [ ] **Expected:** Name updates in project list

### T2.4 - Project Switcher
- [ ] Create a second project: "Test Project Two"
- [ ] Click project switcher dropdown in header
- [ ] **Expected:** Both projects appear in dropdown
- [ ] Select other project
- [ ] **Expected:** Context switches to selected project

### T2.5 - Delete Project
- [ ] Click three-dot menu on test project
- [ ] Select "Delete"
- [ ] Confirm deletion
- [ ] **Expected:** Project removed from list

---

## TEST SECTION 3: Specification Upload & Processing

### T3.1 - Upload Spec Document
- [ ] Navigate to project dashboard
- [ ] Click "Upload Spec" or similar
- [ ] Select a test file (PDF, DOCX, or TXT)
- [ ] **Expected:** File uploads, processing begins

### T3.2 - View Spec List
- [ ] Navigate to Specs section
- [ ] **Expected:** See list of uploaded specs
- [ ] Each spec shows: name, status, date, type

### T3.3 - View Spec Details
- [ ] Click on a spec
- [ ] **Expected:** See spec content, sections, metadata
- [ ] Sections are parsed and displayed

### T3.4 - Manual Spec Entry
- [ ] Click "Create Spec" or "Manual Entry"
- [ ] Enter title: "Manual Test Spec"
- [ ] Enter content in text area
- [ ] Save
- [ ] **Expected:** Spec created and visible in list

---

## TEST SECTION 4: Work Items & Tree

### T4.1 - View Work Item Tree
- [ ] Select a spec that has been processed
- [ ] Navigate to Work Items view
- [ ] **Expected:** Hierarchical tree showing Epics > Features > Stories

### T4.2 - Expand/Collapse Tree Nodes
- [ ] Click expand arrow on Epic
- [ ] **Expected:** Child items revealed
- [ ] Click collapse
- [ ] **Expected:** Children hidden

### T4.3 - Select Work Item
- [ ] Click on a story in the tree
- [ ] **Expected:** Detail panel opens on right showing:
  - Title
  - Description
  - Acceptance Criteria
  - Technical Notes
  - Size estimate
  - Priority

### T4.4 - Edit Work Item
- [ ] With story selected, click Edit
- [ ] Change title
- [ ] Add acceptance criteria
- [ ] Save
- [ ] **Expected:** Changes persist, tree updates

### T4.5 - Change Work Item Status
- [ ] Select a work item
- [ ] Change status dropdown (draft → ready_for_review)
- [ ] **Expected:** Status badge updates
- [ ] Change to "approved"
- [ ] **Expected:** Visual indicator changes

---

## TEST SECTION 5: Knowledge Base (Wave 3)

### T5.1 - Navigate to Knowledge Base
- [ ] From project, click "Knowledge Base" in sidebar
- [ ] **Expected:** See tabs for Brief, Glossary, Preferences

### T5.2 - Project Brief
- [ ] Click "Brief" tab
- [ ] Enter project overview text
- [ ] Add goals (comma-separated or list)
- [ ] Add scope items
- [ ] Save
- [ ] **Expected:** Brief saves, health score may update

### T5.3 - Glossary Terms
- [ ] Click "Glossary" tab
- [ ] Click "Add Term"
- [ ] Enter term: "API"
- [ ] Enter definition: "Application Programming Interface"
- [ ] Save
- [ ] **Expected:** Term appears in list
- [ ] Add 5 more terms
- [ ] **Expected:** All terms visible, searchable

### T5.4 - Edit/Delete Glossary Term
- [ ] Click edit on existing term
- [ ] Modify definition
- [ ] Save
- [ ] **Expected:** Updated definition shows
- [ ] Delete a term
- [ ] **Expected:** Term removed from list

### T5.5 - Preferences
- [ ] Click "Preferences" tab
- [ ] Add preference key: "story_format"
- [ ] Add value: "As a [user], I want [feature], so that [benefit]"
- [ ] Save
- [ ] **Expected:** Preference saved
- [ ] Add 2-3 more preferences
- [ ] **Expected:** All preferences visible

---

## TEST SECTION 6: Context Sources (Wave 3)

### T6.1 - Add Context Source
- [ ] Navigate to Context Sources page
- [ ] Click "Add Source"
- [ ] Enter name: "API Documentation"
- [ ] Select type: "api_reference"
- [ ] Enter URL: "https://api.example.com/docs"
- [ ] Save
- [ ] **Expected:** Source appears in list with "pending" status

### T6.2 - Sync Context Source
- [ ] Click sync button on source
- [ ] **Expected:** Status changes to "syncing"
- [ ] Wait for completion
- [ ] **Expected:** Status changes to "synced" or shows content preview

### T6.3 - Edit Context Source
- [ ] Click edit on source
- [ ] Change name
- [ ] Save
- [ ] **Expected:** Name updates

### T6.4 - Delete Context Source
- [ ] Click delete on source
- [ ] Confirm
- [ ] **Expected:** Source removed from list

---

## TEST SECTION 7: Health Score & Setup Wizard (Wave 3)

### T7.1 - View Health Score Widget
- [ ] Navigate to project dashboard
- [ ] **Expected:** Health score widget visible showing:
  - Overall percentage (0-100)
  - Level (minimal/basic/good/excellent)
  - Component breakdown bars

### T7.2 - Refresh Health Score
- [ ] Click refresh button on health widget
- [ ] **Expected:** Score recalculates
- [ ] Add more knowledge base content
- [ ] Refresh again
- [ ] **Expected:** Score increases

### T7.3 - Setup Wizard - New Project
- [ ] Create a brand new project
- [ ] **Expected:** Setup wizard may appear automatically OR
- [ ] Click "Setup Guide" button
- [ ] **Expected:** Multi-step wizard opens

### T7.4 - Complete Setup Wizard Steps
- [ ] Step 1 - Basics: Verify project name, add description
- [ ] Step 2 - Brief: Enter project overview and goals
- [ ] Step 3 - Glossary: Add 3+ domain terms
- [ ] Step 4 - Preferences: Add generation preferences
- [ ] Click "Complete Setup"
- [ ] **Expected:** Wizard closes, health score shows improvement

### T7.5 - Health Score Levels
After completing various amounts of setup:
- [ ] **Minimal (0-39):** Empty project, no knowledge
- [ ] **Basic (40-59):** Has some brief or glossary
- [ ] **Good (60-79):** Has brief, glossary, preferences
- [ ] **Excellent (80-100):** All sections filled, has specs

---

## TEST SECTION 8: Advanced Features

### T8.1 - Bulk Operations
- [ ] Select multiple work items (checkboxes)
- [ ] Click "Bulk Actions"
- [ ] Change status of all selected
- [ ] **Expected:** All selected items update

### T8.2 - Dependencies
- [ ] Select a work item
- [ ] Click "Add Dependency"
- [ ] Select another work item as dependency
- [ ] Save
- [ ] **Expected:** Dependency link visible

### T8.3 - Estimates
- [ ] Select a work item
- [ ] Set size: "M" (medium)
- [ ] **Expected:** Estimate indicator shows
- [ ] View project estimates summary
- [ ] **Expected:** Total story points visible

### T8.4 - Templates
- [ ] Navigate to Templates section
- [ ] Create template from existing work item
- [ ] Apply template to new spec
- [ ] **Expected:** Template content applied

### T8.5 - History
- [ ] Edit a work item multiple times
- [ ] Click "History" on that item
- [ ] **Expected:** See revision history with timestamps

---

## TEST SECTION 9: Navigation & UI

### T9.1 - Global Navigation
- [ ] Logo click → Goes to dashboard
- [ ] Project selector → Shows all projects
- [ ] User menu → Shows logout option
- [ ] Breadcrumbs → Navigate back through hierarchy

### T9.2 - Sidebar Navigation
- [ ] Dashboard link works
- [ ] Specs link works
- [ ] Work Items link works
- [ ] Knowledge Base link works
- [ ] Context Sources link works
- [ ] Settings link works (if applicable)

### T9.3 - Responsive Design
- [ ] Resize browser to mobile width
- [ ] **Expected:** Navigation collapses to hamburger
- [ ] Click hamburger menu
- [ ] **Expected:** Slide-out menu appears

### T9.4 - Dark Theme Consistency
- [ ] All pages should have dark background (#1A1A2E)
- [ ] Orange accents (#FF6B35) for primary actions
- [ ] Text should be readable (grey-100 to grey-400)

---

## TEST SECTION 10: API Verification

Run these curl commands to verify backend endpoints:

### Authentication
```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"api-test@example.com","password":"testpass123"}'

# Login (save token)
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"api-test@example.com","password":"testpass123"}' | jq -r '.data.token')

# Get current user
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Projects
```bash
# List projects
curl http://localhost:3001/api/projects \
  -H "Authorization: Bearer $TOKEN"

# Create project
curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"API Test Project","description":"Created via API"}'
```

### Knowledge Base
```bash
# Get brief (replace PROJECT_ID)
curl http://localhost:3001/api/projects/PROJECT_ID/brief \
  -H "Authorization: Bearer $TOKEN"

# Get glossary
curl http://localhost:3001/api/projects/PROJECT_ID/glossary \
  -H "Authorization: Bearer $TOKEN"

# Get preferences
curl http://localhost:3001/api/projects/PROJECT_ID/preferences \
  -H "Authorization: Bearer $TOKEN"
```

### Health Score
```bash
# Get health
curl http://localhost:3001/api/projects/PROJECT_ID/health \
  -H "Authorization: Bearer $TOKEN"

# Recalculate
curl -X POST http://localhost:3001/api/projects/PROJECT_ID/health/recalculate \
  -H "Authorization: Bearer $TOKEN"
```

---

## Issue Tracking

| Test ID | Status | Issue Found | Notes |
|---------|--------|-------------|-------|
| T1.1 | | | |
| T1.2 | | | |
| T1.3 | | | |
| ... | | | |

---

## Test Completion Sign-off

| Tester | Date | Sections Tested | Pass/Fail |
|--------|------|-----------------|-----------|
| | | | |

---

## Known Limitations

1. **Database Required:** Most features require active database connection
2. **File Upload:** Requires multipart support, 50MB limit
3. **AI Translation:** Requires CLAUDE_API_KEY in .env
4. **Jira Export:** Requires Jira OAuth credentials (optional)

---

## Quick Start Testing Checklist

For a quick smoke test, verify these critical paths:

- [ ] Can login/register
- [ ] Can create a project
- [ ] Can upload/create a spec
- [ ] Can view work items tree
- [ ] Can edit a work item
- [ ] Can add knowledge base content
- [ ] Health score updates correctly

If all these pass, core functionality is working.
