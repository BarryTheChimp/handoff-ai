import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import {
  FileText,
  Book,
  Settings2,
  Plus,
  Save,
  Trash2,
  Edit2,
  Check,
  Loader2,
  AlertCircle,
  FileUp,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../components/atoms/Button';
import { Header } from '../components/organisms/Header';
import { Navigation } from '../components/organisms/Navigation';
import { useProject } from '../hooks/useProject';
import {
  knowledgeApi,
  contextSourcesApi,
  type GlossaryTerm,
  type CreateGlossaryTermInput,
  type ReferenceDocument,
  type TeamPreferencesConfig,
  type ContextSource,
} from '../services/api';

type TabId = 'brief' | 'glossary' | 'documents' | 'sources' | 'preferences';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'brief', label: 'Project Brief', icon: <FileText size={18} /> },
  { id: 'glossary', label: 'Glossary', icon: <Book size={18} /> },
  { id: 'documents', label: 'Documents', icon: <FileUp size={18} /> },
  { id: 'sources', label: 'Context Sources', icon: <Settings2 size={18} /> },
  { id: 'preferences', label: 'Preferences', icon: <Settings2 size={18} /> },
];

export function KnowledgeBasePage() {
  const { selectedProjectId, isLoading: isProjectLoading } = useProject();
  const [activeTab, setActiveTab] = useState<TabId>('brief');

  if (isProjectLoading) {
    return (
      <div className="min-h-screen bg-toucan-dark flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-toucan-orange" />
      </div>
    );
  }

  if (!selectedProjectId) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <div className="min-h-screen bg-toucan-dark">
      <Header />
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-toucan-grey-100">Knowledge Base</h1>
          <p className="text-sm text-toucan-grey-400 mt-1">
            Configure project context, terminology, and preferences for AI-powered generation
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-toucan-dark-border mb-6">
          <nav className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'text-toucan-orange border-toucan-orange'
                    : 'text-toucan-grey-400 border-transparent hover:text-toucan-grey-200'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'brief' && <ProjectBriefTab projectId={selectedProjectId} />}
        {activeTab === 'glossary' && <GlossaryTab projectId={selectedProjectId} />}
        {activeTab === 'documents' && <DocumentsTab projectId={selectedProjectId} />}
        {activeTab === 'sources' && <ContextSourcesTab projectId={selectedProjectId} />}
        {activeTab === 'preferences' && <PreferencesTab projectId={selectedProjectId} />}
      </main>
    </div>
  );
}

// =============================================================================
// PROJECT BRIEF TAB
// =============================================================================

function ProjectBriefTab({ projectId }: { projectId: string }) {
  const [brief, setBrief] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadBrief();
  }, [projectId]);

  async function loadBrief() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await knowledgeApi.getBrief(projectId);
      setBrief(data.brief || '');
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load brief');
    } finally {
      setIsLoading(false);
    }
  }

  async function saveBrief() {
    setIsSaving(true);
    try {
      await knowledgeApi.updateBrief(projectId, brief);
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save brief');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={32} className="animate-spin text-toucan-orange" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-toucan-grey-100">Project Brief</h2>
          <p className="text-sm text-toucan-grey-400">
            Provide context about your project that the AI will use when generating stories
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={saveBrief}
          loading={isSaving}
          disabled={!hasChanges}
          leftIcon={<Save size={16} />}
        >
          Save Brief
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-toucan-error/10 border border-toucan-error/30 rounded-lg">
          <AlertCircle size={18} className="text-toucan-error" />
          <span className="text-sm text-toucan-error">{error}</span>
        </div>
      )}

      <textarea
        value={brief}
        onChange={(e) => {
          setBrief(e.target.value);
          setHasChanges(true);
        }}
        placeholder="Describe your project, its goals, architecture, and any important context the AI should know..."
        className="w-full h-96 bg-toucan-dark border border-toucan-dark-border rounded-lg p-4 text-toucan-grey-100 placeholder-toucan-grey-600 focus:outline-none focus:ring-2 focus:ring-toucan-orange focus:border-transparent resize-none"
      />

      <p className="text-xs text-toucan-grey-600">
        Markdown formatting is supported. Maximum 50,000 characters.
      </p>
    </div>
  );
}

