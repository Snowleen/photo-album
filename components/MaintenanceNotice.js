'use client';
import { useEffect, useState } from 'react';
import { WrenchIcon, CloseIcon } from './Icons';

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';

/** Fetches the maintenance status and re-checks every minute. */
export function useMaintenance() {
  const [status, setStatus] = useState({ state: 'off' });
  useEffect(() => {
    let alive = true;
    const check = () =>
      fetch('/api/maintenance', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => alive && setStatus(d))
        .catch(() => {});
    check();
    const t = setInterval(check, 60000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  return status;
}

const Wrench = () => <WrenchIcon size={22} />;

/** Card shown on the sign-in page. */
export function MaintenanceCard({ status }) {
  if (status.state === 'active') {
    return (
      <div className="maint-card active" role="status">
        <span className="maint-card-icon"><Wrench /></span>
        <div>
          <strong>ME-mory is under maintenance</strong>
          <p>{status.message}</p>
          {status.end_at && <p className="maint-when">Expected back: <b>{fmt(status.end_at)}</b></p>}
        </div>
      </div>
    );
  }
  if (status.state === 'scheduled') {
    return (
      <div className="maint-card scheduled" role="status">
        <span className="maint-card-icon"><Wrench /></span>
        <div>
          <strong>Scheduled maintenance</strong>
          <p>{status.message}</p>
          <p className="maint-when"><b>{fmt(status.start_at)}</b> – <b>{fmt(status.end_at)}</b></p>
        </div>
      </div>
    );
  }
  return null;
}

/**
 * For signed-in pages: shows a banner while maintenance is scheduled and signs the
 * user out the moment it starts.
 */
export function MaintenanceWatcher() {
  const status = useMaintenance();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const signOut = async () => {
      try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
      window.location.href = '/login';
    };
    if (status.state === 'active') { signOut(); return; }
    if (status.state === 'scheduled') {
      const ms = Date.parse(status.start_at) - Date.now();
      // setTimeout can't wait longer than ~24 days; the minute-by-minute check covers that case.
      if (ms < 2 ** 31 - 1) {
        const t = setTimeout(signOut, Math.max(0, ms));
        return () => clearTimeout(t);
      }
    }
  }, [status]);

  if (status.state !== 'scheduled' || dismissed) return null;
  return (
    <div className="maint-banner" role="status">
      <Wrench />
      <div className="grow">
        <strong>Scheduled maintenance {fmt(status.start_at)} – {fmt(status.end_at)}.</strong>{' '}
        {status.message} You’ll be signed out automatically when it starts.
      </div>
      <button className="icon-btn" onClick={() => setDismissed(true)} aria-label="Hide"><CloseIcon size={16} /></button>
    </div>
  );
}
