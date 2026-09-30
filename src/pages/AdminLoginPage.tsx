import React, { useState } from 'react';
import { loginAdmin } from '../services/auth';
import { Lock, User, KeyRound, ArrowRight, ChevronLeft, ShieldCheck, AlertCircle } from 'lucide-react';

interface AdminLoginPageProps {
  onLoginSuccess: () => void;
  onNavigateHome: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
  onNavigateHome,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginAdmin(identifier, password);
      if (res.success) {
        onLoginSuccess();
      } else {
        setError(res.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setError('An unexpected error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center px-4 py-10 max-w-md mx-auto">
      <div className="mb-4">
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 dark:hover:text-white transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </div>

      <div className="bg-white dark:bg-black border border-stone-300 dark:border-stone-800 rounded-3xl p-6 sm:p-8 shadow-lg">
        {/* Seal Icon */}
        <div className="w-12 h-12 rounded-2xl bg-black text-white dark:bg-white dark:text-black flex items-center justify-center mx-auto mb-4 shadow-sm border border-black dark:border-white">
          <Lock className="w-6 h-6" />
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold font-serif text-black dark:text-white">
            Admin Portal
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Restricted access for book curators and linguistic coordinators
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-800 text-xs text-black dark:text-white flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-stone-500 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1.5">
              Admin Identifier / Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter admin ID or email"
                className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-sm text-black dark:text-white placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-black dark:focus:ring-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black dark:text-white mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 text-sm text-black dark:text-white placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-black dark:focus:ring-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-black text-white hover:bg-stone-800 dark:bg-white dark:text-black dark:hover:bg-stone-200 text-sm font-bold active:scale-98 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 border border-black dark:border-white"
          >
            {loading ? (
              <span>Verifying credentials...</span>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-center gap-2 text-[11px] text-stone-500">
          <ShieldCheck className="w-3.5 h-3.5 text-black dark:text-white" />
          <span>Secured via Supabase Row-Level Security</span>
        </div>
      </div>
    </div>
  );
};
