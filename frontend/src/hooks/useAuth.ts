import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const navigate = useNavigate();

  // Load user from JWT on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        // Decode JWT payload (base64)
        const parts = token.split('.');
        if (parts.length !== 3) {
          throw new Error('Invalid token format');
        }
        const payload = JSON.parse(atob(parts[1] as string));
        setState({
          user: {
            id: payload.id || payload.sub || 'unknown',
            username: payload.username || 'user',
            displayName: payload.displayName || payload.username || 'User',
            email: payload.email || `${payload.username || 'user'}@toucanlabs.co.uk`,
            role: payload.role || 'user',
          },
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        // Invalid token - clear it
        localStorage.removeItem('auth_token');
        setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  const logout = useCallback(() => {
    // Clear all auth-related storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('selected_project_id');

    // Update state
    setState({ user: null, isAuthenticated: false, isLoading: false });

    // Redirect to login
    navigate('/login', { replace: true });
  }, [navigate]);

  return {
    ...state,
    logout,
  };
}