// =============================================================================
// GLOSSARY TAB
// =============================================================================

function GlossaryTab({ projectId }: { projectId: string }) {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadTerms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await knowledgeApi.listGlossaryTerms(projectId);
      setTerms(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load glossary');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadTerms();
  }, [loadTerms]);

  async function handleAddTerm(input: CreateGlossaryTermInput) {
    try {
      await knowledgeApi.createGlossaryTerm(projectId, input);
      setShowAddForm(false);
      await loadTerms();
    } catch (err) {
      throw err;
    }
  }

  async function handleUpdateTerm(termId: string, input: Partial<CreateGlossaryTermInput>) {
    try {
      await knowledgeApi.updateGlossaryTerm(projectId, termId, input);
      setEditingId(null);
      await loadTerms();
    } catch (err) {
      throw err;
    }
  }

  async function handleDeleteTerm(termId: string) {
    if (!confirm('Delete this term?')) return;
    try {
      await knowledgeApi.deleteGlossaryTerm(projectId, termId);
      await loadTerms();
    } catch (err) {
      console.error('Failed to delete term:', err);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={32} className="animate-spin text-toucan-orange" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-toucan-grey-100">Glossary</h2>
          <p className="text-sm text-toucan-grey-400">
            Define domain-specific terminology to ensure consistent language
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowAddForm(true)}
          leftIcon={<Plus size={16} />}
        >
          Add Term
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-toucan-error/10 border border-toucan-error/30 rounded-lg">
          <AlertCircle size={18} className="text-toucan-error" />
          <span className="text-sm text-toucan-error">{error}</span>
        </div>
      )}

      {showAddForm && (
        <GlossaryTermForm
          onSave={handleAddTerm}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {terms.length === 0 && !showAddForm ? (
        <div className="text-center py-12">
          <Book size={48} className="text-toucan-grey-600 mx-auto mb-4" />
          <p className="text-toucan-grey-400 mb-4">No glossary terms defined yet</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAddForm(true)}
            leftIcon={<Plus size={16} />}
          >
            Add Your First Term
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {terms.map((term) =>
            editingId === term.id ? (
              <GlossaryTermForm
                key={term.id}
                initialValues={term}
                onSave={(input) => handleUpdateTerm(term.id, input)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div
                key={term.id}
                className="flex items-start justify-between gap-4 p-4 bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-toucan-grey-100">{term.term}</span>
                    {term.category && (
                      <span className="text-xs px-2 py-0.5 bg-toucan-dark rounded-full text-toucan-grey-400">
                        {term.category}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-toucan-grey-300 mt-1">{term.definition}</p>
                  {term.aliases.length > 0 && (
                    <p className="text-xs text-toucan-grey-600 mt-1">
                      Aliases: {term.aliases.join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingId(term.id)}
                    className="p-2 text-toucan-grey-400 hover:text-toucan-grey-200 hover:bg-toucan-dark rounded-md transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteTerm(term.id)}
                    className="p-2 text-toucan-grey-400 hover:text-toucan-error hover:bg-toucan-error/10 rounded-md transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

interface GlossaryTermFormProps {
  initialValues?: Partial<GlossaryTerm>;
  onSave: (input: CreateGlossaryTermInput) => Promise<void>;
  onCancel: () => void;
}

function GlossaryTermForm({ initialValues, onSave, onCancel }: GlossaryTermFormProps) {
  const [term, setTerm] = useState(initialValues?.term || '');
  const [definition, setDefinition] = useState(initialValues?.definition || '');
  const [category, setCategory] = useState(initialValues?.category || '');
  const [aliases, setAliases] = useState(initialValues?.aliases?.join(', ') || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!term.trim() || !definition.trim()) return;

    setIsSaving(true);
    setError(null);
    try {
      const input: CreateGlossaryTermInput = {
        term: term.trim(),
        definition: definition.trim(),
      };
      if (category.trim()) input.category = category.trim();
      if (aliases) input.aliases = aliases.split(',').map((a) => a.trim()).filter(Boolean);
      await onSave(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save term');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg space-y-3">
      {error && (
        <div className="text-sm text-toucan-error">{error}</div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Term"
          required
          className="bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-sm text-toucan-grey-100 placeholder-toucan-grey-600 focus:outline-none focus:ring-2 focus:ring-toucan-orange"
        />
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category (optional)"
          className="bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-sm text-toucan-grey-100 placeholder-toucan-grey-600 focus:outline-none focus:ring-2 focus:ring-toucan-orange"
        />
      </div>
      <textarea
        value={definition}
        onChange={(e) => setDefinition(e.target.value)}
        placeholder="Definition"
        required
        rows={2}
        className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-sm text-toucan-grey-100 placeholder-toucan-grey-600 focus:outline-none focus:ring-2 focus:ring-toucan-orange resize-none"
      />
      <input
        type="text"
        value={aliases}
        onChange={(e) => setAliases(e.target.value)}
        placeholder="Aliases (comma-separated, optional)"
        className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-sm text-toucan-grey-100 placeholder-toucan-grey-600 focus:outline-none focus:ring-2 focus:ring-toucan-orange"
      />
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" loading={isSaving} leftIcon={<Check size={16} />}>
          Save
        </Button>
      </div>
    </form>
  );
}

// =============================================================================
// DOCUMENTS TAB
// =============================================================================

function DocumentsTab({ projectId }: { projectId: string }) {
  const [documents, setDocuments] = useState<ReferenceDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await knowledgeApi.listReferenceDocuments(projectId);
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      await knowledgeApi.uploadReferenceDocument(projectId, file);
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  }

  async function handleToggleActive(doc: ReferenceDocument) {
    try {
      await knowledgeApi.updateReferenceDocument(projectId, doc.id, { isActive: !doc.isActive });
      await loadDocuments();
    } catch (err) {
      console.error('Failed to toggle document:', err);
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm('Delete this document?')) return;
    try {
      await knowledgeApi.deleteReferenceDocument(projectId, docId);
      await loadDocuments();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={32} className="animate-spin text-toucan-orange" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-toucan-grey-100">Reference Documents</h2>
          <p className="text-sm text-toucan-grey-400">
            Upload architecture docs, process guides, or other context documents
          </p>
        </div>
        <div>
          <input
            id="doc-upload"
            type="file"
            accept=".pdf,.md,.markdown,.txt,.docx"
            onChange={handleUpload}
            className="hidden"
          />
          <label htmlFor="doc-upload">
            <span className={clsx(
              'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer transition-colors',
              isUploading
                ? 'bg-toucan-orange/50 text-white cursor-not-allowed'
                : 'bg-toucan-orange text-white hover:bg-toucan-orange-light'
            )}>
              {isUploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FileUp size={16} />
              )}
              Upload Document
            </span>
          </label>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-toucan-error/10 border border-toucan-error/30 rounded-lg">
          <AlertCircle size={18} className="text-toucan-error" />
          <span className="text-sm text-toucan-error">{error}</span>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="text-center py-12">
          <FileUp size={48} className="text-toucan-grey-600 mx-auto mb-4" />
          <p className="text-toucan-grey-400 mb-4">No reference documents uploaded</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className={clsx(
                'flex items-center justify-between gap-4 p-4 rounded-lg border transition-colors',
                doc.isActive
                  ? 'bg-toucan-dark-lighter border-toucan-dark-border'
                  : 'bg-toucan-dark border-toucan-dark-border opacity-60'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-toucan-grey-100 truncate">{doc.name}</span>
                  <span className="text-xs px-2 py-0.5 bg-toucan-dark rounded-full text-toucan-grey-400">
                    {doc.docType}
                  </span>
                </div>
                <p className="text-xs text-toucan-grey-600 mt-1">
                  {doc.fileName} - {formatFileSize(doc.fileSize)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggleActive(doc)}
                  className={clsx(
                    'p-2 rounded-md transition-colors',
                    doc.isActive
                      ? 'text-toucan-success hover:bg-toucan-success/10'
                      : 'text-toucan-grey-400 hover:bg-toucan-dark-lighter'
                  )}
                  title={doc.isActive ? 'Disable document' : 'Enable document'}
                >
                  {doc.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-2 text-toucan-grey-400 hover:text-toucan-error hover:bg-toucan-error/10 rounded-md transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PREFERENCES TAB
// =============================================================================

function PreferencesTab({ projectId }: { projectId: string }) {
  const [config, setConfig] = useState<TeamPreferencesConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadConfig();
  }, [projectId]);

  async function loadConfig() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await knowledgeApi.getPreferencesConfig(projectId);
      setConfig(data);
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  }

  async function saveConfig() {
    if (!config) return;
    setIsSaving(true);
    try {
      await knowledgeApi.updatePreferencesConfig(projectId, config);
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  }

  function updateConfig<K extends keyof TeamPreferencesConfig>(key: K, value: TeamPreferencesConfig[K]) {
    if (!config) return;
    setConfig({ ...config, [key]: value });
    setHasChanges(true);
  }

  if (isLoading || !config) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={32} className="animate-spin text-toucan-orange" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-toucan-grey-100">Team Preferences</h2>
          <p className="text-sm text-toucan-grey-400">
            Configure how AI generates stories for your team
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={saveConfig}
          loading={isSaving}
          disabled={!hasChanges}
          leftIcon={<Save size={16} />}
        >
          Save Preferences
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-toucan-error/10 border border-toucan-error/30 rounded-lg">
          <AlertCircle size={18} className="text-toucan-error" />
          <span className="text-sm text-toucan-error">{error}</span>
        </div>
      )}

      <div className="grid gap-6">
        {/* AC Format */}
        <div className="p-4 bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg">
          <label className="block text-sm font-medium text-toucan-grey-100 mb-2">
            Acceptance Criteria Format
          </label>
          <select
            value={config.acFormat}
            onChange={(e) => updateConfig('acFormat', e.target.value as TeamPreferencesConfig['acFormat'])}
            className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-sm text-toucan-grey-100 focus:outline-none focus:ring-2 focus:ring-toucan-orange"
          >
            <option value="gherkin">Gherkin (Given/When/Then)</option>
            <option value="bullets">Bullet Points</option>
            <option value="checklist">Checklist</option>
            <option value="numbered">Numbered List</option>
          </select>
        </div>

        {/* Verbosity */}
        <div className="p-4 bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg">
          <label className="block text-sm font-medium text-toucan-grey-100 mb-2">
            Verbosity Level
          </label>
          <div className="flex gap-2">
            {(['concise', 'balanced', 'detailed'] as const).map((level) => (
              <button
                key={level}
                onClick={() => updateConfig('verbosity', level)}
                className={clsx(
                  'flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  config.verbosity === level
                    ? 'bg-toucan-orange text-white'
                    : 'bg-toucan-dark text-toucan-grey-300 hover:bg-toucan-dark-border'
                )}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Technical Depth */}
        <div className="p-4 bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg">
          <label className="block text-sm font-medium text-toucan-grey-100 mb-2">
            Technical Depth
          </label>
          <div className="flex gap-2">
            {(['high_level', 'moderate', 'implementation'] as const).map((level) => (
              <button
                key={level}
                onClick={() => updateConfig('technicalDepth', level)}
                className={clsx(
                  'flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  config.technicalDepth === level
                    ? 'bg-toucan-orange text-white'
                    : 'bg-toucan-dark text-toucan-grey-300 hover:bg-toucan-dark-border'
                )}
              >
                {level.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        {/* Max AC Count */}
        <div className="p-4 bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg">
          <label className="block text-sm font-medium text-toucan-grey-100 mb-2">
            Maximum Acceptance Criteria per Story
          </label>
          <input
            type="number"
            value={config.maxAcCount}
            onChange={(e) => updateConfig('maxAcCount', Math.max(1, Math.min(20, parseInt(e.target.value) || 8)))}
            min={1}
            max={20}
            className="w-24 bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-sm text-toucan-grey-100 focus:outline-none focus:ring-2 focus:ring-toucan-orange"
          />
          <p className="text-xs text-toucan-grey-600 mt-1">1-20 criteria per story</p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CONTEXT SOURCES TAB
// =============================================================================

function ContextSourcesTab({ projectId }: { projectId: string }) {
  const [sources, setSources] = useState<ContextSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const loadSources = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await contextSourcesApi.list(projectId);
      setSources(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load context sources');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  async function handleToggle(source: ContextSource) {
    try {
      await contextSourcesApi.toggle(projectId, source.id, !source.isEnabled);
      await loadSources();
    } catch (err) {
      console.error('Failed to toggle source:', err);
    }
  }

  async function handleSync(source: ContextSource) {
    setSyncingIds(prev => new Set(prev).add(source.id));
    try {
      await contextSourcesApi.sync(projectId, source.id);
      await loadSources();
    } catch (err) {
      console.error('Failed to sync source:', err);
    } finally {
      setSyncingIds(prev => {
        const next = new Set(prev);
        next.delete(source.id);
        return next;
      });
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={32} className="animate-spin text-toucan-orange" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium text-toucan-grey-100">Context Sources</h2>
        <p className="text-sm text-toucan-grey-400">
          Connect additional sources of context for smarter AI translations
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-toucan-error/10 border border-toucan-error/30 rounded-lg">
          <AlertCircle size={18} className="text-toucan-error" />
          <span className="text-sm text-toucan-error">{error}</span>
        </div>
      )}

      <div className="space-y-3">
        {sources.map((source) => (
          <div
            key={source.id}
            className={clsx(
              'flex items-center justify-between gap-4 p-4 rounded-lg border transition-colors',
              source.isEnabled
                ? 'bg-toucan-dark-lighter border-toucan-dark-border'
                : 'bg-toucan-dark border-toucan-dark-border opacity-60'
            )}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-toucan-dark flex items-center justify-center text-lg">
                {source.sourceType === 'specs' && '📋'}
                {source.sourceType === 'jira' && '🎫'}
                {source.sourceType === 'document' && '📄'}
                {source.sourceType === 'confluence' && '📝'}
                {source.sourceType === 'github' && '🔧'}
              </div>
              <div>
                <h3 className="font-medium text-toucan-grey-100">{source.name}</h3>
                <p className="text-xs text-toucan-grey-500">
                  {source.itemCount} items • Last sync: {formatDate(source.lastSyncAt)}
                </p>
                {source.lastError && (
                  <p className="text-xs text-toucan-error mt-1">{source.lastError}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {source.sourceType !== 'jira' && (
                <button
                  onClick={() => handleSync(source)}
                  disabled={syncingIds.has(source.id)}
                  className="text-sm text-toucan-orange hover:underline disabled:opacity-50"
                >
                  {syncingIds.has(source.id) ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    'Sync Now'
                  )}
                </button>
              )}
              <button
                onClick={() => handleToggle(source)}
                className={clsx(
                  'p-2 rounded-md transition-colors',
                  source.isEnabled
                    ? 'text-toucan-success hover:bg-toucan-success/10'
                    : 'text-toucan-grey-400 hover:bg-toucan-dark-lighter'
                )}
                title={source.isEnabled ? 'Disable source' : 'Enable source'}
              >
                {source.isEnabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {sources.length === 0 && (
        <div className="text-center py-12">
          <Settings2 size={48} className="text-toucan-grey-600 mx-auto mb-4" />
          <p className="text-toucan-grey-400">No context sources configured</p>
        </div>
      )}
    </div>
  );
}
