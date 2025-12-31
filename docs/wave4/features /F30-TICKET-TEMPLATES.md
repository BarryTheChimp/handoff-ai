# F30: Flexible Ticket Templates

> **Priority:** MEDIUM | **Effort:** 4 hours | **Phase:** 3

---

## Overview

**What:** Allow users to define custom ticket structures beyond the current fixed template, controlling description format, body sections, AC format, and custom fields per ticket type.

**Why:** User feedback: "Templates need deeper flexibility." Different teams have different Jira workflows. Some need:
- Different description formats (user story vs imperative vs outcome-based)
- Custom body sections (Definition of Done, Technical Approach, etc.)
- Varying AC formats (Gherkin vs checklist vs prose)
- Type-specific fields (Spike needs "Research Questions", Bug needs "Steps to Reproduce")

**Success Criteria:**
- Create custom templates for each ticket type
- Preview template output
- Set default template per type
- Templates apply during translation

---

## User Stories

### Must Have

**US-30.1:** As a PM, I want to choose different description formats so that stories match my team's style.
- **AC:** Options: "User Story", "Imperative", "Outcome", "Custom"
- **AC:** User Story: "As a [user], I want to [action] so that [benefit]"
- **AC:** Imperative: "The system shall [action]"
- **AC:** Outcome: "[Action] enables [outcome]"

**US-30.2:** As a PM, I want to add custom body sections so that stories include team-specific information.
- **AC:** Add section with name and placeholder
- **AC:** Mark sections as required/optional
- **AC:** Reorder sections via drag

**US-30.3:** As a PM, I want different templates for different ticket types so that epics look different from stories.
- **AC:** Separate templates for: Story, Task, Bug, Spike, Epic
- **AC:** Set one as default per type

### Should Have

**US-30.4:** As a PM, I want to preview how a template will look so that I can verify before saving.
- **AC:** Live preview with sample data
- **AC:** Shows rendered markdown

---

## Technical Design

### Template Model

```prisma
model TicketTemplate {
  id                  String   @id @default(uuid())
  projectId           String
  project             Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  name                String
  ticketType          String   // 'story' | 'task' | 'bug' | 'spike' | 'epic'
  isDefault           Boolean  @default(false)
  
  // Description format
  descriptionFormat   String   // 'user_story' | 'imperative' | 'outcome' | 'custom'
  descriptionTemplate String?  // Custom template string
  
  // Body sections
  bodySections        Json     // [{name, placeholder, required}]
  
  // AC format
  acFormat            String   // 'gherkin' | 'checklist' | 'prose'
  acPrefix            String?  // e.g., "Given/When/Then" or "✓"
  
  // Custom fields (for Jira export)
  customFields        Json     // [{name, type, options}]
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  @@unique([projectId, name])
}
```

### API Endpoints

```typescript
// Get templates for project
GET /api/projects/:id/ticket-templates
Response: { data: TicketTemplate[] }

// Create template
POST /api/projects/:id/ticket-templates
Body: TicketTemplateInput
Response: { data: TicketTemplate }

// Update template
PATCH /api/ticket-templates/:id
Body: Partial<TicketTemplateInput>
Response: { data: TicketTemplate }

// Delete template
DELETE /api/ticket-templates/:id
Response: { data: { success: true } }

// Preview template
POST /api/ticket-templates/:id/preview
Body: { sampleData: { title, description, ac[] } }
Response: { data: { rendered: string } }

// Set as default
POST /api/ticket-templates/:id/set-default
Response: { data: TicketTemplate }
```

### Template Builder Service

