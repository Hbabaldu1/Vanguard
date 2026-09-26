import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowLeft, AlertCircle, Eye, EyeOff, KeyRound } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (token: string, user: { email: string; role: string; name: string }) => void;
  onCancel: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onCancel }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDefaultCredentials = () => {
    setEmail('hassanabdullahibkd2002@gmail.com');
    setPassword('H@12345678');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {/* Back button */}
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Public Opportunities Feed</span>
        </button>

        {/* Lock / Security Shield Icon */}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-4">
          <Lock className="h-6 w-6" />
        </div>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold tracking-tight text-white">
            Administrative Access
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Vanguard Opportunity Intelligence Platform Control Center
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-rose-800/80 bg-rose-950/40 p-3 text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Administrator Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@vanguard.org"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-3 py-2.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Security Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-9 pr-10 py-2.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Environment Variables Storage info */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-400 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-300">Environment Storage:</span>
              <button
                type="button"
                onClick={fillDefaultCredentials}
                className="text-emerald-400 hover:underline font-semibold"
              >
                Auto-fill Env Credentials
              </button>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              Validated server-side against <code className="text-emerald-400">ADMIN_EMAIL</code> and <code className="text-emerald-400">ADMIN_PASSWORD</code>.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 shadow-md mt-2"
          >
            {isLoading ? 'Verifying Credentials...' : 'Authenticate & Open Admin Center'}
          </button>
        </form>
      </div>
    </div>
  );
};
