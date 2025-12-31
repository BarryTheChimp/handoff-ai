import { useState, useEffect } from 'react';
import { Modal } from '../atoms/Modal';
import { Button } from '../atoms/Button';
import { Spinner } from '../atoms/Spinner';
import {
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Loader2,
  FileText,
  FileJson,
  FileSpreadsheet,
  Cloud,
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  jiraApi,
  localExportApi,
  JiraProject,
  ExportProgress,
  ExportPreview,
  LocalExportFormat,
  LocalExportFilters,
} from '../../services/api';
import { toast } from '../../stores/toastStore';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  specId: string;
  specName: string;
}

type ExportTarget = 'file' | 'jira';
type ExportStep = 'select-format' | 'configure' | 'preview' | 'exporting' | 'complete';

const FORMAT_ICONS = {
  csv: FileSpreadsheet,
  json: FileJson,
  markdown: FileText,
  jira: Cloud,
};

const FORMAT_INFO = {
  csv: {
    name: 'CSV',
    description: 'Spreadsheet-compatible format for Excel/Sheets',
    color: 'text-green-400',
  },
  json: {
    name: 'JSON',
    description: 'Structured data for integrations',
    color: 'text-blue-400',
  },
  markdown: {
    name: 'Markdown',
    description: 'Formatted documentation',
    color: 'text-purple-400',
  },
  jira: {
    name: 'Jira',
    description: 'Export directly to Jira project',
    color: 'text-toucan-info',
  },
};

