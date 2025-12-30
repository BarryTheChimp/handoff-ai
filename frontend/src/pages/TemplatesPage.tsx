import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Star,
  Edit,
  Trash2,
  FileText,
  List,
  CheckSquare,
} from 'lucide-react';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Modal } from '../components/atoms/Modal';
import { Spinner } from '../components/atoms/Spinner';
import {
  templatesApi,
  type StoryTemplate,
  type ACFormat,
  type CustomFieldDefinition,
  type CreateTemplateInput,
} from '../services/api';
import { useProject } from '../hooks/useProject';
import { clsx } from 'clsx';

const AC_FORMATS: { value: ACFormat; label: string; icon: typeof FileText; description: string }[] = [
  { value: 'gherkin', label: 'Gherkin', icon: FileText, description: 'Given/When/Then format' },
  { value: 'bullets', label: 'Bullets', icon: List, description: 'Bullet point list' },
  { value: 'checklist', label: 'Checklist', icon: CheckSquare, description: 'Checkbox items' },
];

const SECTIONS = [
  { value: 'description', label: 'Description' },
  { value: 'acceptanceCriteria', label: 'Acceptance Criteria' },
  { value: 'technicalNotes', label: 'Technical Notes' },
];

interface TemplateFormState {
  name: string;
  acFormat: ACFormat;
  requiredSections: string[];
  customFields: CustomFieldDefinition[];
  isDefault: boolean;
}

const DEFAULT_FORM: TemplateFormState = {
  name: '',
  acFormat: 'bullets',
  requiredSections: [],
  customFields: [],
  isDefault: false,
};

