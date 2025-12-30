# Feature 3: Custom Templates

## Complete Build Specification

**Version**: 1.0  
**Last Updated**: December 2024  
**Estimated Build Time**: 2-3 hours  
**Complexity**: Medium

---

## 1. Overview

### What We're Building
A template system that allows teams to define how their stories should be structured. This includes:
- Acceptance criteria format (Gherkin/Given-When-Then, bullet points, checklist)
- Required sections (technical notes, security considerations, accessibility)
- Custom fields (team-specific metadata like "Epic Link", "Sprint", "Component")
- Default values and validation rules

Templates are applied during AI translation and enforced during manual editing.

### Why We're Building It
Different teams have different conventions:
- **QA-heavy teams** want Gherkin acceptance criteria for test automation
- **Regulated industries** require security/compliance sections on every story
- **Enterprise teams** need custom fields that map to their Jira configuration
- **Agile teams** want consistent story structure for estimation accuracy

Currently, AI translation produces generic output. Teams spend time reformatting every story to match their conventions.

**Reference**: This follows Frost's Atomic Design principle - templates are the "organisms" that define how smaller components (fields, sections) combine into consistent patterns.

### Success Criteria
1. Create template with name and AC format in under 2 minutes
2. Add custom fields with validation rules
3. AI translation respects template structure
4. Manual edits validate against required fields
5. Multiple templates per project (different story types)

---

## 2. User Stories

### Must Have (P0)

**US-3.1: Create Template**
> As a project admin, I want to create a story template, so that all generated stories follow our team conventions.

*Acceptance Criteria:*
- Create template with unique name per project
- Select AC format: Gherkin, Bullets, Checklist
- Template saved immediately
- Can create multiple templates per project

**US-3.2: Set Default Template**
> As a project admin, I want to set a default template, so that it's used automatically for new translations.

*Acceptance Criteria:*
- One template per project marked as default
- Default used when no template specified
- Can change default at any time
- Visual indicator for default template

**US-3.3: AC Format Selection**
> As a project admin, I want to choose the acceptance criteria format, so that generated ACs match our testing approach.

*Acceptance Criteria:*
- Three format options:
  - **Gherkin**: Given/When/Then blocks
  - **Bullets**: Bullet point list
  - **Checklist**: Checkbox items (- [ ])
- Format applied during AI translation
- Preview shows example of selected format

**US-3.4: Required Sections**
> As a project admin, I want to mark certain sections as required, so that no story is incomplete.

*Acceptance Criteria:*
- Toggle sections as required: description, AC, technical notes
- Required indicator shown in editor
- Validation error if required section empty
- Cannot approve story with missing required sections

**US-3.5: Apply Template to Translation**
> As a user, I want the AI to use my template when generating stories, so that output matches my conventions.

*Acceptance Criteria:*
- Template selection in translation options
- Default template used if none selected
- Generated stories follow template structure
- AC format matches template setting

### Should Have (P1)

**US-3.6: Custom Fields**
> As a project admin, I want to add custom fields to templates, so that stories capture team-specific data.

*Acceptance Criteria:*
- Field types: text, select (dropdown), boolean (checkbox)
- Required/optional per field
- Select fields have predefined options
- Custom fields shown in story editor
- Custom fields exported to Jira (if mapped)

**US-3.7: Template Inheritance**
> As a project admin, I want to create templates that extend a base template, so that I can have variations without duplication.

*Acceptance Criteria:*
- Select parent template when creating
- Child inherits parent's settings
- Child can override specific settings
- Deleting parent doesn't delete children

### Nice to Have (P2)

**US-3.8: Import/Export Templates**
> As a project admin, I want to export templates as JSON, so that I can share them across projects.

*Acceptance Criteria:*
- Export template as JSON file
- Import JSON to create new template
- Validation on import
- Handles naming conflicts

---

## 3. Functional Requirements

