'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';
import AuthShell from '@/components/AuthShell';
import { FullLogo } from '@/components/Logo';
import { InstallButton } from '@/components/Pwa';
import { CheckIcon } from '@/components/Icons';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [website, setWebsite] = useState(''); // honeypot, hidden from people
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/signup', { method: 'POST', body: { display_name: name, email, note, website } });
      setDone(true);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  return (
    <AuthShell
      topActions={
        <>
          <InstallButton className="top-btn" />
          <Link href="/login" className="top-btn solid">Sign in</Link>
        </>
      }
    >
      {done ? (
        <div className="auth-card">
          <div className="done-badge"><CheckIcon size={26} /></div>
          <h2>Request sent</h2>
          <p className="auth-muted">
            Thank you, {name.trim()}! Your request is waiting for approval. Once it’s approved, your sign-in details will be emailed to <b>{email.trim()}</b>.
          </p>
          <Link href="/login" className="auth-submit as-link">Back to sign in</Link>
        </div>
      ) : (
        <form className="auth-card" onSubmit={submit} noValidate>
          <div className="card-logo"><FullLogo width={130} /></div>
          <h2>Request an account</h2>
          <p className="auth-muted">Fill in your details. The album administrator will review your request and email you your sign-in details.</p>

          <div className="field">
            <label htmlFor="name">Your name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="How should we call you?" autoComplete="name" required />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="none"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
            <span className="field-hint">Your sign-in details will be sent here.</span>
          </div>
          <div className="field">
            <label htmlFor="note">Message <span className="optional">(optional)</span></label>
            <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="e.g. I’m Shirleen’s sister — please add me to the family album." />
          </div>
          <input className="hp" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} aria-hidden="true" name="website" />

          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="auth-submit" disabled={busy || !name.trim() || !email.trim()}>
            {busy ? <span className="spinner" /> : 'Send request'}
          </button>
          <p className="auth-foot">Already have an account? <Link href="/login" className="text-link">Sign in</Link></p>
        </form>
      )}
    </AuthShell>
  );
}