```typescript
// backend/src/services/TemplateBuilderService.ts

export class TemplateBuilderService {
  
  async renderTemplate(templateId: string, data: WorkItem): Promise<string> {
    const template = await prisma.ticketTemplate.findUnique({
      where: { id: templateId }
    });
    
    if (!template) throw new NotFoundError('Template not found');
    
    const parts: string[] = [];
    
    // 1. Description
    parts.push(this.renderDescription(template, data));
    
    // 2. Body sections
    const sections = template.bodySections as BodySection[];
    for (const section of sections) {
      if (section.required || data[section.key]) {
        parts.push(`\n## ${section.name}\n`);
        parts.push(data[section.key] || section.placeholder || '_To be defined_');
      }
    }
    
    // 3. Acceptance Criteria
    parts.push('\n## Acceptance Criteria\n');
    parts.push(this.renderAC(template, data.acceptanceCriteria as string[]));
    
    // 4. Technical Notes (if present)
    if (data.technicalNotes) {
      parts.push('\n## Technical Notes\n');
      parts.push(data.technicalNotes);
    }
    
    return parts.join('\n');
  }
  
  private renderDescription(template: TicketTemplate, data: WorkItem): string {
    switch (template.descriptionFormat) {
      case 'user_story':
        return this.extractUserStory(data.description || data.title);
      
      case 'imperative':
        return `The system shall ${data.title.toLowerCase()}`;
      
      case 'outcome':
        return `${data.title} enables [describe outcome]`;
      
      case 'custom':
        return this.applyCustomTemplate(template.descriptionTemplate || '', data);
      
      default:
        return data.description || data.title;
    }
  }
  
  private extractUserStory(text: string): string {
    // Check if already in user story format
    if (text.toLowerCase().startsWith('as a')) {
      return text;
    }
    
    // Convert to user story format
    return `As a user, I want to ${text.toLowerCase()}, so that [benefit]`;
  }
  
  private renderAC(template: TicketTemplate, criteria: string[]): string {
    if (!criteria?.length) return '_No acceptance criteria defined_';
    
    switch (template.acFormat) {
      case 'gherkin':
        return criteria.map(ac => {
          if (ac.toLowerCase().startsWith('given')) return ac;
          return `Given [context]\nWhen ${ac}\nThen [expected result]`;
        }).join('\n\n');
      
      case 'checklist':
        return criteria.map(ac => `- [ ] ${ac}`).join('\n');
      
      case 'prose':
      default:
        return criteria.map((ac, i) => `${i + 1}. ${ac}`).join('\n');
    }
  }
  
  private applyCustomTemplate(template: string, data: WorkItem): string {
    return template
      .replace(/\{title\}/g, data.title)
      .replace(/\{description\}/g, data.description || '')
      .replace(/\{type\}/g, data.type);
  }
  
  async getDefaultTemplate(projectId: string, ticketType: string): Promise<TicketTemplate | null> {
    return prisma.ticketTemplate.findFirst({
      where: {
        projectId,
        ticketType,
        isDefault: true
      }
    });
  }
  
  async setAsDefault(templateId: string): Promise<TicketTemplate> {
    const template = await prisma.ticketTemplate.findUnique({
      where: { id: templateId }
    });
    
    if (!template) throw new NotFoundError('Template not found');
    
    // Unset other defaults for this type
    await prisma.ticketTemplate.updateMany({
      where: {
        projectId: template.projectId,
        ticketType: template.ticketType,
        isDefault: true
      },
      data: { isDefault: false }
    });
    
    // Set this as default
    return prisma.ticketTemplate.update({
      where: { id: templateId },
      data: { isDefault: true }
    });
  }
}
```

### Frontend - Template Builder

```tsx
// frontend/src/pages/TemplateBuilderPage.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PageLayout } from '../components/templates/PageLayout';
import { Button } from '../components/atoms/Button';
import { useToast } from '../stores/toastStore';

const DESCRIPTION_FORMATS = [
  { value: 'user_story', label: 'User Story', example: 'As a [user], I want to [action] so that [benefit]' },
  { value: 'imperative', label: 'Imperative', example: 'The system shall [action]' },
  { value: 'outcome', label: 'Outcome-based', example: '[Action] enables [outcome]' },
  { value: 'custom', label: 'Custom Template', example: 'Define your own format' },
];

const AC_FORMATS = [
  { value: 'gherkin', label: 'Gherkin (Given/When/Then)' },
  { value: 'checklist', label: 'Checklist (checkboxes)' },
  { value: 'prose', label: 'Numbered list' },
];

const TICKET_TYPES = ['story', 'task', 'bug', 'spike', 'epic'];

