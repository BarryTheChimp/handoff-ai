import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to send reset email');
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="card p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-toucan-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="text-toucan-success" size={32} />
          </div>
          <h1 className="text-xl font-bold text-toucan-grey-100 mb-2">Check Your Email</h1>
          <p className="text-toucan-grey-400 mb-6">
            If an account exists with <span className="text-toucan-grey-200">{email}</span>,
            we've sent a password reset link that will expire in 1 hour.
          </p>
          <Link to="/login" className="btn btn-primary w-full">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="card p-8 max-w-md w-full">
        {/* Back link */}
        <Link
          to="/login"
          className="inline-flex items-center gap-1 text-sm text-toucan-grey-400 hover:text-toucan-grey-200 mb-6"
        >
          <ArrowLeft size={16} />
          Back to login
        </Link>

        <h1 className="text-2xl font-bold mb-2">
          Forgot Password?
        </h1>
        <p className="text-toucan-grey-400 mb-6">
          No worries, we'll send you reset instructions.
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
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn btn-primary py-2.5 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
