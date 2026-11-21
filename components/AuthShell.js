'use client';
import { useState } from 'react';
import Logo from './Logo';

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

/** Password input with a show/hide eye button. */
export function PasswordInput({ id, value, onChange, autoComplete = 'current-password', placeholder = 'Enter your password' }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-wrap">
      <input id={id} type={show ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} placeholder={placeholder} required />
      <button
        type="button"
        className="pw-toggle"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        title={show ? 'Hide password' : 'Show password'}
      >
        <EyeIcon open={show} />
      </button>
    </div>
  );
}

/** Pink two-panel layout shared by the sign-in, invitation and reset pages. */
export default function AuthShell({ children }) {
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
        {children}
        <p className="auth-copy">© {new Date().getFullYear()} Photo Album · Private &amp; secure</p>
      </section>
    </main>
  );
}
