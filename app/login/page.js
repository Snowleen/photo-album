'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import Logo from '@/components/Logo';

const EyeIcon = ({ open }) =>
  open ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M2 2l20 20" />
    </svg>
  );

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { role } = await api('/api/auth/login', { method: 'POST', body: { username, password } });
      router.replace(role === 'superadmin' ? '/admin' : '/album');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <section className="auth-hero">
        <div className="auth-glow g1" />
        <div className="auth-glow g2" />
        <div className="auth-hero-inner">
          <div className="auth-brand">
            <span className="auth-logo"><Logo size={40} /></span>
            <span>Photo Album</span>
          </div>
          <h1 className="auth-headline">Every moment,<br />beautifully kept.</h1>
          <p className="auth-sub">A private home for the photos you share with the people you love.</p>
          <ul className="auth-points">
            <li>Private albums for you, your partner or your family</li>
            <li>Notes and dates for every memory</li>
            <li>Export to JPG, PNG or PDF anytime</li>
          </ul>
        </div>
      </section>

      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit} noValidate>
          <div className="auth-card-logo"><Logo size={48} /></div>
          <h2>Welcome back</h2>
          <p className="auth-muted">Sign in to continue to your album</p>

          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="pw-wrap">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                title={showPw ? 'Hide password' : 'Show password'}
              >
                <EyeIcon open={showPw} />
              </button>
            </div>
          </div>

          {error && <div className="auth-error" role="alert">{error}</div>}

          <button className="auth-submit" disabled={busy || !username || !password}>
            {busy ? <span className="spinner" /> : 'Sign in'}
          </button>
          <p className="auth-foot">Accounts are created by your album administrator.</p>
        </form>
        <p className="auth-copy">© {new Date().getFullYear()} Photo Album · Private &amp; secure</p>
      </section>
    </main>
  );
}