### Template Management

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-3.01 | Template belongs to a project | Integration test |
| FR-3.02 | Template name unique within project | Unit test |
| FR-3.03 | Template name max 100 characters | Unit test |
| FR-3.04 | Only one default template per project | Integration test |
| FR-3.05 | Deleting default template clears default status | Integration test |
| FR-3.06 | Template CRUD requires project admin role | Integration test |
| FR-3.07 | List templates returns project's templates | Integration test |

### AC Format

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-3.08 | Three AC formats: gherkin, bullets, checklist | Unit test |
| FR-3.09 | Default format is "bullets" | Unit test |
| FR-3.10 | Format stored on template | Integration test |
| FR-3.11 | Translation prompt includes format instructions | Integration test |
| FR-3.12 | Format examples included in prompt | Integration test |

### Required Sections

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-3.13 | Sections: description, acceptanceCriteria, technicalNotes | Unit test |
| FR-3.14 | Each section independently toggleable as required | Unit test |
| FR-3.15 | Required sections validated on story save | Integration test |
| FR-3.16 | Required sections validated on status change to approved | Integration test |
| FR-3.17 | Validation returns list of missing sections | Unit test |

### Custom Fields

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-3.18 | Field types: text, select, boolean | Unit test |
| FR-3.19 | Field has name, type, required flag | Unit test |
| FR-3.20 | Select field has options array | Unit test |
| FR-3.21 | Max 20 custom fields per template | Unit test |
| FR-3.22 | Field name unique within template | Unit test |
| FR-3.23 | Custom field values stored on WorkItem.customFields JSON | Integration test |
| FR-3.24 | Custom field validation on save | Integration test |

### Translation Integration

| ID | Requirement | Validation |
|----|-------------|------------|
| FR-3.25 | Translation accepts templateId parameter | Integration test |
| FR-3.26 | Default template used if templateId not provided | Integration test |
| FR-3.27 | Template AC format included in story generation prompt | Integration test |
| FR-3.28 | Generated stories include empty custom fields | Integration test |
| FR-3.29 | Template stored on generated WorkItems | Integration test |

---

## 4. Non-Functional Requirements

### Performance

| Requirement | Target |
|-------------|--------|
| Template CRUD operations | < 200ms |
| Template list query | < 100ms |
| Validation check | < 50ms |

### Limits

| Requirement | Limit |
|-------------|-------|
| Templates per project | 50 |
| Custom fields per template | 20 |
| Select options per field | 50 |
| Field name length | 50 characters |
| Option value length | 100 characters |

---

## 5. Architecture

### System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ TemplatesPage   │  │ TemplateBuilder │  │ StoryEditor     │  │
│  │ (list/manage)   │  │ (create/edit)   │  │ (shows custom   │  │
│  │                 │  │                 │  │  fields)        │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  templates.ts routes                     │    │
│  │  GET  /api/projects/:projectId/templates                 │    │
│  │  POST /api/projects/:projectId/templates                 │    │
│  │  PUT  /api/projects/:projectId/templates/:id             │    │
│  │  DELETE /api/projects/:projectId/templates/:id           │    │
│  │  POST /api/projects/:projectId/templates/:id/default     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  TemplateService                         │    │
│  │  • create(), update(), delete()                          │    │
│  │  • setDefault()                                          │    │
│  │  • validateWorkItem()                                    │    │
│  │  • buildPromptInstructions()                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              TranslationService (modified)               │    │
│  │  • Include template instructions in prompts              │    │
│  │  • Apply template to generated stories                   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Template Application Flow

```
1. User triggers translation with templateId
   │
   ▼
2. TranslationService loads template
   │
   ▼
3. Pass 3 (Story Generation) prompt includes:
   ├─► AC format instructions
   ├─► Required sections list
   └─► Custom field definitions
   │
   ▼
4. AI generates stories following template
   │
   ▼
5. Stories created with:
   ├─► templateId reference
   ├─► AC in correct format
   └─► customFields JSON (empty, ready for values)
```

### Design Decisions

**Decision 1: Template Stored Separately from Project**
- **Choice**: StoryTemplate as separate table, not JSON in Project
- **Rationale**: Templates have their own lifecycle, need querying, may be shared in future
- **Reference**: Kleppmann - "Store data in the form you need to query it"

