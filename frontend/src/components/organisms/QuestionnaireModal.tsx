import { useState } from 'react';
import { Modal } from '../atoms/Modal';
import { Button } from '../atoms/Button';
import { clsx } from 'clsx';
import {
  FileCode,
  FileText,
  Palette,
  File,
  Layers,
  ListTree,
  Scale,
  CheckSquare,
  List,
  ListChecks,
  Database,
  Link2,
} from 'lucide-react';

export interface QuestionnaireAnswers {
  documentType: 'api-spec' | 'requirements' | 'design' | 'other';
  structure: 'epic-feature-story' | 'epic-story';
  storySize: 'small' | 'medium' | 'large';
  acFormat: 'given-when-then' | 'bullets' | 'checklist';
  technicalNotes: {
    apiSchemas: boolean;
    dbChanges: boolean;
    dependencies: boolean;
  };
}

interface QuestionnaireModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (answers: QuestionnaireAnswers) => void;
  onSkip: () => void;
  specName: string;
}

const defaultAnswers: QuestionnaireAnswers = {
  documentType: 'api-spec',
  structure: 'epic-feature-story',
  storySize: 'medium',
  acFormat: 'given-when-then',
  technicalNotes: {
    apiSchemas: true,
    dbChanges: true,
    dependencies: true,
  },
};

interface OptionCardProps {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description?: string;
}

function OptionCard({ selected, onClick, icon, label, description }: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex flex-col items-center p-4 rounded-lg border-2 transition-all text-center',
        selected
          ? 'border-toucan-orange bg-toucan-orange/10'
          : 'border-toucan-dark-border hover:border-toucan-grey-600'
      )}
    >
      <div className={clsx('mb-2', selected ? 'text-toucan-orange' : 'text-toucan-grey-400')}>
        {icon}
      </div>
      <span className={clsx('text-sm font-medium', selected ? 'text-toucan-grey-100' : 'text-toucan-grey-300')}>
        {label}
      </span>
      {description && (
        <span className="text-xs text-toucan-grey-500 mt-1">{description}</span>
      )}
    </button>
  );
}

interface CheckboxOptionProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  icon: React.ReactNode;
  label: string;
}

function CheckboxOption({ checked, onChange, icon, label }: CheckboxOptionProps) {
  return (
    <label className="flex items-center gap-3 p-3 rounded-lg border border-toucan-dark-border hover:bg-toucan-dark cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-toucan-dark-border bg-toucan-dark text-toucan-orange focus:ring-toucan-orange"
      />
      <span className="text-toucan-grey-400">{icon}</span>
      <span className="text-sm text-toucan-grey-200">{label}</span>
    </label>
  );
}

