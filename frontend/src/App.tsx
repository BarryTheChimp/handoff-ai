import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ReviewPage } from './pages/ReviewPage';
import { GroupStatusPage } from './pages/GroupStatusPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { DependencyGraphPage } from './pages/DependencyGraphPage';
import { CoveragePage } from './pages/CoveragePage';
import { PreferencesPage } from './pages/PreferencesPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { SettingsPage } from './pages/SettingsPage';
import { WorkBreakdownPage } from './pages/WorkBreakdownPage';
import { AcceptInvitePage } from './pages/AcceptInvitePage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { UsersPage } from './pages/UsersPage';
import { ToastContainer } from './components/organisms/ToastContainer';
import { CommandPalette } from './components/organisms/CommandPalette';
import { OperationProgress } from './components/molecules/OperationProgress';

// API base URL
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Check if user is logged in
function isAuthenticated(): boolean {
  return localStorage.getItem('auth_token') !== null;
}

// Protected route wrapper - redirects to login if not authenticated
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();

  // If already logged in, redirect to dashboard
  React.useEffect(() => {
    if (isAuthenticated()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Login failed');
      }

      localStorage.setItem('auth_token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="card p-8 max-w-md w-full">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-toucan-orange rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-3xl">H</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center mb-2">
          <span className="text-toucan-orange">Handoff</span> AI
        </h1>
        <p className="text-sm text-toucan-grey-400 text-center mb-1">
          by Gary Neville
        </p>
        <p className="text-toucan-grey-400 text-center mb-6">
          Sign in to continue
        </p>
        {error && (
          <div className="bg-toucan-error/20 border border-toucan-error text-toucan-error px-4 py-2 rounded-md mb-4 text-sm">
            {error}
          </div>
        )}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-toucan-grey-200 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-toucan-grey-100 placeholder-toucan-grey-400 focus:outline-none focus:ring-2 focus:ring-toucan-orange"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-toucan-grey-200">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-toucan-orange hover:text-toucan-orange-light"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-toucan-grey-100 placeholder-toucan-grey-400 focus:outline-none focus:ring-2 focus:ring-toucan-orange"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full btn btn-primary py-2.5 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>

      {/* Version footer */}
      <p className="mt-8 text-xs text-toucan-grey-600">
        Version 1.0.0
      </p>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/invite/:token" element={<AcceptInvitePage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
        <Route path="/review/:specId" element={<ProtectedRoute><ReviewPage /></ProtectedRoute>} />
        <Route path="/spec-groups/:groupId" element={<ProtectedRoute><GroupStatusPage /></ProtectedRoute>} />
        <Route path="/templates" element={<ProtectedRoute><TemplatesPage /></ProtectedRoute>} />
        <Route path="/dependencies/:specId" element={<ProtectedRoute><DependencyGraphPage /></ProtectedRoute>} />
        <Route path="/coverage/:specId" element={<ProtectedRoute><CoveragePage /></ProtectedRoute>} />
        <Route path="/preferences/:projectId" element={<ProtectedRoute><PreferencesPage /></ProtectedRoute>} />
        <Route path="/knowledge" element={<ProtectedRoute><KnowledgeBasePage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/work-breakdown/:projectId" element={<ProtectedRoute><WorkBreakdownPage /></ProtectedRoute>} />
        <Route path="/work-breakdown/spec/:specId" element={<ProtectedRoute><WorkBreakdownPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CommandPalette />
      <ToastContainer />
      <OperationProgress />
    </BrowserRouter>
  );
}