**Decision 2: Custom Fields as JSON Column**
- **Choice**: Store custom field values in WorkItem.customFields JSON
- **Rationale**: Schema varies per template, JSON is flexible
- **Trade-off**: No SQL-level validation, but application-level is sufficient
- **Alternative considered**: EAV pattern. Rejected for complexity.

**Decision 3: Format Instructions in Prompt, Not Post-Processing**
- **Choice**: Include AC format examples in AI prompt
- **Rationale**: AI generates correctly formatted content directly
- **Alternative considered**: Generate generic, transform after. Rejected for quality.

---

## 6. Data Model

### New Table

```prisma
model StoryTemplate {
  id               String   @id @default(uuid())
  projectId        String   @map("project_id")
  name             String
  isDefault        Boolean  @default(false) @map("is_default")
  
  // AC Format
  acFormat         String   @default("bullets") @map("ac_format") // 'gherkin', 'bullets', 'checklist'
  
  // Required Sections
  requiredSections String[] @default([]) @map("required_sections") // ['description', 'acceptanceCriteria', 'technicalNotes']
  
  // Custom Fields
  customFields     Json     @default("[]") @map("custom_fields")
  
  // Metadata
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")
  
  // Relations
  project          Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@unique([projectId, name])
  @@index([projectId])
  @@map("story_templates")
}
```

### Modify WorkItem

```prisma
model WorkItem {
  // ... existing fields ...
  
  // Add template reference and custom field values
  templateId       String?  @map("template_id")
  customFields     Json     @default("{}") @map("custom_fields")
}
```

### Custom Fields JSON Schema

**Template.customFields** (array of field definitions):
```json
[
  {
    "name": "component",
    "label": "Component",
    "type": "select",
    "required": true,
    "options": ["Frontend", "Backend", "Database", "Infrastructure"]
  },
  {
    "name": "securityReview",
    "label": "Requires Security Review",
    "type": "boolean",
    "required": false
  },
  {
    "name": "techDebt",
    "label": "Tech Debt Notes",
    "type": "text",
    "required": false
  }
]
```

**WorkItem.customFields** (values):
```json
{
  "component": "Frontend",
  "securityReview": true,
  "techDebt": "Consider refactoring auth module"
}
```

### Migration

```sql
-- Migration: add_story_templates

CREATE TABLE "story_templates" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "project_id" UUID NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "name" VARCHAR(100) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT FALSE,
    "ac_format" VARCHAR(20) NOT NULL DEFAULT 'bullets',
    "required_sections" VARCHAR(50)[] DEFAULT '{}',
    "custom_fields" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    
    UNIQUE("project_id", "name")
);

CREATE INDEX "story_templates_project_id_idx" ON "story_templates"("project_id");

-- Add template reference to work_items
ALTER TABLE "work_items" ADD COLUMN "template_id" UUID;
ALTER TABLE "work_items" ADD COLUMN "custom_fields" JSONB NOT NULL DEFAULT '{}';
```

---

## 7. API Design

### GET /api/projects/:projectId/templates

**Response 200 OK**:
```json
{
  "data": [
    {
      "id": "tmpl_123",
      "name": "Standard Story",
      "isDefault": true,
      "acFormat": "gherkin",
      "requiredSections": ["description", "acceptanceCriteria"],
      "customFields": [
        {
          "name": "component",
          "label": "Component",
          "type": "select",
          "required": true,
          "options": ["Frontend", "Backend", "API"]
        }
      ],
      "createdAt": "2024-12-01T10:00:00Z",
      "updatedAt": "2024-12-15T14:30:00Z"
    }
  ]
}
```

### POST /api/projects/:projectId/templates

**Request**:
```json
{
  "name": "Bug Fix Template",
  "acFormat": "checklist",
  "requiredSections": ["description", "acceptanceCriteria", "technicalNotes"],
  "customFields": [
    {
      "name": "rootCause",
      "label": "Root Cause",
      "type": "text",
      "required": true
    },
    {
      "name": "severity",
      "label": "Severity",
      "type": "select",
      "required": true,
      "options": ["Critical", "High", "Medium", "Low"]
    }
  ],
  "isDefault": false
}
```

