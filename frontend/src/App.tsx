import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { ReviewPage } from './pages/ReviewPage';

function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="card p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">
          <span className="text-toucan-orange">Handoff</span> AI
        </h1>
        <p className="text-toucan-grey-400 text-center mb-6">
          Sign in to continue
        </p>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-toucan-grey-200 mb-1">
              Username
            </label>
            <input
              type="text"
              className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-toucan-grey-100 placeholder-toucan-grey-400 focus:outline-none focus:ring-2 focus:ring-toucan-orange"
              placeholder="admin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-toucan-grey-200 mb-1">
              Password
            </label>
            <input
              type="password"
              className="w-full bg-toucan-dark border border-toucan-dark-border rounded-md px-3 py-2 text-toucan-grey-100 placeholder-toucan-grey-400 focus:outline-none focus:ring-2 focus:ring-toucan-orange"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full btn btn-primary py-2.5"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/review/:specId" element={<ReviewPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