export function QuestionnaireModal({
  isOpen,
  onClose,
  onSubmit,
  onSkip,
  specName,
}: QuestionnaireModalProps) {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(defaultAnswers);

  const handleSubmit = () => {
    onSubmit(answers);
  };

  const handleSkip = () => {
    onSkip();
  };

  const updateAnswer = <K extends keyof QuestionnaireAnswers>(
    key: K,
    value: QuestionnaireAnswers[K]
  ) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const updateTechNote = (key: keyof QuestionnaireAnswers['technicalNotes'], value: boolean) => {
    setAnswers((prev) => ({
      ...prev,
      technicalNotes: { ...prev.technicalNotes, [key]: value },
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Translation Preferences"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={handleSkip}>
            Skip (use defaults)
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Start Translation
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <p className="text-sm text-toucan-grey-400">
          Customize how <strong className="text-toucan-grey-200">{specName}</strong> will be translated into work items.
        </p>

        {/* Document Type */}
        <div>
          <h4 className="text-sm font-medium text-toucan-grey-200 mb-3">Document Type</h4>
          <div className="grid grid-cols-4 gap-3">
            <OptionCard
              selected={answers.documentType === 'api-spec'}
              onClick={() => updateAnswer('documentType', 'api-spec')}
              icon={<FileCode size={24} />}
              label="API Spec"
            />
            <OptionCard
              selected={answers.documentType === 'requirements'}
              onClick={() => updateAnswer('documentType', 'requirements')}
              icon={<FileText size={24} />}
              label="Requirements"
            />
            <OptionCard
              selected={answers.documentType === 'design'}
              onClick={() => updateAnswer('documentType', 'design')}
              icon={<Palette size={24} />}
              label="Design Doc"
            />
            <OptionCard
              selected={answers.documentType === 'other'}
              onClick={() => updateAnswer('documentType', 'other')}
              icon={<File size={24} />}
              label="Other"
            />
          </div>
        </div>

        {/* Structure */}
        <div>
          <h4 className="text-sm font-medium text-toucan-grey-200 mb-3">Work Item Structure</h4>
          <div className="grid grid-cols-2 gap-3">
            <OptionCard
              selected={answers.structure === 'epic-feature-story'}
              onClick={() => updateAnswer('structure', 'epic-feature-story')}
              icon={<Layers size={24} />}
              label="Epic → Feature → Story"
              description="Three-level hierarchy"
            />
            <OptionCard
              selected={answers.structure === 'epic-story'}
              onClick={() => updateAnswer('structure', 'epic-story')}
              icon={<ListTree size={24} />}
              label="Epic → Story"
              description="Two-level hierarchy"
            />
          </div>
        </div>

        {/* Story Size */}
        <div>
          <h4 className="text-sm font-medium text-toucan-grey-200 mb-3">Preferred Story Size</h4>
          <div className="grid grid-cols-3 gap-3">
            <OptionCard
              selected={answers.storySize === 'small'}
              onClick={() => updateAnswer('storySize', 'small')}
              icon={<Scale size={24} />}
              label="Small"
              description="More granular tasks"
            />
            <OptionCard
              selected={answers.storySize === 'medium'}
              onClick={() => updateAnswer('storySize', 'medium')}
              icon={<Scale size={24} />}
              label="Medium"
              description="Balanced"
            />
            <OptionCard
              selected={answers.storySize === 'large'}
              onClick={() => updateAnswer('storySize', 'large')}
              icon={<Scale size={24} />}
              label="Large"
              description="Fewer, bigger stories"
            />
          </div>
        </div>

        {/* AC Format */}
        <div>
          <h4 className="text-sm font-medium text-toucan-grey-200 mb-3">Acceptance Criteria Format</h4>
          <div className="grid grid-cols-3 gap-3">
            <OptionCard
              selected={answers.acFormat === 'given-when-then'}
              onClick={() => updateAnswer('acFormat', 'given-when-then')}
              icon={<CheckSquare size={24} />}
              label="Given/When/Then"
              description="BDD style"
            />
            <OptionCard
              selected={answers.acFormat === 'bullets'}
              onClick={() => updateAnswer('acFormat', 'bullets')}
              icon={<List size={24} />}
              label="Bullet Points"
              description="Simple list"
            />
            <OptionCard
              selected={answers.acFormat === 'checklist'}
              onClick={() => updateAnswer('acFormat', 'checklist')}
              icon={<ListChecks size={24} />}
              label="Checklist"
              description="Testable items"
            />
          </div>
        </div>

        {/* Technical Notes */}
        <div>
          <h4 className="text-sm font-medium text-toucan-grey-200 mb-3">Include Technical Notes</h4>
          <div className="space-y-2">
            <CheckboxOption
              checked={answers.technicalNotes.apiSchemas}
              onChange={(v) => updateTechNote('apiSchemas', v)}
              icon={<FileCode size={16} />}
              label="API schemas and endpoints"
            />
            <CheckboxOption
              checked={answers.technicalNotes.dbChanges}
              onChange={(v) => updateTechNote('dbChanges', v)}
              icon={<Database size={16} />}
              label="Database changes"
            />
            <CheckboxOption
              checked={answers.technicalNotes.dependencies}
              onChange={(v) => updateTechNote('dependencies', v)}
              icon={<Link2 size={16} />}
              label="Dependencies and integrations"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