export function TemplateBuilderPage() {
  const { projectId } = useParams();
  const toast = useToast();
  
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [selectedType, setSelectedType] = useState('story');
  const [editing, setEditing] = useState<TicketTemplate | null>(null);
  const [preview, setPreview] = useState('');
  
  // Form state
  const [name, setName] = useState('');
  const [descriptionFormat, setDescriptionFormat] = useState('user_story');
  const [customTemplate, setCustomTemplate] = useState('');
  const [acFormat, setAcFormat] = useState('gherkin');
  const [bodySections, setBodySections] = useState<BodySection[]>([]);
  
  useEffect(() => {
    fetch(`/api/projects/${projectId}/ticket-templates`)
      .then(r => r.json())
      .then(d => setTemplates(d.data));
  }, [projectId]);
  
  const handleSave = async () => {
    const data = {
      name,
      ticketType: selectedType,
      descriptionFormat,
      descriptionTemplate: descriptionFormat === 'custom' ? customTemplate : null,
      acFormat,
      bodySections,
    };
    
    const url = editing 
      ? `/api/ticket-templates/${editing.id}`
      : `/api/projects/${projectId}/ticket-templates`;
    
    const method = editing ? 'PATCH' : 'POST';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (res.ok) {
      toast.success('Template saved');
      // Refresh templates
      const updated = await fetch(`/api/projects/${projectId}/ticket-templates`).then(r => r.json());
      setTemplates(updated.data);
      setEditing(null);
      resetForm();
    }
  };
  
  const handlePreview = async () => {
    if (!editing) return;
    
    const res = await fetch(`/api/ticket-templates/${editing.id}/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sampleData: {
          title: 'Example user story title',
          description: 'This is a sample description for preview purposes.',
          acceptanceCriteria: ['User can log in', 'System validates email format', 'Error messages are clear'],
          technicalNotes: 'Consider using OAuth 2.0',
        }
      }),
    });
    
    const data = await res.json();
    setPreview(data.data.rendered);
  };
  
  const resetForm = () => {
    setName('');
    setDescriptionFormat('user_story');
    setCustomTemplate('');
    setAcFormat('gherkin');
    setBodySections([]);
  };
  
  const typeTemplates = templates.filter(t => t.ticketType === selectedType);
  
  return (
    <PageLayout title="Ticket Templates">
      <div className="flex gap-6">
        {/* Type selector & list */}
        <div className="w-64 shrink-0">
          <div className="bg-toucan-dark-lighter rounded-lg p-4 mb-4">
            <h3 className="text-sm font-medium text-toucan-grey-200 mb-3">Ticket Type</h3>
            <div className="space-y-1">
              {TICKET_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`w-full text-left px-3 py-2 rounded text-sm ${
                    selectedType === type 
                      ? 'bg-toucan-orange text-white' 
                      : 'text-toucan-grey-300 hover:bg-toucan-dark'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="bg-toucan-dark-lighter rounded-lg p-4">
            <h3 className="text-sm font-medium text-toucan-grey-200 mb-3">
              {selectedType} Templates
            </h3>
            <div className="space-y-2">
              {typeTemplates.map(template => (
                <div 
                  key={template.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-toucan-dark cursor-pointer"
                  onClick={() => {
                    setEditing(template);
                    setName(template.name);
                    setDescriptionFormat(template.descriptionFormat);
                    setAcFormat(template.acFormat);
                    setBodySections(template.bodySections as BodySection[]);
                  }}
                >
                  <span className="text-sm text-toucan-grey-200">{template.name}</span>
                  {template.isDefault && (
                    <span className="text-xs text-toucan-orange">Default</span>
                  )}
                </div>
              ))}
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full"
                onClick={() => { setEditing(null); resetForm(); }}
              >
                + New Template
              </Button>
            </div>
          </div>
        </div>
        
        {/* Editor */}
        <div className="flex-1">
          <div className="bg-toucan-dark-lighter rounded-lg p-6">
            <h2 className="text-lg font-semibold text-toucan-grey-100 mb-6">
              {editing ? `Edit: ${editing.name}` : `New ${selectedType} Template`}
            </h2>
            
            {/* Name */}
            <div className="mb-4">
              <label className="block text-sm text-toucan-grey-300 mb-1">Template Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-toucan-dark border border-toucan-dark-border rounded px-3 py-2 text-toucan-grey-100"
                placeholder="e.g., Standard Story"
              />
            </div>
            
            {/* Description Format */}
            <div className="mb-4">
              <label className="block text-sm text-toucan-grey-300 mb-1">Description Format</label>
              <select
                value={descriptionFormat}
                onChange={e => setDescriptionFormat(e.target.value)}
                className="w-full bg-toucan-dark border border-toucan-dark-border rounded px-3 py-2 text-toucan-grey-100"
              >
                {DESCRIPTION_FORMATS.map(fmt => (
                  <option key={fmt.value} value={fmt.value}>{fmt.label}</option>
                ))}
              </select>
              <p className="text-xs text-toucan-grey-400 mt-1">
                {DESCRIPTION_FORMATS.find(f => f.value === descriptionFormat)?.example}
              </p>
            </div>
            
            {descriptionFormat === 'custom' && (
              <div className="mb-4">
                <label className="block text-sm text-toucan-grey-300 mb-1">Custom Template</label>
                <textarea
                  value={customTemplate}
                  onChange={e => setCustomTemplate(e.target.value)}
                  className="w-full bg-toucan-dark border border-toucan-dark-border rounded px-3 py-2 text-toucan-grey-100 h-24"
                  placeholder="Use {title}, {description}, {type} as placeholders"
                />
              </div>
            )}
            
            {/* AC Format */}
            <div className="mb-4">
              <label className="block text-sm text-toucan-grey-300 mb-1">Acceptance Criteria Format</label>
              <select
                value={acFormat}
                onChange={e => setAcFormat(e.target.value)}
                className="w-full bg-toucan-dark border border-toucan-dark-border rounded px-3 py-2 text-toucan-grey-100"
              >
                {AC_FORMATS.map(fmt => (
                  <option key={fmt.value} value={fmt.value}>{fmt.label}</option>
                ))}
              </select>
            </div>
            
            {/* Body Sections */}
            <div className="mb-6">
              <label className="block text-sm text-toucan-grey-300 mb-2">Body Sections</label>
              <div className="space-y-2">
                {bodySections.map((section, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={section.name}
                      onChange={e => {
                        const updated = [...bodySections];
                        updated[i].name = e.target.value;
                        setBodySections(updated);
                      }}
                      className="flex-1 bg-toucan-dark border border-toucan-dark-border rounded px-3 py-2 text-sm"
                      placeholder="Section name"
                    />
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={section.required}
                        onChange={e => {
                          const updated = [...bodySections];
                          updated[i].required = e.target.checked;
                          setBodySections(updated);
                        }}
                      />
                      Required
                    </label>
                    <button
                      onClick={() => setBodySections(bodySections.filter((_, j) => j !== i))}
                      className="text-toucan-error"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBodySections([...bodySections, { name: '', required: false, placeholder: '' }])}
                >
                  + Add Section
                </Button>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={handlePreview} disabled={!editing}>
                Preview
              </Button>
              <div className="flex gap-2">
                {editing && (
                  <Button variant="ghost" onClick={() => { setEditing(null); resetForm(); }}>
                    Cancel
                  </Button>
                )}
                <Button variant="primary" onClick={handleSave}>
                  Save Template
                </Button>
              </div>
            </div>
          </div>
          
          {/* Preview */}
          {preview && (
            <div className="bg-toucan-dark-lighter rounded-lg p-6 mt-4">
              <h3 className="text-sm font-medium text-toucan-grey-200 mb-3">Preview</h3>
              <div className="bg-toucan-dark rounded p-4 text-sm text-toucan-grey-300 whitespace-pre-wrap">
                {preview}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
```

---

## Testing Checklist

- [ ] Create template for each ticket type
- [ ] Description format applies correctly
- [ ] Custom template uses placeholders
- [ ] AC format renders correctly
- [ ] Body sections appear in output
- [ ] Default template selection works
- [ ] Preview shows accurate output

---

*F30 Specification v1.0*