**Response 201 Created**:
```json
{
  "data": {
    "id": "tmpl_456",
    "name": "Bug Fix Template",
    "acFormat": "checklist",
    "requiredSections": ["description", "acceptanceCriteria", "technicalNotes"],
    "customFields": [...],
    "isDefault": false,
    "createdAt": "2024-12-30T10:00:00Z",
    "updatedAt": "2024-12-30T10:00:00Z"
  }
}
```

### PUT /api/projects/:projectId/templates/:id

**Request**:
```json
{
  "name": "Bug Fix Template v2",
  "acFormat": "bullets"
}
```

**Response 200 OK**: Full updated template object

### DELETE /api/projects/:projectId/templates/:id

**Response 204 No Content**

**Response 400 Bad Request** (if template in use):
```json
{
  "error": {
    "code": "TEMPLATE_IN_USE",
    "message": "Cannot delete template used by 15 work items"
  }
}
```

### POST /api/projects/:projectId/templates/:id/default

**Description**: Set this template as the project default.

**Response 200 OK**:
```json
{
  "data": {
    "id": "tmpl_456",
    "isDefault": true
  }
}
```

---

## 8. AI/ML Components

### Modified Story Generation Prompt

Add to existing `backend/src/prompts/api-spec/stories.txt`:

```
{{#if template}}
## Story Template: {{template.name}}

### Acceptance Criteria Format
{{#if (eq template.acFormat "gherkin")}}
Write acceptance criteria in Gherkin format:
```
Given [precondition]
When [action]
Then [expected result]
And [additional expectations]
```

Example:
```
Given a user is logged in
When they click the "Settings" button
Then they should see the settings panel
And their current preferences should be displayed
```
{{/if}}

{{#if (eq template.acFormat "bullets")}}
Write acceptance criteria as bullet points:
- Each criterion starts with a dash
- Use clear, testable statements
- Include edge cases

Example:
- User can view their profile information
- Profile photo displays at 200x200 pixels
- Missing fields show "Not provided" placeholder
{{/if}}

{{#if (eq template.acFormat "checklist")}}
Write acceptance criteria as a checklist:
- [ ] Each item is a checkbox
- [ ] Items should be independently verifiable
- [ ] Include both happy path and edge cases

Example:
- [ ] Login form validates email format
- [ ] Error message displays for invalid credentials
- [ ] Successful login redirects to dashboard
{{/if}}

### Required Sections
The following sections MUST have content:
{{#each template.requiredSections}}
- {{this}}
{{/each}}

### Custom Fields
Stories should consider these team-specific fields (AI cannot fill values, but can reference in descriptions):
{{#each template.customFields}}
- {{this.label}} ({{this.type}}{{#if this.required}}, required{{/if}})
{{/each}}
{{/if}}
```

### Format Validation

After AI generates content, validate AC format matches template:

```typescript
function validateAcFormat(ac: string, format: 'gherkin' | 'bullets' | 'checklist'): boolean {
  switch (format) {
    case 'gherkin':
      return /\b(Given|When|Then|And)\b/i.test(ac);
    case 'bullets':
      return ac.includes('- ') || ac.includes('• ');
    case 'checklist':
      return ac.includes('- [ ]') || ac.includes('- [x]');
    default:
      return true;
  }
}
```

---

## 9. UI/UX Specification

### Screen: Templates List Page

**Route**: `/projects/:projectId/templates`

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Project              Templates                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [+ Create Template]                                             │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ★ Standard Story                              DEFAULT        ││
│  │ AC Format: Gherkin · 2 custom fields                        ││
│  │ Required: Description, AC                     [Edit] [···]  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │   Bug Fix Template                                          ││
│  │ AC Format: Checklist · 3 custom fields                      ││
│  │ Required: Description, AC, Tech Notes         [Edit] [···]  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │   Spike Template                                            ││
│  │ AC Format: Bullets · 0 custom fields                        ││
│  │ Required: Description                         [Edit] [···]  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Screen: Template Builder

