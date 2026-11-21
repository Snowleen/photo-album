'use client';
import { useEffect, useState } from 'react';
import Modal from './Modal';
import { DownloadIcon } from './Icons';

/**
 * Registers the service worker and keeps the browser's "install" prompt so
 * an Install button can show it later. Rendered once in the root layout.
 */
export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    const onPrompt = (e) => {
      e.preventDefault();
      window.__installPrompt = e;
      window.dispatchEvent(new Event('pa-installable'));
    };
    const onInstalled = () => {
      window.__installPrompt = null;
      window.dispatchEvent(new Event('pa-installed'));
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  return null;
}

const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

const isIos = () =>
  typeof navigator !== 'undefined' &&
  (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

/** "Install app" button: native prompt where supported, otherwise step-by-step help. */
export function InstallButton({ className = '' }) {
  const [hidden, setHidden] = useState(true);
  const [help, setHelp] = useState(null); // 'ios' | 'other'
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setHidden(isStandalone());
    const done = () => setInstalled(true);
    window.addEventListener('pa-installed', done);
    return () => window.removeEventListener('pa-installed', done);
  }, []);

  async function install() {
    const prompt = window.__installPrompt;
    if (prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice.catch(() => ({}));
      if (outcome === 'accepted') setInstalled(true);
      window.__installPrompt = null;
      return;
    }
    setHelp(isIos() ? 'ios' : 'other');
  }

  if (hidden) return null;
  return (
    <>
      <button type="button" className={className} onClick={install} disabled={installed}>
        <DownloadIcon size={16} /> {installed ? 'Installed' : 'Install app'}
      </button>
      {help && (
        <Modal title="Install ME-mory" onClose={() => setHelp(null)}>
          {help === 'ios' ? (
            <ol className="install-steps">
              <li>
                <span className="step-num">1</span>
                <span>Tap the <b>Share</b> button <ShareGlyph /> at the bottom of Safari (or top on iPad).</span>
              </li>
              <li>
                <span className="step-num">2</span>
                <span>Scroll down and tap <b>Add to Home Screen</b> <AddGlyph />, then tap <b>Add</b>.</span>
              </li>
              <li className="muted small">Using Chrome on iPhone? Tap the Share icon in the address bar, then “Add to Home Screen”.</li>
            </ol>
          ) : (
            <ol className="install-steps">
              <li>
                <span className="step-num">1</span>
                <span>Open the browser menu (<b>⋮</b> or <b>…</b>).</span>
              </li>
              <li>
                <span className="step-num">2</span>
                <span>Choose <b>Install app</b> or <b>Add to Home screen</b>.</span>
              </li>
              <li className="muted small">If you don’t see it, open this page in Chrome, Edge or Samsung Internet.</li>
            </ol>
          )}
          <button className="btn primary block" onClick={() => setHelp(null)}>Got it</button>
        </Modal>
      )}
    </>
  );
}

const ShareGlyph = () => (
  <svg className="inline-glyph" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-label="Share">
    <path d="M12 15V3M8 7l4-4 4 4" /><path d="M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" />
  </svg>
);
const AddGlyph = () => (
  <svg className="inline-glyph" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-label="Add">
    <rect x="3" y="3" width="18" height="18" rx="4" /><path d="M12 8v8M8 12h8" />
  </svg>
);
