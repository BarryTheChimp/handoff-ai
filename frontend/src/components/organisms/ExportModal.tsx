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
} from 'lucide-react';
import { jiraApi, JiraProject, ExportProgress, ExportPreview } from '../../services/api';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  specId: string;
  specName: string;
}

type ExportStep = 'select-project' | 'preview' | 'exporting' | 'complete';

export function ExportModal({ isOpen, onClose, specId, specName }: ExportModalProps) {
  const [step, setStep] = useState<ExportStep>('select-project');
  const [projects, setProjects] = useState<JiraProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [preview, setPreview] = useState<ExportPreview | null>(null);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exportId, setExportId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDryRun, setIsDryRun] = useState(false);

  // Load projects on mount
  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('select-project');
      setSelectedProject('');
      setPreview(null);
      setProgress(null);
      setExportId(null);
      setError(null);
      setIsDryRun(false);
    }
  }, [isOpen]);

  // Poll for progress when exporting
  useEffect(() => {
    if (step !== 'exporting' || !exportId) return;

    const pollInterval = setInterval(async () => {
      try {
        const progressData = await jiraApi.getExportProgress(exportId);
        setProgress(progressData);

        if (progressData.status === 'completed' || progressData.status === 'failed' || progressData.status === 'cancelled') {
          setStep('complete');
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Failed to poll progress:', err);
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [step, exportId]);

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

  const loadPreview = async () => {
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

  const startExport = async () => {
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

  const cancelExport = async () => {
    if (!exportId) return;

    try {
      await jiraApi.cancelExport(exportId);
    } catch (err) {
      console.error('Failed to cancel export:', err);
    }
  };

  const renderProjectSelection = () => (
    <div className="space-y-4">
      <p className="text-sm text-toucan-grey-300">
        Select a Jira project to export <strong>{specName}</strong> work items to.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-toucan-grey-400 mb-4">No projects available</p>
          <Button variant="secondary" size="sm" onClick={loadProjects} leftIcon={<RefreshCw size={14} />}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-toucan-grey-200">
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
      )}

      {/* Dry run toggle */}
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
    </div>
  );

  const renderPreview = () => (
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
          {/* Progress bar */}
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

      {/* Results summary */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-toucan-dark rounded-md">
          <p className="text-2xl font-bold text-toucan-success">
            {progress?.results.filter((r) => r.status === 'success').length || 0}
          </p>
          <p className="text-xs text-toucan-grey-400">Exported</p>
        </div>
        <div className="p-3 bg-toucan-dark rounded-md">
          <p className="text-2xl font-bold text-toucan-grey-400">
            {progress?.results.filter((r) => r.status === 'skipped').length || 0}
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

      {/* Results list */}
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
      case 'select-project':
        return (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={loadPreview}
              disabled={!selectedProject || isLoading}
              loading={isLoading}
            >
              Preview
            </Button>
          </>
        );
      case 'preview':
        return (
          <>
            <Button variant="secondary" onClick={() => setStep('select-project')}>
              Back
            </Button>
            <Button
              variant="primary"
              onClick={startExport}
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
          <Button variant="secondary" onClick={cancelExport}>
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={step === 'exporting' ? () => {} : onClose}
      title={
        step === 'complete'
          ? 'Export Results'
          : isDryRun
          ? 'Dry Run Export'
          : 'Export to Jira'
      }
      size="lg"
      footer={getFooter()}
    >
      {error && (
        <div className="mb-4 p-3 bg-toucan-error/10 border border-toucan-error/30 rounded-md">
          <p className="text-sm text-toucan-error">{error}</p>
        </div>
      )}

      {step === 'select-project' && renderProjectSelection()}
      {step === 'preview' && renderPreview()}
      {step === 'exporting' && renderExporting()}
      {step === 'complete' && renderComplete()}
    </Modal>
  );
}