export function ExportModal({ isOpen, onClose, specId, specName }: ExportModalProps) {
  const [step, setStep] = useState<ExportStep>('select-format');
  const [exportTarget, setExportTarget] = useState<ExportTarget>('file');
  const [selectedFormat, setSelectedFormat] = useState<LocalExportFormat>('json');

  // Jira state
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exportId, setExportId] = useState<string | null>(null);
  const [isDryRun, setIsDryRun] = useState(false);

  // Local export state
  const [filters, setFilters] = useState<LocalExportFilters>({});
  const [includeMetadata, setIncludeMetadata] = useState(false);
  const [flattenHierarchy, setFlattenHierarchy] = useState(false);

  // Common state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load projects on mount
  useEffect(() => {
    if (isOpen && exportTarget === 'jira') {
      loadProjects();
    }
  }, [isOpen, exportTarget]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('select-format');
      setExportTarget('file');
      setSelectedFormat('json');
      setSelectedProject('');
      setPreview(null);
      setProgress(null);
      setExportId(null);
      setError(null);
      setIsDryRun(false);
      setFilters({});
      setIncludeMetadata(false);
      setFlattenHierarchy(false);
    }
  }, [isOpen]);

  // Poll for Jira export progress
  useEffect(() => {
    if (step !== 'exporting' || !exportId) return;

    const pollInterval = setInterval(async () => {
      try {
        const progressData = await jiraApi.getExportProgress(exportId);
        setProgress(progressData);

        if (progressData.status === 'completed' || progressData.status === 'failed' || progressData.status === 'cancelled') {
          setStep('complete');
          clearInterval(pollInterval);

          if (progressData.status === 'completed') {
            const successCount = progressData.results?.filter(r => r.status === 'success').length || 0;
            toast.success(
              isDryRun ? 'Dry run completed' : 'Export completed',
              `${successCount} items exported to Jira`
            );
          } else if (progressData.status === 'failed') {
            toast.error('Export failed', progressData.errorMessage || 'An error occurred during export');
          } else if (progressData.status === 'cancelled') {
            toast.warning('Export cancelled', 'The export was cancelled');
          }
        }
      } catch (err) {
        console.error('Failed to poll progress:', err);
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [step, exportId, isDryRun]);

  const loadProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const projectList = await jiraApi.getProjects();
      setProjects(projectList);
      if (projectList.length > 0 && projectList[0]) {
        setSelectedProject(projectList[0].key);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const loadJiraPreview = async () => {
    if (!selectedProject) return;

    setIsLoading(true);
    setError(null);
    try {
      const previewData = await jiraApi.getExportPreview(specId, selectedProject);
      setPreview(previewData);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setIsLoading(false);
    }
  };

  const startJiraExport = async () => {
    if (!selectedProject) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await jiraApi.startExport(specId, selectedProject, isDryRun);
      setExportId(result.exportId);
      setStep('exporting');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start export');
    } finally {
      setIsLoading(false);
    }
  };

  const startLocalExport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await localExportApi.exportToFile(specId, {
        format: selectedFormat,
        filters,
        includeMetadata,
        flattenHierarchy,
      });

      localExportApi.downloadBlob(result.blob, result.filename);
      toast.success('Export complete', `Downloaded ${result.itemCount} items as ${selectedFormat.toUpperCase()}`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsLoading(false);
    }
  };

  const cancelJiraExport = async () => {
    if (!exportId) return;
    try {
      await jiraApi.cancelExport(exportId);
    } catch (err) {
      console.error('Failed to cancel export:', err);
    }
  };

  const toggleTypeFilter = (type: 'epic' | 'feature' | 'story') => {
    setFilters(prev => {
      const currentTypes = prev.types || [];
      const newTypes = currentTypes.includes(type)
        ? currentTypes.filter(t => t !== type)
        : [...currentTypes, type];
      return { ...prev, types: newTypes.length > 0 ? newTypes : undefined };
    });
  };

  const toggleStatusFilter = (status: 'draft' | 'ready_for_review' | 'approved' | 'exported') => {
    setFilters(prev => {
      const currentStatuses = prev.statuses || [];
      const newStatuses = currentStatuses.includes(status)
        ? currentStatuses.filter(s => s !== status)
        : [...currentStatuses, status];
      return { ...prev, statuses: newStatuses.length > 0 ? newStatuses : undefined };
    });
  };

  const renderFormatSelection = () => (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-toucan-grey-300 mb-4">
          Choose how you want to export <strong>{specName}</strong>
        </p>

        {/* Export Target Tabs */}
        <div className="flex gap-2 p-1 bg-toucan-dark rounded-lg mb-6">
          <button
            className={clsx(
              'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors',
              exportTarget === 'file'
                ? 'bg-toucan-orange text-white'
                : 'text-toucan-grey-400 hover:text-toucan-grey-200'
            )}
            onClick={() => setExportTarget('file')}
          >
            Download File
          </button>
          <button
            className={clsx(
              'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors',
              exportTarget === 'jira'
                ? 'bg-toucan-orange text-white'
                : 'text-toucan-grey-400 hover:text-toucan-grey-200'
            )}
            onClick={() => setExportTarget('jira')}
          >
            Export to Jira
          </button>
        </div>

        {exportTarget === 'file' ? (
          <div className="grid grid-cols-3 gap-3">
            {(['csv', 'json', 'markdown'] as LocalExportFormat[]).map(format => {
              const Icon = FORMAT_ICONS[format];
              const info = FORMAT_INFO[format];
              return (
                <button
                  key={format}
                  onClick={() => setSelectedFormat(format)}
                  className={clsx(
                    'p-4 rounded-lg border-2 transition-all text-left',
                    selectedFormat === format
                      ? 'border-toucan-orange bg-toucan-orange/10'
                      : 'border-toucan-dark-border hover:border-toucan-grey-600'
                  )}
                >
                  <Icon size={24} className={clsx('mb-2', info.color)} />
                  <p className="font-medium text-toucan-grey-100">{info.name}</p>
                  <p className="text-xs text-toucan-grey-400 mt-1">{info.description}</p>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-toucan-grey-400 mb-4">No Jira projects available</p>
                <Button variant="secondary" size="sm" onClick={loadProjects} leftIcon={<RefreshCw size={14} />}>
                  Retry
                </Button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-toucan-grey-200 mb-2">
                    Jira Project
                  </label>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-toucan-grey-100 focus:outline-none focus:ring-2 focus:ring-toucan-orange"
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.key}>
                        {project.key} - {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDryRun}
                    onChange={(e) => setIsDryRun(e.target.checked)}
                    className="w-4 h-4 rounded border-toucan-dark-border bg-toucan-dark text-toucan-orange focus:ring-toucan-orange"
                  />
                  <span className="text-sm text-toucan-grey-200">
                    Dry run (preview only, don't create issues)
                  </span>
                </label>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderLocalExportConfig = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-toucan-grey-300">
        {(() => {
          const Icon = FORMAT_ICONS[selectedFormat];
          return <Icon size={20} className={FORMAT_INFO[selectedFormat].color} />;
        })()}
        <span>Export as {FORMAT_INFO[selectedFormat].name}</span>
      </div>

      {/* Type Filters */}
      <div>
        <label className="block text-sm font-medium text-toucan-grey-200 mb-2">
          Include Types (leave empty for all)
        </label>
        <div className="flex gap-2">
          {(['epic', 'feature', 'story'] as const).map(type => (
            <button
              key={type}
              onClick={() => toggleTypeFilter(type)}
              className={clsx(
                'px-3 py-1.5 rounded-md text-sm capitalize border transition-colors',
                filters.types?.includes(type)
                  ? 'border-toucan-orange bg-toucan-orange/20 text-toucan-orange'
                  : 'border-toucan-dark-border text-toucan-grey-400 hover:border-toucan-grey-600'
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Status Filters */}
      <div>
        <label className="block text-sm font-medium text-toucan-grey-200 mb-2">
          Include Statuses (leave empty for all)
        </label>
        <div className="flex flex-wrap gap-2">
          {(['draft', 'ready_for_review', 'approved', 'exported'] as const).map(status => (
            <button
              key={status}
              onClick={() => toggleStatusFilter(status)}
              className={clsx(
                'px-3 py-1.5 rounded-md text-sm border transition-colors',
                filters.statuses?.includes(status)
                  ? 'border-toucan-orange bg-toucan-orange/20 text-toucan-orange'
                  : 'border-toucan-dark-border text-toucan-grey-400 hover:border-toucan-grey-600'
              )}
            >
              {status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeMetadata}
            onChange={(e) => setIncludeMetadata(e.target.checked)}
            className="w-4 h-4 rounded border-toucan-dark-border bg-toucan-dark text-toucan-orange focus:ring-toucan-orange"
          />
          <span className="text-sm text-toucan-grey-200">
            Include metadata (created/updated timestamps)
          </span>
        </label>

        {selectedFormat === 'json' && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={flattenHierarchy}
              onChange={(e) => setFlattenHierarchy(e.target.checked)}
              className="w-4 h-4 rounded border-toucan-dark-border bg-toucan-dark text-toucan-orange focus:ring-toucan-orange"
            />
            <span className="text-sm text-toucan-grey-200">
              Flatten hierarchy (array of items instead of tree)
            </span>
          </label>
        )}
      </div>
    </div>
  );

  const renderJiraPreview = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-toucan-grey-300">
          {preview?.totalNew} items will be created, {preview?.totalSkipped} already exported
        </p>
        {isDryRun && (
          <span className="px-2 py-1 text-xs bg-toucan-warning/20 text-toucan-warning rounded">
            Dry Run
          </span>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto border border-toucan-dark-border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-toucan-dark-lighter sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 text-toucan-grey-400">Item</th>
              <th className="text-left px-3 py-2 text-toucan-grey-400">Type</th>
              <th className="text-left px-3 py-2 text-toucan-grey-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {preview?.items.map((item) => (
              <tr key={item.workItemId} className="border-t border-toucan-dark-border">
                <td className="px-3 py-2 text-toucan-grey-100">{item.title}</td>
                <td className="px-3 py-2 text-toucan-grey-300">{item.jiraIssueType}</td>
                <td className="px-3 py-2">
                  {item.alreadyExported ? (
                    <span className="text-toucan-grey-500">Skip</span>
                  ) : (
                    <span className="text-toucan-success">New</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderExporting = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-toucan-orange" />
        <span className="text-toucan-grey-100">
          {isDryRun ? 'Running dry export...' : 'Exporting to Jira...'}
        </span>
      </div>

      {progress && (
        <>
          <div className="w-full bg-toucan-dark-border rounded-full h-2">
            <div
              className="bg-toucan-orange h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.processedItems / progress.totalItems) * 100}%` }}
            />
          </div>

          <p className="text-sm text-toucan-grey-400 text-center">
            {progress.processedItems} / {progress.totalItems} items
            {progress.failedItems > 0 && (
              <span className="text-toucan-error"> ({progress.failedItems} failed)</span>
            )}
          </p>
        </>
      )}
    </div>
  );

  const renderComplete = () => (
    <div className="space-y-4">
      {progress?.status === 'completed' ? (
        <div className="flex items-center gap-3 text-toucan-success">
          <CheckCircle size={24} />
          <span className="text-lg font-medium">
            {isDryRun ? 'Dry run completed!' : 'Export completed!'}
          </span>
        </div>
      ) : progress?.status === 'failed' ? (
        <div className="flex items-center gap-3 text-toucan-error">
          <XCircle size={24} />
          <span className="text-lg font-medium">Export failed</span>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-toucan-warning">
          <AlertTriangle size={24} />
          <span className="text-lg font-medium">Export cancelled</span>
        </div>
      )}

      {progress?.errorMessage && (
        <p className="text-sm text-toucan-error">{progress.errorMessage}</p>
      )}

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-toucan-dark rounded-md">
          <p className="text-2xl font-bold text-toucan-success">
            {progress?.results?.filter((r) => r.status === 'success').length || 0}
          </p>
          <p className="text-xs text-toucan-grey-400">Exported</p>
        </div>
        <div className="p-3 bg-toucan-dark rounded-md">
          <p className="text-2xl font-bold text-toucan-grey-400">
            {progress?.results?.filter((r) => r.status === 'skipped').length || 0}
          </p>
          <p className="text-xs text-toucan-grey-400">Skipped</p>
        </div>
        <div className="p-3 bg-toucan-dark rounded-md">
          <p className="text-2xl font-bold text-toucan-error">
            {progress?.failedItems || 0}
          </p>
          <p className="text-xs text-toucan-grey-400">Failed</p>
        </div>
      </div>

      {progress?.results && progress.results.length > 0 && (
        <div className="max-h-48 overflow-y-auto border border-toucan-dark-border rounded-md">
          <table className="w-full text-sm">
            <tbody>
              {progress.results.map((result) => (
                <tr key={result.workItemId} className="border-b border-toucan-dark-border last:border-0">
                  <td className="px-3 py-2">
                    {result.status === 'success' ? (
                      <CheckCircle size={14} className="text-toucan-success" />
                    ) : result.status === 'failed' ? (
                      <XCircle size={14} className="text-toucan-error" />
                    ) : (
                      <span className="w-3.5 h-3.5 inline-block" />
                    )}
                  </td>
                  <td className="px-3 py-2 text-toucan-grey-100">{result.workItemTitle}</td>
                  <td className="px-3 py-2">
                    {result.jiraKey ? (
                      <a
                        href={`https://your-site.atlassian.net/browse/${result.jiraKey}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-toucan-info hover:underline"
                      >
                        {result.jiraKey}
                        <ExternalLink size={12} />
                      </a>
                    ) : result.error ? (
                      <span className="text-toucan-error text-xs">{result.error}</span>
                    ) : (
                      <span className="text-toucan-grey-500">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const getFooter = () => {
    switch (step) {
      case 'select-format':
        if (exportTarget === 'file') {
          return (
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => setStep('configure')}
              >
                Configure
              </Button>
            </>
          );
        } else {
          return (
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={loadJiraPreview}
                disabled={!selectedProject || isLoading}
                loading={isLoading}
              >
                Preview
              </Button>
            </>
          );
        }

      case 'configure':
        return (
          <>
            <Button variant="secondary" onClick={() => setStep('select-format')}>
              Back
            </Button>
            <Button
              variant="primary"
              onClick={startLocalExport}
              disabled={isLoading}
              loading={isLoading}
              leftIcon={<Download size={16} />}
            >
              Export
            </Button>
          </>
        );

      case 'preview':
        return (
          <>
            <Button variant="secondary" onClick={() => setStep('select-format')}>
              Back
            </Button>
            <Button
              variant="primary"
              onClick={startJiraExport}
              disabled={isLoading}
              loading={isLoading}
              leftIcon={<Download size={16} />}
            >
              {isDryRun ? 'Run Dry Export' : 'Export to Jira'}
            </Button>
          </>
        );

      case 'exporting':
        return (
          <Button variant="secondary" onClick={cancelJiraExport}>
            Cancel Export
          </Button>
        );

      case 'complete':
        return (
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        );
    }
  };

  const getTitle = () => {
    if (step === 'complete') return 'Export Results';
    if (step === 'exporting') return isDryRun ? 'Dry Run in Progress' : 'Exporting...';
    if (step === 'preview') return isDryRun ? 'Dry Run Preview' : 'Export Preview';
    if (step === 'configure') return `Export as ${FORMAT_INFO[selectedFormat].name}`;
    return 'Export Work Items';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={step === 'exporting' ? () => {} : onClose}
      title={getTitle()}
      size="lg"
      footer={getFooter()}
    >
      {error && (
        <div className="mb-4 p-3 bg-toucan-error/10 border border-toucan-error/30 rounded-md">
          <p className="text-sm text-toucan-error">{error}</p>
        </div>
      )}

      {step === 'select-format' && renderFormatSelection()}
      {step === 'configure' && renderLocalExportConfig()}
      {step === 'preview' && renderJiraPreview()}
      {step === 'exporting' && renderExporting()}
      {step === 'complete' && renderComplete()}
    </Modal>
  );
}
