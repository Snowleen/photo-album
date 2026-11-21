'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Styled replacement for window.confirm / window.prompt.
 *   const [dialog, ask] = useDialog();
 *   if (await ask.confirm({ title, message, danger: true })) ...
 *   const name = await ask.prompt({ title, label, defaultValue });
 * Render {dialog} somewhere in the component.
 */
export function useDialog() {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  const open = (opts) =>
    new Promise((resolve) => {
      resolver.current = resolve;
      setState(opts);
    });
  const close = (value) => {
    resolver.current?.(value);
    resolver.current = null;
    setState(null);
  };

  const ask = {
    confirm: (o) => open({ kind: 'confirm', ...o }),
    prompt: (o) => open({ kind: 'prompt', ...o }),
  };
  const dialog = state ? <DialogView key={state.title} {...state} onClose={close} /> : null;
  return [dialog, ask];
}

const Icon = ({ danger, kind }) => (
  <div className={`dlg-icon ${danger ? 'danger' : ''}`}>
    {danger ? (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
      </svg>
    ) : kind === 'prompt' ? (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
      </svg>
    ) : (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" />
      </svg>
    )}
  </div>
);

function DialogView({ kind, title, message, label, defaultValue = '', placeholder, confirmText, danger, onClose }) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef(null);
  const cancel = () => onClose(kind === 'prompt' ? null : false);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
    const onKey = (e) => e.key === 'Escape' && cancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(e) {
    e.preventDefault();
    if (kind === 'prompt') {
      const v = value.trim();
      if (v) onClose(v);
    } else onClose(true);
  }

  return (
    <div className="dlg-backdrop" onMouseDown={(e) => e.target === e.currentTarget && cancel()}>
      <form className="dlg" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="dlg-title">
        <Icon danger={danger} kind={kind} />
        <h3 id="dlg-title">{title}</h3>
        {message && <p className="dlg-msg">{message}</p>}
        {kind === 'prompt' && (
          <label className="dlg-field">
            {label && <span>{label}</span>}
            <input ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} maxLength={100} />
          </label>
        )}
        <div className="dlg-actions">
          <button type="button" className="btn ghost" onClick={cancel}>Cancel</button>
          <button
            type="submit"
            className={`btn ${danger ? 'danger-solid' : 'primary'}`}
            disabled={kind === 'prompt' && !value.trim()}
            autoFocus={kind !== 'prompt'}
          >
            {confirmText || (kind === 'prompt' ? 'Save' : 'OK')}
          </button>
        </div>
      </form>
    </div>
  );
}
