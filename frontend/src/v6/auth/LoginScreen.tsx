import React, { useState } from 'react';
import { Lock, LogIn, Shield, AlertCircle } from 'lucide-react';
import apiClient from '../../api/client';
import { useSettingsStore, type UserRole } from '../../store/useSettingsStore';
import { Button } from '../ui';

interface LoginScreenProps {
  onSuccess: () => void;
}

const ROLE_MAP: Record<string, UserRole> = {
  INVESTIGATOR: 'INVESTIGATOR',
  SUPERVISOR: 'SUPERVISOR',
  SYSTEM_ADMINISTRATOR: 'ADMIN',
  AUDITOR: 'ADMIN',
};

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setRole, updateProfile } = useSettingsStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Enter both username and password.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiClient.post('/api/v1/investigation/auth/login', {
        username: username.trim(),
        password,
      });
      const token: string | undefined = res.data?.access_token;
      if (!token) {
        setError('Server did not return an access token.');
        return;
      }
      sessionStorage.setItem('sentinelx_auth_token', token);
      localStorage.setItem('sentinelx_auth_token', token);
      const u = res.data?.user;
      if (u) {
        setRole(ROLE_MAP[String(u.role)] ?? 'INVESTIGATOR');
        updateProfile({
          name: u.display_name || username.trim(),
          rank: u.unit || u.role || 'Investigator',
          badgeNo: u.badge_number || 'POL-00',
        });
      }
      onSuccess();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setError(String(detail || 'Invalid username or password.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-6 bg-[var(--bg)] text-[var(--fg-1)]"
      data-testid="v6-login-screen"
    >
      <div className="v6-glass w-full max-w-[420px] rounded-2xl p-7 shadow-[var(--shadow-lg)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent)]/25">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-3)]">
              SentinelX · TARKA
            </div>
            <h1 className="text-[19px] font-[650] tracking-tight text-[var(--fg-1)]">
              Officer Sign In
            </h1>
          </div>
        </div>

        <p className="text-[13px] text-[var(--fg-2)] mb-5 leading-relaxed">
          Sign in with your authorized investigator credentials to access case files, upload evidence, and review forensic findings.
        </p>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-xl border border-[var(--risk)]/35 bg-[var(--risk-bg)] px-3 py-2.5 text-[12.5px] text-[var(--risk)]"
          >
            <AlertCircle className="w-4 h-4 flex-none mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="tarka-login-username" className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5">
              Username
            </label>
            <input
              id="tarka-login-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. INVESTIGATOR_DELHI"
              className="w-full h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--surface-1)] text-[13.5px] text-[var(--fg-1)] placeholder:text-[var(--fg-3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              disabled={submitting}
            />
          </div>

          <div>
            <label htmlFor="tarka-login-password" className="block text-[12px] font-semibold text-[var(--fg-2)] mb-1.5">
              Password
            </label>
            <input
              id="tarka-login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full h-10 px-3 rounded-xl border border-[var(--line)] bg-[var(--surface-1)] text-[13.5px] text-[var(--fg-1)] placeholder:text-[var(--fg-3)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              disabled={submitting}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={submitting}
            icon={<LogIn className="w-4 h-4" />}
            className="w-full justify-center"
            data-testid="login-submit-btn"
          >
            Sign in
          </Button>
        </form>

        <div className="mt-5 pt-4 border-t border-[var(--line)] flex items-center gap-2 text-[11.5px] text-[var(--fg-3)]">
          <Lock className="w-3.5 h-3.5 flex-none" />
          <span>Case isolation and Section 63 BSA audit logging enforced.</span>
        </div>
      </div>
    </div>
  );
};