**Route**: `/projects/:projectId/templates/new` or `/projects/:projectId/templates/:id`

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back                    Create Template          [Save]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Template Name                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Standard Story                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Acceptance Criteria Format                                      │
│                                                                  │
│  ┌─────────┐  ┌─────────┐  ┌───────────┐                       │
│  │ Gherkin │  │ Bullets │  │ Checklist │                       │
│  │  ✓      │  │         │  │           │                       │
│  └─────────┘  └─────────┘  └───────────┘                       │
│                                                                  │
│  Preview:                                                        │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Given a user is logged in                                   ││
│  │ When they click "Profile"                                   ││
│  │ Then they see their profile page                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Required Sections                                               │
│                                                                  │
│  [✓] Description                                                 │
│  [✓] Acceptance Criteria                                         │
│  [ ] Technical Notes                                             │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  Custom Fields                                    [+ Add Field]  │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Component           Select ▼        [✓] Required    [×]     ││
│  │ Options: Frontend, Backend, API                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Tech Debt Notes     Text            [ ] Required    [×]     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Component: Custom Field in Story Editor

When viewing/editing a story that has a template:

```
┌─────────────────────────────────────────────────────────────────┐
│  Story: Implement user login                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Description *                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Allow users to log in with email and password               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Acceptance Criteria *                                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Given a registered user                                     ││
│  │ When they enter valid credentials                           ││
│  │ Then they are logged in and redirected...                   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Technical Notes                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Use existing auth service...                                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ─── Custom Fields (Standard Story template) ───────────────── │
│                                                                  │
│  Component *                                                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Frontend                                                 ▼  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Tech Debt Notes                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│                                        [Cancel]  [Save Changes] │
└─────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
TemplatesPage (page)
├── PageHeader
│   ├── BackButton
│   └── Title "Templates"
├── CreateTemplateButton
└── TemplateList (organism)
    └── TemplateCard (molecule) × N
        ├── TemplateName
        ├── DefaultBadge (conditional)
        ├── TemplateMetadata (format, field count, required)
        └── TemplateActions
            ├── EditButton
            └── DropdownMenu (Set Default, Delete)

TemplateBuilder (page)
├── PageHeader
│   ├── BackButton
│   ├── Title
│   └── SaveButton
├── TemplateNameInput (molecule)
├── ACFormatSelector (organism)
│   ├── FormatOption (molecule) × 3
│   │   ├── RadioButton
│   │   ├── FormatLabel
│   │   └── FormatDescription
│   └── FormatPreview (molecule)
├── RequiredSectionsSelector (organism)
│   └── SectionCheckbox (atom) × 3
└── CustomFieldsEditor (organism)
    ├── AddFieldButton
    └── CustomFieldRow (molecule) × N
        ├── FieldNameInput
        ├── FieldTypeSelect
        ├── RequiredCheckbox
        ├── OptionsEditor (for select type)
        └── RemoveFieldButton

StoryEditor (modify existing)
└── CustomFieldsSection (new organism)
    ├── SectionHeader "Custom Fields"
    └── CustomFieldInput (molecule) × N
        ├── FieldLabel
        └── FieldInput (TextInput | Select | Checkbox)
```

---

## 10. Testing Strategy

### Unit Tests