export function TemplatesPage() {
  const navigate = useNavigate();
  const { selectedProjectId, isLoading: isProjectLoading } = useProject();

  const [templates, setTemplates] = useState<StoryTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect to projects page if no project selected
  if (!isProjectLoading && !selectedProjectId) {
    return <Navigate to="/projects" replace />;
  }

  const projectId = selectedProjectId || '';

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<StoryTemplate | null>(null);
  const [formState, setFormState] = useState<TemplateFormState>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<StoryTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadTemplates = useCallback(async () => {
    try {
      setError(null);
      const data = await templatesApi.list(projectId);
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const openCreateForm = () => {
    setEditingTemplate(null);
    setFormState(DEFAULT_FORM);
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (template: StoryTemplate) => {
    setEditingTemplate(template);
    setFormState({
      name: template.name,
      acFormat: template.acFormat,
      requiredSections: template.requiredSections,
      customFields: template.customFields,
      isDefault: template.isDefault,
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formState.name.trim()) {
      setFormError('Template name is required');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const input: CreateTemplateInput = {
        name: formState.name.trim(),
        acFormat: formState.acFormat,
        requiredSections: formState.requiredSections,
        customFields: formState.customFields,
        isDefault: formState.isDefault,
      };

      if (editingTemplate) {
        await templatesApi.update(projectId, editingTemplate.id, input);
      } else {
        await templatesApi.create(projectId, input);
      }

      setShowForm(false);
      loadTemplates();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (template: StoryTemplate) => {
    try {
      await templatesApi.setDefault(projectId, template.id);
      loadTemplates();
    } catch (err) {
      console.error('Failed to set default:', err);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await templatesApi.delete(projectId, deleteTarget.id);
      setDeleteTarget(null);
      loadTemplates();
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSection = (section: string) => {
    setFormState((prev) => ({
      ...prev,
      requiredSections: prev.requiredSections.includes(section)
        ? prev.requiredSections.filter((s) => s !== section)
        : [...prev.requiredSections, section],
    }));
  };

  const addCustomField = () => {
    setFormState((prev) => ({
      ...prev,
      customFields: [
        ...prev.customFields,
        { name: '', label: '', type: 'text', required: false },
      ],
    }));
  };

  const updateCustomField = (index: number, updates: Partial<CustomFieldDefinition>) => {
    setFormState((prev) => ({
      ...prev,
      customFields: prev.customFields.map((f, i) =>
        i === index ? { ...f, ...updates } : f
      ),
    }));
  };

  const removeCustomField = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== index),
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-toucan-dark flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-toucan-dark">
      {/* Header */}
      <header className="border-b border-toucan-dark-border bg-toucan-dark-lighter">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="p-2 text-toucan-grey-400 hover:text-toucan-grey-100 hover:bg-toucan-dark rounded-md transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-lg font-semibold text-toucan-grey-100">Story Templates</h1>
            </div>
            <Button
              data-testid="create-template-button"
              variant="primary"
              onClick={openCreateForm}
            >
              <Plus size={16} className="mr-1.5" /> Create Template
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-toucan-error/20 border border-toucan-error rounded-lg text-toucan-error">
            {error}
          </div>
        )}

        {templates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto mb-4 text-toucan-grey-600" size={48} />
            <p className="text-toucan-grey-100 font-medium mb-2">No templates yet</p>
            <p className="text-toucan-grey-400 text-sm mb-6">
              Create a template to define how your stories should be structured
            </p>
            <Button variant="primary" onClick={openCreateForm}>
              <Plus size={16} className="mr-1.5" /> Create Template
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                data-testid="template-card"
                className={clsx(
                  'p-4 rounded-lg border',
                  template.isDefault
                    ? 'border-toucan-orange/30 bg-toucan-orange/5'
                    : 'border-toucan-dark-border bg-toucan-dark-lighter'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {template.isDefault && (
                        <Star size={14} className="text-toucan-orange" fill="currentColor" />
                      )}
                      <span className="font-medium text-toucan-grey-100">{template.name}</span>
                      {template.isDefault && (
                        <Badge variant="warning" size="sm">Default</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-toucan-grey-400">
                      <span>AC Format: {template.acFormat}</span>
                      <span>•</span>
                      <span>{template.customFields.length} custom fields</span>
                      <span>•</span>
                      <span>Required: {template.requiredSections.join(', ') || 'None'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditForm(template)}
                    >
                      <Edit size={14} />
                    </Button>
                    {!template.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(template)}
                        title="Set as default"
                      >
                        <Star size={14} />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(template)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => !isSaving && setShowForm(false)}
        title={editingTemplate ? 'Edit Template' : 'Create Template'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              data-testid="save-template-button"
              variant="primary"
              onClick={handleSave}
              loading={isSaving}
            >
              {editingTemplate ? 'Save Changes' : 'Create Template'}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {formError && (
            <div className="p-2 bg-toucan-error/20 text-toucan-error text-sm rounded">
              {formError}
            </div>
          )}

          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-toucan-grey-200 mb-1">
              Template Name *
            </label>
            <input
              data-testid="template-name-input"
              type="text"
              value={formState.name}
              onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Standard Story"
              className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-toucan-grey-100 placeholder-toucan-grey-600 focus:outline-none focus:ring-2 focus:ring-toucan-orange focus:border-transparent"
            />
          </div>

          {/* AC Format */}
          <div>
            <label className="block text-sm font-medium text-toucan-grey-200 mb-2">
              Acceptance Criteria Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              {AC_FORMATS.map((format) => {
                const Icon = format.icon;
                const isSelected = formState.acFormat === format.value;
                return (
                  <button
                    key={format.value}
                    data-testid={`format-${format.value}`}
                    onClick={() => setFormState((prev) => ({ ...prev, acFormat: format.value }))}
                    className={clsx(
                      'p-3 rounded-md border text-left transition-colors',
                      isSelected
                        ? 'border-toucan-orange bg-toucan-orange/10'
                        : 'border-toucan-dark-border hover:border-toucan-grey-400'
                    )}
                  >
                    <Icon size={20} className={isSelected ? 'text-toucan-orange' : 'text-toucan-grey-400'} />
                    <p className={clsx('font-medium mt-1', isSelected ? 'text-toucan-grey-100' : 'text-toucan-grey-200')}>
                      {format.label}
                    </p>
                    <p className="text-xs text-toucan-grey-400">{format.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Required Sections */}
          <div>
            <label className="block text-sm font-medium text-toucan-grey-200 mb-2">
              Required Sections
            </label>
            <div className="space-y-2">
              {SECTIONS.map((section) => (
                <label key={section.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    data-testid={`required-${section.value}`}
                    type="checkbox"
                    checked={formState.requiredSections.includes(section.value)}
                    onChange={() => toggleSection(section.value)}
                    className="w-4 h-4 rounded border-toucan-dark-border bg-toucan-dark text-toucan-orange focus:ring-toucan-orange"
                  />
                  <span className="text-toucan-grey-200">{section.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-toucan-grey-200">
                Custom Fields
              </label>
              <Button
                data-testid="add-field-button"
                variant="ghost"
                size="sm"
                onClick={addCustomField}
              >
                <Plus size={14} className="mr-1" /> Add Field
              </Button>
            </div>

            {formState.customFields.length === 0 ? (
              <p className="text-sm text-toucan-grey-400">No custom fields defined</p>
            ) : (
              <div className="space-y-3">
                {formState.customFields.map((field, index) => (
                  <div
                    key={index}
                    className="p-3 bg-toucan-dark rounded-md border border-toucan-dark-border"
                  >
                    <div className="grid grid-cols-3 gap-3 mb-2">
                      <input
                        data-testid={`field-name-${index}`}
                        type="text"
                        value={field.name}
                        onChange={(e) => updateCustomField(index, { name: e.target.value })}
                        placeholder="Field name"
                        className="bg-toucan-dark-lighter border border-toucan-dark-border rounded px-2 py-1 text-sm text-toucan-grey-100 focus:outline-none focus:ring-1 focus:ring-toucan-orange"
                      />
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateCustomField(index, { label: e.target.value })}
                        placeholder="Display label"
                        className="bg-toucan-dark-lighter border border-toucan-dark-border rounded px-2 py-1 text-sm text-toucan-grey-100 focus:outline-none focus:ring-1 focus:ring-toucan-orange"
                      />
                      <select
                        data-testid={`field-type-${index}`}
                        value={field.type}
                        onChange={(e) => updateCustomField(index, { type: e.target.value as 'text' | 'select' | 'boolean' })}
                        className="bg-toucan-dark-lighter border border-toucan-dark-border rounded px-2 py-1 text-sm text-toucan-grey-100 focus:outline-none focus:ring-1 focus:ring-toucan-orange"
                      >
                        <option value="text">Text</option>
                        <option value="select">Select</option>
                        <option value="boolean">Boolean</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          data-testid={`field-required-${index}`}
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateCustomField(index, { required: e.target.checked })}
                          className="w-4 h-4 rounded border-toucan-dark-border bg-toucan-dark text-toucan-orange focus:ring-toucan-orange"
                        />
                        <span className="text-sm text-toucan-grey-400">Required</span>
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomField(index)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                    {field.type === 'select' && (
                      <input
                        data-testid={`field-options-${index}`}
                        type="text"
                        value={field.options?.join(', ') || ''}
                        onChange={(e) => updateCustomField(index, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                        placeholder="Options (comma-separated)"
                        className="mt-2 w-full bg-toucan-dark-lighter border border-toucan-dark-border rounded px-2 py-1 text-sm text-toucan-grey-100 focus:outline-none focus:ring-1 focus:ring-toucan-orange"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Set as Default */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formState.isDefault}
              onChange={(e) => setFormState((prev) => ({ ...prev, isDefault: e.target.checked }))}
              className="w-4 h-4 rounded border-toucan-dark-border bg-toucan-dark text-toucan-orange focus:ring-toucan-orange"
            />
            <span className="text-toucan-grey-200">Set as default template</span>
          </label>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        title="Delete Template"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleDelete} loading={isDeleting}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-toucan-grey-200">
          Are you sure you want to delete "{deleteTarget?.name}"? This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
