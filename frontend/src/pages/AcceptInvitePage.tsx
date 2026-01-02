import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Spinner } from '../components/atoms/Spinner';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface InviteDetails {
  email: string;
  role: string;
  inviterName: string;
  expiresAt: string;
}

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/invite/${token}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || 'Invalid invitation');
        }

        setInviteDetails(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invitation');
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!name.trim()) {
      setSubmitError('Name is required');
      return;
    }

    if (password.length < 8) {
      setSubmitError('Password must be at least 8 characters');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setSubmitError('Password must contain at least one uppercase letter');
      return;
    }

    if (!/[a-z]/.test(password)) {
      setSubmitError('Password must contain at least one lowercase letter');
      return;
    }

    if (!/[0-9]/.test(password)) {
      setSubmitError('Password must contain at least one number');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/auth/accept-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to accept invitation');
      }

      // Auto-login with the returned token
      localStorage.setItem('auth_token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      navigate('/', { replace: true });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-toucan-error/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-toucan-error text-3xl">!</span>
          </div>
          <h1 className="text-xl font-bold text-toucan-grey-100 mb-2">Invalid Invitation</h1>
          <p className="text-toucan-grey-400 mb-6">{error}</p>
          <Link to="/login" className="btn btn-primary">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

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
          Welcome to <span className="text-toucan-orange">Handoff</span> AI
        </h1>
        <p className="text-toucan-grey-400 text-center mb-2">
          You've been invited by <span className="text-toucan-grey-200">{inviteDetails?.inviterName}</span>
        </p>
        <p className="text-sm text-toucan-grey-500 text-center mb-6">
          Complete your account setup to get started
        </p>

        {submitError && (
          <div className="bg-toucan-error/20 border border-toucan-error text-toucan-error px-4 py-2 rounded-md mb-4 text-sm">
            {submitError}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-toucan-grey-200 mb-1">
              Email
            </label>
            <input
              type="email"
              value={inviteDetails?.email || ''}
              disabled
              className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-toucan-grey-400 opacity-75"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-toucan-grey-200 mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-toucan-grey-100 placeholder-toucan-grey-400 focus:outline-none focus:ring-2 focus:ring-toucan-orange"
              placeholder="John Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-toucan-grey-200 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-toucan-grey-100 placeholder-toucan-grey-400 focus:outline-none focus:ring-2 focus:ring-toucan-orange"
              placeholder="••••••••"
            />
            <p className="text-xs text-toucan-grey-500 mt-1">
              Min 8 characters, 1 uppercase, 1 lowercase, 1 number
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-toucan-grey-200 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-toucan-grey-100 placeholder-toucan-grey-400 focus:outline-none focus:ring-2 focus:ring-toucan-orange"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full btn btn-primary py-2.5 disabled:opacity-50"
          >
            {submitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-xs text-toucan-grey-500 text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-toucan-orange hover:text-toucan-orange-light">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
