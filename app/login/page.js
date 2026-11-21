'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
    <main className="login-wrap" data-theme="individual">
      <form className="card login-card" onSubmit={submit}>
        <div className="logo">📷</div>
        <h1>Photo Album</h1>
        <p className="muted">Sign in to your memories</p>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" autoComplete="username" required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  );
}
