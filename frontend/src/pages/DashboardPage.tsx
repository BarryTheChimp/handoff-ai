import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { FileUp, RefreshCw, Files } from 'lucide-react';
import { Button } from '../components/atoms/Button';
import { Spinner } from '../components/atoms/Spinner';
import { Header } from '../components/organisms/Header';
import { Navigation } from '../components/organisms/Navigation';
import { SpecCard } from '../components/organisms/SpecCard';
import { EmptyState } from '../components/organisms/EmptyState';
import { DeleteConfirmModal } from '../components/organisms/DeleteConfirmModal';
import { ExportModal } from '../components/organisms/ExportModal';
import { QuestionnaireModal, QuestionnaireAnswers } from '../components/organisms/QuestionnaireModal';
import { BatchUploadModal } from '../components/organisms/BatchUploadModal';
import { SpecFilters } from '../components/molecules/SpecFilters';
import { specsApi, ApiError } from '../services/api';
import { useProject } from '../hooks/useProject';
import type { Spec } from '../types/workItem';

// Poll interval for status updates (5 seconds)
const POLL_INTERVAL = 5000;

interface SpecWithStats extends Spec {
  stats?: {
    epics: number;
    features: number;
    stories: number;
  };
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { selectedProjectId, isLoading: isProjectLoading } = useProject();
  const [specs, setSpecs] = useState<SpecWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect to projects page if no project selected
  if (!isProjectLoading && !selectedProjectId) {
    return <Navigate to="/projects" replace />;
  }

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Spec['status'] | 'all'>('all');

  // Delete modal
  const [specToDelete, setSpecToDelete] = useState<Spec | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Export modal
  const [specToExport, setSpecToExport] = useState<Spec | null>(null);

  // Upload modal (file input ref)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Questionnaire modal
  const [uploadedSpec, setUploadedSpec] = useState<Spec | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Batch upload modal
  const [showBatchUpload, setShowBatchUpload] = useState(false);

