import { prisma } from '../lib/prisma.js';

export type ACFormat = 'gherkin' | 'bullets' | 'checklist';

export interface CustomFieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'select' | 'boolean';
  required: boolean;
  options?: string[];
}

export interface CreateTemplateInput {
  name: string;
  acFormat?: ACFormat;
  requiredSections?: string[];
  customFields?: CustomFieldDefinition[];
  isDefault?: boolean;
}

export interface UpdateTemplateInput {
  name?: string;
  acFormat?: ACFormat;
  requiredSections?: string[];
  customFields?: CustomFieldDefinition[];
}

export interface TemplateData {
  id: string;
  projectId: string;
  name: string;
  isDefault: boolean;
  acFormat: ACFormat;
  requiredSections: string[];
  customFields: CustomFieldDefinition[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface TemplateService {
  create(projectId: string, input: CreateTemplateInput): Promise<TemplateData>;
  update(templateId: string, input: UpdateTemplateInput): Promise<TemplateData>;
  delete(templateId: string): Promise<void>;
  getById(templateId: string): Promise<TemplateData | null>;
  list(projectId: string): Promise<TemplateData[]>;
  getDefault(projectId: string): Promise<TemplateData | null>;
  setDefault(templateId: string): Promise<TemplateData>;
  validateWorkItem(
    item: { description?: string; acceptanceCriteria?: string; technicalNotes?: string; customFields?: Record<string, unknown> },
    template: TemplateData
  ): ValidationResult;
  buildPromptInstructions(template: TemplateData): string;
}

const VALID_SECTIONS = ['description', 'acceptanceCriteria', 'technicalNotes'];
const MAX_CUSTOM_FIELDS = 20;
const MAX_OPTIONS = 50;

function transformTemplate(raw: {
  id: string;
  projectId: string;
  name: string;
  isDefault: boolean;
  acFormat: string;
  requiredSections: string[];
  customFields: unknown;
  createdAt: Date;
  updatedAt: Date;
}): TemplateData {
  return {
    id: raw.id,
    projectId: raw.projectId,
    name: raw.name,
    isDefault: raw.isDefault,
    acFormat: raw.acFormat as ACFormat,
    requiredSections: raw.requiredSections,
    customFields: raw.customFields as CustomFieldDefinition[],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function createTemplateService(): TemplateService {
  return {
    async create(projectId: string, input: CreateTemplateInput): Promise<TemplateData> {
      // Validate custom fields
      if (input.customFields) {
        if (input.customFields.length > MAX_CUSTOM_FIELDS) {
          throw new Error(`Maximum ${MAX_CUSTOM_FIELDS} custom fields allowed`);
        }
        for (const field of input.customFields) {
          if (field.type === 'select' && field.options && field.options.length > MAX_OPTIONS) {
            throw new Error(`Maximum ${MAX_OPTIONS} options per select field`);
          }
        }
      }

      // Validate required sections
      if (input.requiredSections) {
        for (const section of input.requiredSections) {
          if (!VALID_SECTIONS.includes(section)) {
            throw new Error(`Invalid section: ${section}. Valid sections: ${VALID_SECTIONS.join(', ')}`);
          }
        }
      }

      // If this should be default, unset other defaults
      if (input.isDefault) {
        await prisma.storyTemplate.updateMany({
          where: { projectId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const template = await prisma.storyTemplate.create({
        data: {
          projectId,
          name: input.name,
          acFormat: input.acFormat || 'bullets',
          requiredSections: input.requiredSections || [],
          customFields: input.customFields || [],
          isDefault: input.isDefault || false,
        },
      });

      return transformTemplate(template);
    },

    async update(templateId: string, input: UpdateTemplateInput): Promise<TemplateData> {
      // Validate custom fields
      if (input.customFields) {
        if (input.customFields.length > MAX_CUSTOM_FIELDS) {
          throw new Error(`Maximum ${MAX_CUSTOM_FIELDS} custom fields allowed`);
        }
        for (const field of input.customFields) {
          if (field.type === 'select' && field.options && field.options.length > MAX_OPTIONS) {
            throw new Error(`Maximum ${MAX_OPTIONS} options per select field`);
          }
        }
      }

      // Validate required sections
      if (input.requiredSections) {
        for (const section of input.requiredSections) {
          if (!VALID_SECTIONS.includes(section)) {
            throw new Error(`Invalid section: ${section}. Valid sections: ${VALID_SECTIONS.join(', ')}`);
          }
        }
      }

      const data: Record<string, unknown> = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.acFormat !== undefined) data.acFormat = input.acFormat;
      if (input.requiredSections !== undefined) data.requiredSections = input.requiredSections;
      if (input.customFields !== undefined) data.customFields = input.customFields;

      const template = await prisma.storyTemplate.update({
        where: { id: templateId },
        data,
      });

      return transformTemplate(template);
    },

    async delete(templateId: string): Promise<void> {
      // Check if template is in use
      const usageCount = await prisma.workItem.count({
        where: { templateId },
      });

      if (usageCount > 0) {
        throw new Error(`Cannot delete template used by ${usageCount} work items`);
      }

      await prisma.storyTemplate.delete({
        where: { id: templateId },
      });
    },

    async getById(templateId: string): Promise<TemplateData | null> {
      const template = await prisma.storyTemplate.findUnique({
        where: { id: templateId },
      });

      return template ? transformTemplate(template) : null;
    },

    async list(projectId: string): Promise<TemplateData[]> {
      const templates = await prisma.storyTemplate.findMany({
        where: { projectId },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      });

      return templates.map(transformTemplate);
    },

    async getDefault(projectId: string): Promise<TemplateData | null> {
      const template = await prisma.storyTemplate.findFirst({
        where: { projectId, isDefault: true },
      });

      return template ? transformTemplate(template) : null;
    },

    async setDefault(templateId: string): Promise<TemplateData> {
      const template = await prisma.storyTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        throw new Error('Template not found');
      }

      // Unset other defaults in the same project
      await prisma.storyTemplate.updateMany({
        where: { projectId: template.projectId, isDefault: true },
        data: { isDefault: false },
      });

      // Set this one as default
      const updated = await prisma.storyTemplate.update({
        where: { id: templateId },
        data: { isDefault: true },
      });

      return transformTemplate(updated);
    },

    validateWorkItem(
      item: { description?: string; acceptanceCriteria?: string; technicalNotes?: string; customFields?: Record<string, unknown> },
      template: TemplateData
    ): ValidationResult {
      const errors: string[] = [];

      // Validate required sections
      for (const section of template.requiredSections) {
        const value = item[section as keyof typeof item];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          errors.push(`${section} is required`);
        }
      }

      // Validate custom fields
      const customFields = item.customFields || {};
      for (const fieldDef of template.customFields) {
        const value = customFields[fieldDef.name];

        // Check required
        if (fieldDef.required) {
          if (value === undefined || value === null || value === '') {
            errors.push(`${fieldDef.name} is required`);
            continue;
          }
        }

        // Validate select options
        if (value !== undefined && value !== null && value !== '' && fieldDef.type === 'select' && fieldDef.options) {
          if (!fieldDef.options.includes(value as string)) {
            errors.push(`${fieldDef.name} must be one of: ${fieldDef.options.join(', ')}`);
          }
        }

        // Validate boolean
        if (value !== undefined && value !== null && fieldDef.type === 'boolean') {
          if (typeof value !== 'boolean') {
            errors.push(`${fieldDef.name} must be a boolean`);
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    },

    buildPromptInstructions(template: TemplateData): string {
      const sections: string[] = [];

      sections.push(`## Story Template: ${template.name}\n`);

      // AC Format instructions
      sections.push('### Acceptance Criteria Format\n');
      if (template.acFormat === 'gherkin') {
        sections.push(`Write acceptance criteria in Gherkin format:
\`\`\`
Given [precondition]
When [action]
Then [expected result]
And [additional expectations]
\`\`\`

Example:
\`\`\`
Given a user is logged in
When they click the "Settings" button
Then they should see the settings panel
And their current preferences should be displayed
\`\`\`
`);
      } else if (template.acFormat === 'bullets') {
        sections.push(`Write acceptance criteria as bullet points:
- Each criterion starts with a dash
- Use clear, testable statements
- Include edge cases

Example:
- User can view their profile information
- Profile photo displays at 200x200 pixels
- Missing fields show "Not provided" placeholder
`);
      } else if (template.acFormat === 'checklist') {
        sections.push(`Write acceptance criteria as a checklist:
- [ ] Each item is a checkbox
- [ ] Items should be independently verifiable
- [ ] Include both happy path and edge cases

Example:
- [ ] Login form validates email format
- [ ] Error message displays for invalid credentials
- [ ] Successful login redirects to dashboard
`);
      }

      // Required sections
      if (template.requiredSections.length > 0) {
        sections.push('### Required Sections\n');
        sections.push('The following sections MUST have content:');
        for (const section of template.requiredSections) {
          sections.push(`- ${section}`);
        }
        sections.push('');
      }

      // Custom fields
      if (template.customFields.length > 0) {
        sections.push('### Custom Fields\n');
        sections.push('Stories should consider these team-specific fields (AI cannot fill values, but can reference in descriptions):');
        for (const field of template.customFields) {
          const required = field.required ? ', required' : '';
          sections.push(`- ${field.label} (${field.type}${required})`);
        }
      }

      return sections.join('\n');
    },
  };
}

// Export singleton instance
let _templateService: TemplateService | null = null;

export function getTemplateService(): TemplateService {
  if (!_templateService) {
    _templateService = createTemplateService();
  }
  return _templateService;
}
