'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';
import AuthShell, { PasswordInput } from '@/components/AuthShell';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function login(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { role } = await api('/api/auth/login', { method: 'POST', body: { email, password } });
      router.replace(role === 'superadmin' ? '/admin' : '/album');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <form className="auth-card" onSubmit={login} noValidate>
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

          {error && <div className="auth-error" role="alert">{error}</div>}

          <button className="auth-submit" disabled={busy || !email || !password}>
            {busy ? <span className="spinner" /> : 'Sign in'}
          </button>
          <p className="auth-foot">Forgot your password or need an account? Ask your album administrator.</p>
        </form>
    </AuthShell>
  );
}
