'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import Link from 'next/link';
import AuthShell, { PasswordInput } from '@/components/AuthShell';
import { FullLogo } from '@/components/Logo';
import { InstallButton } from '@/components/Pwa';

const REMEMBER_KEY = 'pa_remember'; // stores { email } on this device when "Remember me" is ticked

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Restore the remembered email and checkbox state.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(REMEMBER_KEY) || 'null');
      if (saved?.email) { setEmail(saved.email); setRemember(true); }
    } catch {}
  }, []);

  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { role } = await api('/api/auth/login', { method: 'POST', body: { email, password, remember } });
      try {
        if (remember) localStorage.setItem(REMEMBER_KEY, JSON.stringify({ email: email.trim() }));
        else localStorage.removeItem(REMEMBER_KEY);
      } catch {}
      router.replace(role === 'superadmin' ? '/admin' : '/album');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell
      topActions={
        <>
          <InstallButton className="top-btn" />
          <Link href="/signup" className="top-btn solid">Sign up</Link>
        </>
      }
    >
      <form className="auth-card" onSubmit={login} noValidate>
          <div className="card-logo"><FullLogo width={150} /></div>
          <h2>Welcome back</h2>
          <p className="auth-muted">Sign in to continue to your album</p>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="text"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <label className="remember">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span className="box" aria-hidden>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            </span>
            <span>Remember me</span>
          </label>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <button className="auth-submit" disabled={busy || !email || !password}>
            {busy ? <span className="spinner" /> : 'Sign in'}
          </button>
          <p className="auth-foot">Forgot your password? Ask your album administrator.</p>
        </form>
    </AuthShell>
  );
}
