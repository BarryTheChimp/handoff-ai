import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReviewLayout } from '../components/templates/ReviewLayout';
import { ExportModal } from '../components/organisms/ExportModal';
import { LoadingOverlay } from '../components/atoms/Spinner';
import { useTreeStore } from '../stores/treeStore';
import { specsApi, ApiError } from '../services/api';
import type { Spec } from '../types/workItem';

export function ReviewPage() {
  const { specId } = useParams<{ specId: string }>();
  const navigate = useNavigate();

  const [spec, setSpec] = useState<Spec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  const setItems = useTreeStore((state) => state.setItems);

  // Fetch spec and work items on mount
  useEffect(() => {
    async function loadData() {
      if (!specId) {
        setError('No spec ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch spec and work items in parallel
        const [specData, workItemsData] = await Promise.all([
          specsApi.get(specId),
          specsApi.getWorkItems(specId).catch(() => ({ flat: [], hierarchical: [] })),
        ]);

        setSpec(specData);
        setItems(workItemsData.flat, workItemsData.hierarchical);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load spec');
        }
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [specId, setItems]);

  const handleBack = () => {
    navigate('/');
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  if (loading) {
    return <LoadingOverlay message="Loading spec..." />;
  }

  if (error || !spec) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-toucan-dark p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-toucan-grey-100 mb-2">
            {error || 'Spec not found'}
          </h1>
          <p className="text-toucan-grey-400 mb-6">
            {error ? 'An error occurred while loading the spec.' : 'The requested spec could not be found.'}
          </p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-toucan-orange text-white rounded-md hover:bg-toucan-orange-light"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ReviewLayout
        spec={spec}
        onBack={handleBack}
        onExport={handleExport}
      />

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        specId={spec.id}
        specName={spec.name}
      />
    </>
  );
}
