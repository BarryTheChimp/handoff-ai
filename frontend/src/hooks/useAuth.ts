import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export interface User {
  id: string;
  email: string;
  name: string | null;
  displayName: string; // Computed from name or email
  role: 'admin' | 'member';
  status: 'pending' | 'active' | 'suspended';
  avatarUrl: string | null;
  authProvider: 'email' | 'google' | 'microsoft';
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

        // Build user from JWT payload
        const user: User = {
          id: payload.id || payload.sub || 'unknown',
          email: payload.email || '',
          name: payload.name || null,
          displayName: payload.name || payload.email?.split('@')[0] || 'User',
          role: payload.role || 'member',
          status: payload.status || 'active',
          avatarUrl: payload.avatarUrl || null,
          authProvider: payload.authProvider || 'email',
        };

        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        // Invalid token - clear it
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    } else {
      setState({ user: null, isAuthenticated: false, isLoading: false });
    }
  }, []);

  const logout = useCallback(() => {
    // Clear all auth-related storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
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
