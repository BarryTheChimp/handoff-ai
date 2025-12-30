import { Navigate } from 'react-router-dom';
import { Header } from '../organisms/Header';
import { Navigation } from '../organisms/Navigation';
import { Breadcrumbs, type BreadcrumbItem } from '../molecules/Breadcrumbs';
import { useProject } from '../../hooks/useProject';
import { Spinner } from '../atoms/Spinner';

interface PageLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  requiresProject?: boolean;
  isLoading?: boolean;
}

export function PageLayout({
  children,
  breadcrumbs,
  title,
  subtitle,
  actions,
  requiresProject = true,
  isLoading = false,
}: PageLayoutProps) {
  const { selectedProjectId, isLoading: isProjectLoading } = useProject();

  // Wait for project loading to complete
  if (isProjectLoading) {
    return (
      <div className="min-h-screen bg-toucan-dark flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Redirect to projects page if project required but not selected
  if (requiresProject && !selectedProjectId) {
    return <Navigate to="/projects" replace />;
  }

  return (
    <div className="min-h-screen bg-toucan-dark flex flex-col">
      <Header />
      <Navigation />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumbs items={breadcrumbs} />
          )}

          {/* Page Header */}
          {(title || actions) && (
            <div className="flex items-start justify-between py-4">
              <div>
                {title && (
                  <h1 className="text-2xl font-bold text-toucan-grey-100">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-toucan-grey-400 mt-1">
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && (
                <div className="flex items-center gap-3">
                  {actions}
                </div>
              )}
            </div>
          )}

          {/* Page Content */}
          <div className="pb-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner size="lg" />
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