**TemplateService.test.ts**:
```typescript
describe('TemplateService', () => {
  describe('create', () => {
    it('creates template with default values', async () => {
      const template = await service.create(projectId, {
        name: 'Test Template'
      });
      
      expect(template.acFormat).toBe('bullets');
      expect(template.requiredSections).toEqual([]);
      expect(template.customFields).toEqual([]);
      expect(template.isDefault).toBe(false);
    });

    it('rejects duplicate name in same project', async () => {
      await service.create(projectId, { name: 'Duplicate' });
      
      await expect(service.create(projectId, { name: 'Duplicate' }))
        .rejects.toThrow('already exists');
    });

    it('allows same name in different project', async () => {
      await service.create(project1Id, { name: 'Same Name' });
      
      const template = await service.create(project2Id, { name: 'Same Name' });
      expect(template).toBeDefined();
    });
  });

  describe('setDefault', () => {
    it('sets template as default', async () => {
      const template = await service.create(projectId, { name: 'New Default' });
      
      await service.setDefault(template.id);
      
      const updated = await service.getById(template.id);
      expect(updated.isDefault).toBe(true);
    });

    it('unsets previous default', async () => {
      const template1 = await service.create(projectId, { name: 'First', isDefault: true });
      const template2 = await service.create(projectId, { name: 'Second' });
      
      await service.setDefault(template2.id);
      
      const updated1 = await service.getById(template1.id);
      expect(updated1.isDefault).toBe(false);
    });
  });

  describe('validateWorkItem', () => {
    it('passes when all required sections present', async () => {
      const template = await service.create(projectId, {
        name: 'Strict',
        requiredSections: ['description', 'acceptanceCriteria']
      });

      const result = service.validateWorkItem({
        description: 'Has content',
        acceptanceCriteria: 'Has AC'
      }, template);

      expect(result.valid).toBe(true);
    });

    it('fails when required section empty', async () => {
      const template = await service.create(projectId, {
        name: 'Strict',
        requiredSections: ['technicalNotes']
      });

      const result = service.validateWorkItem({
        description: 'Has content',
        technicalNotes: ''
      }, template);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('technicalNotes is required');
    });

    it('validates required custom fields', async () => {
      const template = await service.create(projectId, {
        name: 'With Fields',
        customFields: [
          { name: 'component', type: 'select', required: true, options: ['A', 'B'] }
        ]
      });

      const result = service.validateWorkItem({
        description: 'Content',
        customFields: {}
      }, template);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('component is required');
    });

    it('validates select field values', async () => {
      const template = await service.create(projectId, {
        name: 'With Select',
        customFields: [
          { name: 'component', type: 'select', required: true, options: ['A', 'B'] }
        ]
      });

      const result = service.validateWorkItem({
        customFields: { component: 'Invalid' }
      }, template);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('component must be one of: A, B');
    });
  });

  describe('buildPromptInstructions', () => {
    it('generates gherkin instructions', () => {
      const template = { acFormat: 'gherkin', requiredSections: [], customFields: [] };
      
      const instructions = service.buildPromptInstructions(template);
      
      expect(instructions).toContain('Given');
      expect(instructions).toContain('When');
      expect(instructions).toContain('Then');
    });

    it('includes required sections', () => {
      const template = { 
        acFormat: 'bullets', 
        requiredSections: ['technicalNotes'], 
        customFields: [] 
      };
      
      const instructions = service.buildPromptInstructions(template);
      
      expect(instructions).toContain('technicalNotes');
      expect(instructions).toContain('MUST');
    });
  });
});
```

### Integration Tests

**templates.routes.test.ts**:
```typescript
describe('Template Routes', () => {
  describe('POST /api/projects/:projectId/templates', () => {
    it('creates template', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/templates`,
        headers: { authorization: `Bearer ${token}` },
        payload: {
          name: 'New Template',
          acFormat: 'gherkin',
          requiredSections: ['description']
        }
      });
      
      expect(response.statusCode).toBe(201);
      expect(response.json().data.name).toBe('New Template');
    });
  });

  describe('POST /api/projects/:projectId/templates/:id/default', () => {
    it('sets template as default', async () => {
      const template = await createTemplate(projectId);
      
      const response = await app.inject({
        method: 'POST',
        url: `/api/projects/${projectId}/templates/${template.id}/default`,
        headers: { authorization: `Bearer ${token}` }
      });
      
      expect(response.statusCode).toBe(200);
      expect(response.json().data.isDefault).toBe(true);
    });
  });
});

