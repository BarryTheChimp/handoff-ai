import { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Save,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Check,
  FileText,
  List,
  CheckSquare,
  Type,
  ToggleLeft,
  ListFilter,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Spinner } from '../atoms/Spinner';
import { useToastStore } from '../../stores/toastStore';

type ACFormat = 'gherkin' | 'bullets' | 'checklist';

interface CustomFieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'select' | 'boolean';
  required: boolean;
  options?: string[];
}

interface TemplateData {
  id: string;
  projectId: string;
  name: string;
  isDefault: boolean;
  acFormat: ACFormat;
  requiredSections: string[];
  customFields: CustomFieldDefinition[];
}

interface TemplateBuilderProps {
  projectId: string;
  templateId?: string | null;
  onSave: (template: TemplateData) => void;
  onCancel: () => void;
}

const AC_FORMAT_OPTIONS: Array<{ value: ACFormat; label: string; icon: React.ReactNode; description: string }> = [
  {
    value: 'gherkin',
    label: 'Gherkin',
    icon: <FileText size={16} />,
    description: 'Given/When/Then format for BDD',
  },
  {
    value: 'bullets',
    label: 'Bullet Points',
    icon: <List size={16} />,
    description: 'Simple bullet list of criteria',
  },
  {
    value: 'checklist',
    label: 'Checklist',
    icon: <CheckSquare size={16} />,
    description: 'Checkbox items for QA verification',
  },
];

const SECTION_OPTIONS = [
  { value: 'description', label: 'Description' },
  { value: 'acceptanceCriteria', label: 'Acceptance Criteria' },
  { value: 'technicalNotes', label: 'Technical Notes' },
];

const FIELD_TYPES: Array<{ value: 'text' | 'select' | 'boolean'; label: string; icon: React.ReactNode }> = [
  { value: 'text', label: 'Text', icon: <Type size={14} /> },
  { value: 'select', label: 'Select', icon: <ListFilter size={14} /> },
  { value: 'boolean', label: 'Boolean', icon: <ToggleLeft size={14} /> },
];

