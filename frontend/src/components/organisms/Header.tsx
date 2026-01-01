import { Link, useLocation } from 'react-router-dom';
import { UserDropdown } from '../molecules/UserDropdown';
import { ProjectSelector } from '../molecules/ProjectSelector';
import { useAuth } from '../../hooks/useAuth';
import { useProject } from '../../hooks/useProject';

// Inline SVG logo component for Toucan Labs
function ToucanLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Stylized "H" mark with toucan-inspired design */}
      <rect width="40" height="40" rx="8" fill="#FF6B35" />
      <path
        d="M12 10V30M12 20H20M28 10V30"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="28" cy="13" r="3" fill="white" />
    </svg>
  );
}

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
            <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              {/* Logo icon - always visible */}
              <ToucanLogo className="w-8 h-8" />
              {/* Text - hidden on mobile */}
              <span className="hidden sm:flex text-xl font-bold items-center">
                <span className="text-toucan-orange">Handoff</span>
                <span className="text-toucan-grey-100 ml-1">AI</span>
              </span>
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
