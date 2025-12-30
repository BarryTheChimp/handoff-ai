import { Link } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  path?: string; // Undefined = current page (not clickable)
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm py-4">
      {/* Home Icon */}
      <Link
        to="/"
        className="text-toucan-grey-400 hover:text-toucan-grey-200 transition-colors"
        aria-label="Home"
      >
        <Home className="w-4 h-4" />
      </Link>

      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-2">
          {/* Separator */}
          <ChevronRight className="w-4 h-4 text-toucan-grey-600" />

          {/* Breadcrumb Item */}
          {item.path ? (
            <Link
              to={item.path}
              className="text-toucan-grey-400 hover:text-toucan-grey-200 transition-colors truncate max-w-[150px]"
              title={item.label}
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-toucan-grey-200 truncate max-w-[200px]" title={item.label}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