export function TemplateBuilder({ projectId, templateId, onSave, onCancel }: TemplateBuilderProps) {
  const [loading, setLoading] = useState(!!templateId);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [acFormat, setAcFormat] = useState<ACFormat>('bullets');
  const [requiredSections, setRequiredSections] = useState<string[]>([]);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [expandedField, setExpandedField] = useState<number | null>(null);
  const addToast = useToastStore((state) => state.addToast);

  useEffect(() => {
    if (!templateId) return;

    const fetchTemplate = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch(`/api/templates/${templateId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to load template');

        const data = await response.json();
        const template = data.data;
        setName(template.name);
        setAcFormat(template.acFormat);
        setRequiredSections(template.requiredSections);
        setCustomFields(template.customFields);
      } catch (error) {
        addToast('Failed to load template', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [templateId, addToast]);

  const handleSave = async () => {
    if (!name.trim()) {
      addToast('Template name is required', 'error');
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('auth_token');
      const url = templateId ? `/api/templates/${templateId}` : '/api/templates';
      const method = templateId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId,
          name,
          acFormat,
          requiredSections,
          customFields,
        }),
      });

      if (!response.ok) throw new Error('Failed to save template');

      const data = await response.json();
      addToast('Template saved successfully', 'success');
      onSave(data.data);
    } catch (error) {
      addToast('Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addCustomField = () => {
    const newField: CustomFieldDefinition = {
      name: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
    };
    setCustomFields([...customFields, newField]);
    setExpandedField(customFields.length);
  };

  const updateCustomField = (index: number, updates: Partial<CustomFieldDefinition>) => {
    const updated = [...customFields];
    const current = updated[index];
    if (!current) return;

    updated[index] = { ...current, ...updates };

    // Auto-generate name from label
    if (updates.label) {
      updated[index]!.name = updates.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
    }

    setCustomFields(updated);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
    setExpandedField(null);
  };

  const toggleSection = (section: string) => {
    if (requiredSections.includes(section)) {
      setRequiredSections(requiredSections.filter((s) => s !== section));
    } else {
      setRequiredSections([...requiredSections, section]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-h-[80vh] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-toucan-dark-lighter px-6 py-4 border-b border-toucan-dark-border z-10">
        <h2 className="text-lg font-semibold text-toucan-grey-100">
          {templateId ? 'Edit Template' : 'Create Template'}
        </h2>
      </div>

      <div className="p-6 space-y-6">
        {/* Template Name */}
        <div>
          <label className="block text-sm font-medium text-toucan-grey-300 mb-2">
            Template Name <span className="text-toucan-error">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Standard User Story"
            className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-toucan-grey-100 focus:outline-none focus:ring-2 focus:ring-toucan-orange"
          />
        </div>

        {/* AC Format Selection */}
        <div>
          <label className="block text-sm font-medium text-toucan-grey-300 mb-3">
            Acceptance Criteria Format
          </label>
          <div className="grid grid-cols-3 gap-3">
            {AC_FORMAT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setAcFormat(option.value)}
                className={clsx(
                  'p-4 rounded-lg border text-left transition-all',
                  acFormat === option.value
                    ? 'border-toucan-orange bg-toucan-orange/10'
                    : 'border-toucan-dark-border hover:border-toucan-grey-600'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={acFormat === option.value ? 'text-toucan-orange' : 'text-toucan-grey-400'}>
                    {option.icon}
                  </span>
                  <span className="font-medium text-toucan-grey-100">{option.label}</span>
                </div>
                <p className="text-xs text-toucan-grey-400">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Required Sections */}
        <div>
          <label className="block text-sm font-medium text-toucan-grey-300 mb-3">
            Required Sections
          </label>
          <div className="space-y-2">
            {SECTION_OPTIONS.map((section) => (
              <label
                key={section.value}
                className={clsx(
                  'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                  requiredSections.includes(section.value)
                    ? 'border-toucan-orange bg-toucan-orange/10'
                    : 'border-toucan-dark-border hover:border-toucan-grey-600'
                )}
              >
                <div
                  className={clsx(
                    'w-5 h-5 rounded border flex items-center justify-center flex-shrink-0',
                    requiredSections.includes(section.value)
                      ? 'bg-toucan-orange border-toucan-orange'
                      : 'border-toucan-grey-600'
                  )}
                >
                  {requiredSections.includes(section.value) && (
                    <Check size={12} className="text-white" />
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={requiredSections.includes(section.value)}
                  onChange={() => toggleSection(section.value)}
                  className="sr-only"
                />
                <span className="text-sm text-toucan-grey-100">{section.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Custom Fields */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-toucan-grey-300">Custom Fields</label>
            <button
              type="button"
              onClick={addCustomField}
              className="flex items-center gap-1 px-2 py-1 text-sm text-toucan-orange hover:text-toucan-orange-light"
            >
              <Plus size={14} />
              Add Field
            </button>
          </div>

          {customFields.length === 0 ? (
            <div className="text-center py-6 text-toucan-grey-500 text-sm border border-dashed border-toucan-dark-border rounded-lg">
              No custom fields defined
            </div>
          ) : (
            <div className="space-y-2">
              {customFields.map((field, index) => {
                const isExpanded = expandedField === index;

                return (
                  <div
                    key={index}
                    className="border border-toucan-dark-border rounded-lg overflow-hidden"
                  >
                    <div className="flex items-center gap-3 p-3 bg-toucan-dark/50">
                      <GripVertical size={16} className="text-toucan-grey-600 cursor-grab" />

                      <button
                        type="button"
                        onClick={() => setExpandedField(isExpanded ? null : index)}
                        className="flex-1 flex items-center gap-2 text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown size={16} className="text-toucan-grey-500" />
                        ) : (
                          <ChevronRight size={16} className="text-toucan-grey-500" />
                        )}
                        <span className="text-sm text-toucan-grey-100">{field.label}</span>
                        <span className="text-xs text-toucan-grey-500">({field.type})</span>
                        {field.required && (
                          <span className="text-xs text-toucan-error">Required</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => removeCustomField(index)}
                        className="p-1 text-toucan-grey-500 hover:text-toucan-error"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="p-4 space-y-4 border-t border-toucan-dark-border">
                        {/* Field Label */}
                        <div>
                          <label className="block text-xs text-toucan-grey-400 mb-1">Label</label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => updateCustomField(index, { label: e.target.value })}
                            className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-sm text-toucan-grey-100"
                          />
                        </div>

                        {/* Field Type */}
                        <div>
                          <label className="block text-xs text-toucan-grey-400 mb-1">Type</label>
                          <div className="flex gap-2">
                            {FIELD_TYPES.map((type) => (
                              <button
                                key={type.value}
                                type="button"
                                onClick={() => updateCustomField(index, { type: type.value })}
                                className={clsx(
                                  'flex items-center gap-1 px-3 py-1.5 rounded text-sm border',
                                  field.type === type.value
                                    ? 'border-toucan-orange bg-toucan-orange/20 text-toucan-orange'
                                    : 'border-toucan-dark-border text-toucan-grey-400'
                                )}
                              >
                                {type.icon}
                                {type.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Select Options */}
                        {field.type === 'select' && (
                          <div>
                            <label className="block text-xs text-toucan-grey-400 mb-1">
                              Options (comma separated)
                            </label>
                            <input
                              type="text"
                              value={field.options?.join(', ') || ''}
                              onChange={(e) =>
                                updateCustomField(index, {
                                  options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                })
                              }
                              placeholder="Option 1, Option 2, Option 3"
                              className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-sm text-toucan-grey-100"
                            />
                          </div>
                        )}

                        {/* Required Toggle */}
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateCustomField(index, { required: e.target.checked })}
                            className="sr-only"
                          />
                          <div
                            className={clsx(
                              'w-8 h-4 rounded-full transition-colors',
                              field.required ? 'bg-toucan-orange' : 'bg-toucan-dark-border'
                            )}
                          >
                            <div
                              className={clsx(
                                'w-4 h-4 bg-white rounded-full transition-transform',
                                field.required ? 'translate-x-4' : 'translate-x-0'
                              )}
                            />
                          </div>
                          <span className="text-sm text-toucan-grey-300">Required field</span>
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-toucan-dark-lighter px-6 py-4 border-t border-toucan-dark-border flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-toucan-grey-400 hover:text-toucan-grey-200"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-toucan-orange text-white rounded-md text-sm hover:bg-toucan-orange-light disabled:opacity-50"
        >
          {saving ? (
            <>
              <Spinner size="sm" />
              Saving...
            </>
          ) : (
            <>
              <Save size={14} />
              Save Template
            </>
          )}
        </button>
      </div>
    </div>
  );
}