describe('Translation with Template', () => {
  it('uses template AC format', async () => {
    const template = await createTemplate(projectId, { acFormat: 'gherkin' });
    const spec = await createSpec(projectId);
    
    await translationService.translate(spec.id, { templateId: template.id });
    
    const workItems = await prisma.workItem.findMany({
      where: { specId: spec.id, type: 'story' }
    });
    
    // Check AC contains Gherkin keywords
    workItems.forEach(item => {
      expect(item.acceptanceCriteria).toMatch(/Given|When|Then/i);
    });
  });
});
```

### E2E Tests

**templates.spec.ts**:
```typescript
test('create template with custom fields', async ({ page }) => {
  await page.goto(`/projects/${projectId}/templates`);
  
  // Click create
  await page.click('[data-testid="create-template-button"]');
  
  // Fill name
  await page.fill('[data-testid="template-name-input"]', 'E2E Test Template');
  
  // Select Gherkin format
  await page.click('[data-testid="format-gherkin"]');
  
  // Check required sections
  await page.check('[data-testid="required-description"]');
  await page.check('[data-testid="required-ac"]');
  
  // Add custom field
  await page.click('[data-testid="add-field-button"]');
  await page.fill('[data-testid="field-name-0"]', 'component');
  await page.selectOption('[data-testid="field-type-0"]', 'select');
  await page.fill('[data-testid="field-options-0"]', 'Frontend, Backend, API');
  await page.check('[data-testid="field-required-0"]');
  
  // Save
  await page.click('[data-testid="save-template-button"]');
  
  // Verify redirect and template in list
  await expect(page).toHaveURL(`/projects/${projectId}/templates`);
  await expect(page.locator('[data-testid="template-card"]')).toContainText('E2E Test Template');
});
```

---

## 11. Implementation Plan

### Build Order

```
Phase 1: Backend (75 min)
├── 1.1 Database migration (15 min)
│   └── Add StoryTemplate table, modify WorkItem
├── 1.2 TemplateService (30 min)
│   ├── CRUD operations
│   ├── setDefault()
│   ├── validateWorkItem()
│   └── buildPromptInstructions()
├── 1.3 Routes (15 min)
│   └── All template endpoints
└── 1.4 Modify TranslationService (15 min)
    └── Accept templateId, include in prompt

Phase 2: Frontend (60 min)
├── 2.1 TemplatesPage (20 min)
│   └── List with cards
├── 2.2 TemplateBuilder (25 min)
│   ├── Name input
│   ├── ACFormatSelector
│   ├── RequiredSections
│   └── CustomFieldsEditor
└── 2.3 StoryEditor modification (15 min)
    └── CustomFieldsSection

Phase 3: Integration (15 min)
├── 3.1 Add to routes
├── 3.2 Add to navigation
└── 3.3 Wire translation UI
```

### Files to Create

**Backend:**
- `backend/prisma/migrations/xxx_add_story_templates/migration.sql`
- `backend/src/services/TemplateService.ts`
- `backend/src/routes/templates.ts`

**Frontend:**
- `frontend/src/pages/TemplatesPage.tsx`
- `frontend/src/components/organisms/TemplateBuilder.tsx`
- `frontend/src/components/organisms/ACFormatSelector.tsx`
- `frontend/src/components/organisms/CustomFieldsEditor.tsx`
- `frontend/src/components/organisms/CustomFieldsSection.tsx` (for StoryEditor)

**Modified:**
- `backend/src/services/TranslationService.ts`
- `backend/src/prompts/api-spec/stories.txt`
- `frontend/src/components/organisms/StoryEditor.tsx`
- `frontend/src/services/api.ts`

---

## 12. Open Questions

### Stakeholder Input

1. **Should templates be shareable across projects?**
   - Current: Templates scoped to project
   - Alternative: Organization-level templates
   - **Recommendation**: Keep project-scoped for v1
   - **Decision needed by**: Before UI implementation

2. **What happens to existing stories when template changes?**
   - Option A: Existing stories unchanged (orphaned custom field values)
   - Option B: Validation errors on old stories
   - **Recommendation**: Option A - don't break existing work
   - **Decision needed by**: Before validation implementation

### Technical Unknowns

None significant - straightforward CRUD + prompt modification.

---

*End of Feature 3 Specification*
