import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Plus, Trash2, Sparkles } from 'lucide-react';
import { projectsApi, knowledgeApi, type CreateGlossaryTermInput } from '../../services/api';

// =============================================================================
// TYPES
// =============================================================================

type WizardStep = 'basics' | 'brief' | 'glossary' | 'preferences' | 'done';

interface SetupWizardProps {
  onComplete: (projectId: string) => void;
  onSkip: () => void;
}

interface WizardData {
  name: string;
  description: string;
  brief: string;
  glossaryTerms: CreateGlossaryTermInput[];
  acFormat: 'gherkin' | 'bullets' | 'checklist' | 'numbered';
  requiredSections: string[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STEP_ORDER: WizardStep[] = ['basics', 'brief', 'glossary', 'preferences', 'done'];

const BRIEF_TEMPLATES = {
  api: `## Project Overview
[Describe what this API integration does]

## Key Systems
- System A: [description]
- System B: [description]

## Technical Constraints
- [List any important constraints]`,
  product: `## Product Overview
[What is the product and who uses it]

## User Personas
- [Primary user type]
- [Secondary user type]

## Core Features
- [Feature 1]
- [Feature 2]`,
  migration: `## Migration Overview
[What is being migrated and why]

## Source System
[Description of current system]

## Target System
[Description of new system]

## Key Requirements
- [Requirement 1]
- [Requirement 2]`,
};

const COMMON_SECTIONS = [
  'Error Handling',
  'Security',
  'Performance',
  'Accessibility',
  'Testing Notes',
  'Dependencies',
];

// =============================================================================
// COMPONENT
// =============================================================================

export function SetupWizard({ onComplete, onSkip }: SetupWizardProps) {
  const [step, setStep] = useState<WizardStep>('basics');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<WizardData>({
    name: '',
    description: '',
    brief: '',
    glossaryTerms: [],
    acFormat: 'bullets',
    requiredSections: [],
  });

  const [newTerm, setNewTerm] = useState({ term: '', definition: '' });

  // Progress calculation
  function getProgress(): number {
    const index = STEP_ORDER.indexOf(step);
    return ((index + 1) / STEP_ORDER.length) * 100;
  }

  // Step navigation
  function canGoNext(): boolean {
    switch (step) {
      case 'basics':
        return data.name.trim().length > 0;
      default:
        return true;
    }
  }

  function goNext() {
    const currentIndex = STEP_ORDER.indexOf(step);
    if (currentIndex < STEP_ORDER.length - 1) {
      const nextStep = STEP_ORDER[currentIndex + 1];
      if (nextStep) setStep(nextStep);
    }
  }

  function goBack() {
    const currentIndex = STEP_ORDER.indexOf(step);
    if (currentIndex > 0) {
      const prevStep = STEP_ORDER[currentIndex - 1];
      if (prevStep) setStep(prevStep);
    }
  }

  // Step handlers
  async function handleBasicsComplete() {
    setIsLoading(true);
    setError(null);
    try {
      const createInput: { name: string; description?: string } = {
        name: data.name,
      };
      if (data.description) {
        createInput.description = data.description;
      }
      const project = await projectsApi.create(createInput);
      setProjectId(project.id);
      goNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleBriefComplete() {
    if (data.brief && projectId) {
      setIsLoading(true);
      setError(null);
      try {
        await knowledgeApi.updateBrief(projectId, data.brief);
      } catch (err) {
        console.error('Failed to save brief:', err);
      } finally {
        setIsLoading(false);
      }
    }
    goNext();
  }

  async function handleGlossaryComplete() {
    if (data.glossaryTerms.length > 0 && projectId) {
      setIsLoading(true);
      setError(null);
      try {
        await knowledgeApi.bulkImportGlossary(projectId, data.glossaryTerms);
      } catch (err) {
        console.error('Failed to save glossary:', err);
      } finally {
        setIsLoading(false);
      }
    }
    goNext();
  }

  async function handlePreferencesComplete() {
    if (projectId) {
      setIsLoading(true);
      setError(null);
      try {
        await knowledgeApi.updatePreferencesConfig(projectId, {
          acFormat: data.acFormat,
          requiredSections: data.requiredSections,
        });
      } catch (err) {
        console.error('Failed to save preferences:', err);
      } finally {
        setIsLoading(false);
      }
    }
    goNext();
  }

  function handleAddTerm() {
    if (newTerm.term && newTerm.definition) {
      setData({
        ...data,
        glossaryTerms: [...data.glossaryTerms, { ...newTerm }],
      });
      setNewTerm({ term: '', definition: '' });
    }
  }

  function handleRemoveTerm(index: number) {
    setData({
      ...data,
      glossaryTerms: data.glossaryTerms.filter((_, i) => i !== index),
    });
  }

  function toggleSection(section: string) {
    if (data.requiredSections.includes(section)) {
      setData({
        ...data,
        requiredSections: data.requiredSections.filter(s => s !== section),
      });
    } else {
      setData({
        ...data,
        requiredSections: [...data.requiredSections, section],
      });
    }
  }

  // Render
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Progress Bar */}
        <div className="h-1 bg-toucan-dark">
          <div
            className="h-full bg-toucan-orange transition-all duration-300"
            style={{ width: `${getProgress()}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-toucan-dark-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-toucan-orange" />
            <h2 className="text-lg font-semibold text-toucan-grey-100">New Project Setup</h2>
          </div>
          <button
            onClick={onSkip}
            className="p-1 text-toucan-grey-400 hover:text-toucan-grey-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Step: Basics */}
          {step === 'basics' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-toucan-grey-100">Create Your Project</h3>
                <p className="text-sm text-toucan-grey-400 mt-1">
                  Let's set up your project with some basic information
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-toucan-grey-300 mb-1">
                    Project Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.name}
                    onChange={(e) => setData({ ...data, name: e.target.value })}
                    className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-4 py-2 text-toucan-grey-100 focus:border-toucan-orange focus:outline-none"
                    placeholder="e.g., Healthcare Portal Integration"
                  />
                </div>

                <div>
                  <label className="block text-sm text-toucan-grey-300 mb-1">
                    Brief Description
                  </label>
                  <textarea
                    value={data.description}
                    onChange={(e) => setData({ ...data, description: e.target.value })}
                    className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-4 py-2 h-24 text-toucan-grey-100 focus:border-toucan-orange focus:outline-none resize-none"
                    placeholder="What is this project about?"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step: Brief */}
          {step === 'brief' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-toucan-grey-100">Project Brief</h3>
                <p className="text-sm text-toucan-grey-400 mt-1">
                  Add context about your project to help AI generate better work items
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setData({ ...data, brief: BRIEF_TEMPLATES.api })}
                  className="px-3 py-1 text-sm border border-toucan-dark-border rounded hover:border-toucan-orange hover:text-toucan-orange"
                >
                  API Template
                </button>
                <button
                  onClick={() => setData({ ...data, brief: BRIEF_TEMPLATES.product })}
                  className="px-3 py-1 text-sm border border-toucan-dark-border rounded hover:border-toucan-orange hover:text-toucan-orange"
                >
                  Product Template
                </button>
                <button
                  onClick={() => setData({ ...data, brief: BRIEF_TEMPLATES.migration })}
                  className="px-3 py-1 text-sm border border-toucan-dark-border rounded hover:border-toucan-orange hover:text-toucan-orange"
                >
                  Migration Template
                </button>
              </div>

              <textarea
                value={data.brief}
                onChange={(e) => setData({ ...data, brief: e.target.value })}
                className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-4 py-3 h-64 text-toucan-grey-100 focus:border-toucan-orange focus:outline-none resize-none font-mono text-sm"
                placeholder="Describe your project, key systems, constraints, and context..."
              />

              <p className="text-xs text-toucan-grey-500">
                Tip: A good brief is 100-300 words and covers what the project does, key integrations, and important constraints.
              </p>
            </div>
          )}

          {/* Step: Glossary */}
          {step === 'glossary' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-toucan-grey-100">Quick Glossary</h3>
                <p className="text-sm text-toucan-grey-400 mt-1">
                  Add key terms to ensure consistent terminology in generated stories
                </p>
              </div>

              {/* Add term form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTerm.term}
                  onChange={(e) => setNewTerm({ ...newTerm, term: e.target.value })}
                  className="flex-1 bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-sm text-toucan-grey-100 focus:border-toucan-orange focus:outline-none"
                  placeholder="Term"
                />
                <input
                  type="text"
                  value={newTerm.definition}
                  onChange={(e) => setNewTerm({ ...newTerm, definition: e.target.value })}
                  className="flex-2 bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-sm text-toucan-grey-100 focus:border-toucan-orange focus:outline-none"
                  placeholder="Definition"
                  style={{ flex: 2 }}
                />
                <button
                  onClick={handleAddTerm}
                  disabled={!newTerm.term || !newTerm.definition}
                  className="px-3 py-2 bg-toucan-orange text-white rounded-md disabled:opacity-50 hover:bg-toucan-orange-light"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Terms list */}
              {data.glossaryTerms.length > 0 && (
                <div className="space-y-2">
                  {data.glossaryTerms.map((term, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-2 bg-toucan-dark rounded border border-toucan-dark-border"
                    >
                      <span className="font-medium text-toucan-grey-200">{term.term}</span>
                      <span className="text-toucan-grey-500">—</span>
                      <span className="flex-1 text-sm text-toucan-grey-400">{term.definition}</span>
                      <button
                        onClick={() => handleRemoveTerm(index)}
                        className="p-1 text-toucan-grey-500 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {data.glossaryTerms.length === 0 && (
                <div className="text-center py-8 text-toucan-grey-500">
                  No terms added yet. Add 5-10 key terms from your domain.
                </div>
              )}
            </div>
          )}

          {/* Step: Preferences */}
          {step === 'preferences' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-toucan-grey-100">Team Preferences</h3>
                <p className="text-sm text-toucan-grey-400 mt-1">
                  Configure how you want your stories formatted
                </p>
              </div>

              <div>
                <label className="block text-sm text-toucan-grey-300 mb-2">
                  Acceptance Criteria Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'bullets', label: 'Bullet Points', desc: '• Simple bullet list' },
                    { value: 'gherkin', label: 'Gherkin', desc: 'Given/When/Then format' },
                    { value: 'checklist', label: 'Checklist', desc: '☐ Checkable items' },
                    { value: 'numbered', label: 'Numbered', desc: '1. Numbered list' },
                  ].map((format) => (
                    <button
                      key={format.value}
                      onClick={() => setData({ ...data, acFormat: format.value as WizardData['acFormat'] })}
                      className={`p-3 text-left border rounded-md transition-colors ${
                        data.acFormat === format.value
                          ? 'border-toucan-orange bg-toucan-orange/10'
                          : 'border-toucan-dark-border hover:border-toucan-grey-600'
                      }`}
                    >
                      <div className="font-medium text-toucan-grey-200">{format.label}</div>
                      <div className="text-xs text-toucan-grey-500">{format.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-toucan-grey-300 mb-2">
                  Required Sections (select any that apply)
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SECTIONS.map((section) => (
                    <button
                      key={section}
                      onClick={() => toggleSection(section)}
                      className={`px-3 py-1 text-sm border rounded-md transition-colors ${
                        data.requiredSections.includes(section)
                          ? 'border-toucan-orange bg-toucan-orange/10 text-toucan-orange'
                          : 'border-toucan-dark-border hover:border-toucan-grey-600 text-toucan-grey-400'
                      }`}
                    >
                      {data.requiredSections.includes(section) && (
                        <Check className="inline h-3 w-3 mr-1" />
                      )}
                      {section}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="text-center py-8 space-y-6">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-toucan-grey-100">Project Created!</h3>
                <p className="text-sm text-toucan-grey-400 mt-1">
                  Your project is ready. You can always update these settings later.
                </p>
              </div>
              <button
                onClick={() => onComplete(projectId!)}
                className="px-6 py-2 bg-toucan-orange text-white rounded-md hover:bg-toucan-orange-light"
              >
                Go to Project
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'done' && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-toucan-dark-border">
            <div>
              {step !== 'basics' && (
                <button
                  onClick={goBack}
                  className="flex items-center gap-1 text-sm text-toucan-grey-400 hover:text-toucan-grey-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {step !== 'basics' && (
                <button
                  onClick={goNext}
                  className="text-sm text-toucan-grey-500 hover:text-toucan-grey-300"
                >
                  Skip this step
                </button>
              )}
              <button
                onClick={() => {
                  if (step === 'basics') handleBasicsComplete();
                  else if (step === 'brief') handleBriefComplete();
                  else if (step === 'glossary') handleGlossaryComplete();
                  else if (step === 'preferences') handlePreferencesComplete();
                }}
                disabled={!canGoNext() || isLoading}
                className="flex items-center gap-1 px-4 py-2 bg-toucan-orange text-white rounded-md disabled:opacity-50 hover:bg-toucan-orange-light"
              >
                {isLoading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <span>{step === 'preferences' ? 'Finish' : 'Continue'}</span>
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
