import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileCode2, Settings2, BookOpen } from 'lucide-react';
import { useProject } from '../../hooks/useProject';
import { clsx } from 'clsx';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  requiresProject?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/',
    requiresProject: true,
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: 'Knowledge',
    path: '/knowledge',
    requiresProject: true,
    icon: <BookOpen className="w-5 h-5" />,
  },
  {
    label: 'Templates',
    path: '/templates',
    requiresProject: true,
    icon: <FileCode2 className="w-5 h-5" />,
  },
  {
    label: 'Preferences',
    path: '/preferences',
    requiresProject: true,
    icon: <Settings2 className="w-5 h-5" />,
  },
];

export function Navigation() {
  const location = useLocation();
  const { selectedProjectId } = useProject();

  function isActive(path: string): boolean {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  }

  function getPath(item: NavItem): string {
    // For preferences, append project ID
    if (item.path === '/preferences' && selectedProjectId) {
      return `/preferences/${selectedProjectId}`;
    }
    return item.path;
  }

  return (
    <nav className="bg-toucan-dark border-b border-toucan-dark-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 -mb-px">
          {NAV_ITEMS.map((item) => {
            const isDisabled = item.requiresProject && !selectedProjectId;
            const active = isActive(item.path);
            const path = getPath(item);

            if (isDisabled) {
              return (
                <span
                  key={item.path}
                  className="flex items-center gap-2 px-4 py-3 text-sm
                             text-toucan-grey-600 cursor-not-allowed border-b-2 border-transparent"
                  title="Select a project first"
                >
                  {item.icon}
                  <span className="hidden sm:inline">{item.label}</span>
                </span>
              );
            }

            return (
              <Link
                key={item.path}
                to={path}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 text-sm transition-colors border-b-2',
                  active
                    ? 'text-toucan-orange border-toucan-orange'
                    : 'text-toucan-grey-300 border-transparent hover:text-toucan-grey-100 hover:border-toucan-grey-600'
                )}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
