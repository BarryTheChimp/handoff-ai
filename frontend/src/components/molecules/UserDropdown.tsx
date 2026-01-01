import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Settings, HelpCircle } from 'lucide-react';
import type { User } from '../../hooks/useAuth';

interface UserDropdownProps {
  user: User;
  onLogout: () => void;
}

export function UserDropdown({ user, onLogout }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-toucan-dark transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
        data-testid="user-dropdown-trigger"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-toucan-orange flex items-center justify-center text-white font-medium text-sm">
          {user.displayName.charAt(0).toUpperCase()}
        </div>
        {/* Name */}
        <span className="text-toucan-grey-200 text-sm hidden sm:inline">
          {user.displayName}
        </span>
        {/* Chevron */}
        <ChevronDown
          className={`w-4 h-4 text-toucan-grey-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-64 bg-toucan-dark-lighter border border-toucan-dark-border rounded-lg shadow-xl z-50"
          data-testid="user-dropdown-menu"
        >
          {/* User Info */}
          <div className="px-4 py-3 border-b border-toucan-dark-border">
            <p className="text-sm font-medium text-toucan-grey-100">{user.displayName}</p>
            <p className="text-xs text-toucan-grey-400 mt-0.5">{user.email}</p>
            <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full bg-toucan-orange/20 text-toucan-orange capitalize">
              {user.role}
            </span>
          </div>

          {/* Actions */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/settings');
              }}
              className="w-full px-4 py-2 text-left text-sm text-toucan-grey-200 hover:bg-toucan-dark flex items-center gap-2"
              data-testid="settings-button"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <a
              href="https://github.com/anthropics/claude-code/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-4 py-2 text-left text-sm text-toucan-grey-200 hover:bg-toucan-dark flex items-center gap-2"
              onClick={() => setIsOpen(false)}
            >
              <HelpCircle className="w-4 h-4" />
              Help & Support
            </a>
            <div className="border-t border-toucan-dark-border my-1" />
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full px-4 py-2 text-left text-sm text-toucan-grey-200 hover:bg-toucan-dark flex items-center gap-2"
              data-testid="logout-button"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