  // Polling ref
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Load specs
  const loadSpecs = useCallback(async () => {
    if (!selectedProjectId) return;

    try {
      const data = await specsApi.list(selectedProjectId);

      // Load stats for translated specs
      const specsWithStats = await Promise.all(
        data.map(async (spec) => {
          if (spec.status === 'translated') {
            try {
              const workItems = await specsApi.getWorkItems(spec.id);
              return {
                ...spec,
                stats: {
                  epics: workItems.flat.filter(wi => wi.type === 'epic').length,
                  features: workItems.flat.filter(wi => wi.type === 'feature').length,
                  stories: workItems.flat.filter(wi => wi.type === 'story').length,
                },
              };
            } catch {
              return spec;
            }
          }
          return spec;
        })
      );

      setSpecs(specsWithStats);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load specifications');
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId]);

  // Initial load
  useEffect(() => {
    loadSpecs();
  }, [loadSpecs]);

  // Poll for status updates when there are processing specs
  useEffect(() => {
    const hasProcessing = specs.some(
      s => s.status === 'extracting' || s.status === 'translating'
    );

    if (hasProcessing) {
      pollRef.current = setInterval(() => {
        loadSpecs();
      }, POLL_INTERVAL);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [specs, loadSpecs]);

  // Filter specs
  const filteredSpecs = specs.filter(spec => {
    const matchesSearch = spec.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || spec.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle delete
  const handleDelete = async () => {
    if (!specToDelete) return;

    setIsDeleting(true);
    try {
      await specsApi.delete(specToDelete.id);
      setSpecs(prev => prev.filter(s => s.id !== specToDelete.id));
      setSpecToDelete(null);
    } catch (err) {
      console.error('Failed to delete spec:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle upload
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProjectId) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', selectedProjectId);

      const API_BASE = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${API_BASE}/specs`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const { data: newSpec } = await response.json() as { data: Spec };

      // Show questionnaire for the new spec
      setUploadedSpec(newSpec);

      // Also reload specs to show the new one
      await loadSpecs();
    } catch (err) {
      console.error('Failed to upload spec:', err);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
  };

  // Process spec after questionnaire (extract + translate)
  const processSpec = async (specId: string, answers: QuestionnaireAnswers) => {
    setIsProcessing(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || '/api';
      // Update spec metadata with questionnaire answers
      await fetch(`${API_BASE}/specs/${specId}/metadata`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ metadata: answers }),
      });

      // Trigger extraction
      await specsApi.extract(specId);

      // Wait for extraction to complete (poll)
      let spec = await specsApi.get(specId);
      while (spec.status === 'extracting') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        spec = await specsApi.get(specId);
      }

      // If extraction succeeded, trigger translation
      if (spec.status === 'ready') {
        await specsApi.translate(specId);
      }

      // Reload specs and navigate to review
      await loadSpecs();
      navigate(`/review/${specId}`);
    } catch (err) {
      console.error('Failed to process spec:', err);
    } finally {
      setIsProcessing(false);
      setUploadedSpec(null);
    }
  };

  // Handle questionnaire submit
  const handleQuestionnaireSubmit = (answers: QuestionnaireAnswers) => {
    if (uploadedSpec) {
      processSpec(uploadedSpec.id, answers);
    }
  };

  // Handle questionnaire skip (use defaults)
  const handleQuestionnaireSkip = () => {
    if (uploadedSpec) {
      processSpec(uploadedSpec.id, {
        documentType: 'api-spec',
        structure: 'epic-feature-story',
        storySize: 'medium',
        acFormat: 'given-when-then',
        technicalNotes: {
          apiSchemas: true,
          dbChanges: true,
          dependencies: true,
        },
      });
    }
  };

  return (
    <div className="min-h-screen bg-toucan-dark">
      <Header />
      <Navigation />

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action bar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-toucan-grey-100">Specifications</h2>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadSpecs()}
              leftIcon={<RefreshCw size={16} />}
            >
              Refresh
            </Button>
            <Button
              data-testid="batch-upload-button"
              variant="secondary"
              onClick={() => setShowBatchUpload(true)}
              leftIcon={<Files size={16} />}
            >
              Batch Upload
            </Button>
            <Button
              variant="primary"
              onClick={handleUploadClick}
              loading={isUploading}
              leftIcon={<FileUp size={16} />}
            >
              Upload Spec
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.yaml,.yml,.json,.md,.markdown,.docx"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Filters */}
        {specs.length > 0 && (
          <div className="mb-6">
            <SpecFilters
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
            />
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && (
          <EmptyState
            type="error"
            errorMessage={error}
            onRetry={loadSpecs}
          />
        )}

        {/* Empty state - no specs */}
        {!isLoading && !error && specs.length === 0 && (
          <EmptyState
            type="no-specs"
            onUpload={handleUploadClick}
          />
        )}

        {/* Empty state - no results */}
        {!isLoading && !error && specs.length > 0 && filteredSpecs.length === 0 && (
          <EmptyState
            type="no-results"
            onClearFilters={clearFilters}
          />
        )}

        {/* Spec cards grid */}
        {!isLoading && !error && filteredSpecs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSpecs.map(spec => (
              <SpecCard
                key={spec.id}
                spec={spec}
                stats={spec.stats}
                onDelete={setSpecToDelete}
                onExport={setSpecToExport}
              />
            ))}
          </div>
        )}
      </main>

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        isOpen={!!specToDelete}
        onClose={() => setSpecToDelete(null)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
        itemName={specToDelete?.name || ''}
        itemType="specification"
      />

      {/* Export modal */}
      {specToExport && (
        <ExportModal
          isOpen={!!specToExport}
          onClose={() => setSpecToExport(null)}
          specId={specToExport.id}
          specName={specToExport.name}
        />
      )}

      {/* Questionnaire modal */}
      {uploadedSpec && (
        <QuestionnaireModal
          isOpen={!!uploadedSpec}
          onClose={() => setUploadedSpec(null)}
          onSubmit={handleQuestionnaireSubmit}
          onSkip={handleQuestionnaireSkip}
          specName={uploadedSpec.name}
        />
      )}

      {/* Processing overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-toucan-dark-lighter p-6 rounded-lg text-center">
            <Spinner size="lg" className="mx-auto mb-4" />
            <p className="text-toucan-grey-100 font-medium">Processing specification...</p>
            <p className="text-sm text-toucan-grey-400 mt-1">Extracting content and generating work items</p>
          </div>
        </div>
      )}

      {/* Batch upload modal */}
      {selectedProjectId && (
        <BatchUploadModal
          isOpen={showBatchUpload}
          onClose={() => setShowBatchUpload(false)}
          onUploadComplete={(groupId) => {
            setShowBatchUpload(false);
            navigate(`/spec-groups/${groupId}`);
          }}
          projectId={selectedProjectId}
        />
      )}
    </div>
  );
}
