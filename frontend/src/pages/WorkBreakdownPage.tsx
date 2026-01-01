import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/organisms/Header';
import { Navigation } from '../components/organisms/Navigation';
import { WorkBreakdownTreemap } from '../components/organisms/WorkBreakdownTreemap';
import { ArrowLeft } from 'lucide-react';

export function WorkBreakdownPage() {
  const { projectId, specId } = useParams<{ projectId?: string; specId?: string }>();
  const navigate = useNavigate();

  const handleNodeClick = (node: { id: string; name: string }) => {
    // Navigate to work item detail if needed
    console.log('Node clicked:', node);
  };

  return (
    <div className="min-h-screen bg-toucan-dark">
      <Header />
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-toucan-grey-400 hover:text-toucan-grey-200 rounded-md hover:bg-toucan-dark-lighter"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-toucan-grey-100">Work Breakdown</h1>
            <p className="text-sm text-toucan-grey-400 mt-1">
              Visual hierarchy of epics, features, and stories
            </p>
          </div>
        </div>

        {/* Treemap */}
        {(projectId || specId) && (
          <WorkBreakdownTreemap
            projectId={projectId}
            specId={specId}
            onNodeClick={handleNodeClick}
          />
        )}
      </main>
    </div>
  );
}
