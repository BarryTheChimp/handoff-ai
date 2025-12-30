import { Link, useLocation } from 'react-router-dom';
import { UserDropdown } from '../molecules/UserDropdown';
import { ProjectSelector } from '../molecules/ProjectSelector';
import { useAuth } from '../../hooks/useAuth';
import { useProject } from '../../hooks/useProject';

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { selectedProjectId, selectProject } = useProject();
  const location = useLocation();

  // Don't show project selector on /projects page
  const showProjectSelector = location.pathname !== '/projects';

  return (
    <header className="bg-toucan-dark-lighter border-b border-toucan-dark-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo + Project Selector */}
          <div className="flex items-center gap-6">
            <Link to="/" className="text-xl font-bold flex items-center">
              <span className="text-toucan-orange">Handoff</span>
              <span className="text-toucan-grey-100 ml-1">AI</span>
            </Link>

            {isAuthenticated && showProjectSelector && (
              <ProjectSelector
                selectedProjectId={selectedProjectId}
                onSelect={selectProject}
              />
            )}

            {/* Navigation will be added in Feature 13 */}
          </div>

          {/* Right: User */}
          <div className="flex items-center gap-4">
            {isAuthenticated && user && (
              <UserDropdown user={user} onLogout={logout} />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
