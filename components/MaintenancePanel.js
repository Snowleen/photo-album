'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';

const PRESETS = [
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: '4 hours', minutes: 240 },
  { label: '1 day', minutes: 1440 },
];
const UNITS = { minutes: 1, hours: 60, days: 1440 };

export const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';

/** Date -> value for <input type="datetime-local"> in the viewer's local time. */
const toLocalInput = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const STATUS = {
  off: { label: 'Off', cls: 'off', text: 'ME-mory is running normally.' },
  scheduled: { label: 'Scheduled', cls: 'scheduled' },
  active: { label: 'In maintenance', cls: 'active' },
  ended: { label: 'Finished', cls: 'off', text: 'The last maintenance has finished. Users can sign in again.' },
};

export default function MaintenancePanel({ ask, onChanged }) {
  const [rec, setRec] = useState(null);
  const [message, setMessage] = useState('');
  const [startMode, setStartMode] = useState('now');
  const [startLocal, setStartLocal] = useState(() => toLocalInput(new Date(Date.now() + 3600e3)));
  const [amount, setAmount] = useState(1);
  const [unit, setUnit] = useState('hours');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await api('/api/admin/maintenance');
    setRec(r);
    if (r.state === 'scheduled' || r.state === 'active') {
      setMessage(r.message || '');
      setStartMode(r.state === 'active' ? 'now' : 'later');
      setStartLocal(toLocalInput(new Date(r.start_at)));
      const mins = Math.round((Date.parse(r.end_at) - Date.parse(r.start_at)) / 60000);
      if (mins % 1440 === 0) { setAmount(mins / 1440); setUnit('days'); }
      else if (mins % 60 === 0) { setAmount(mins / 60); setUnit('hours'); }
      else { setAmount(mins); setUnit('minutes'); }
    } else if (!message) {
      setMessage(r.message || 'We are upgrading ME-mory to make it even better. Please check back soon — your photos are safe.');
    }
  }
  useEffect(() => { load().catch((e) => setError(e.message)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const minutes = Math.max(0, Number(amount) || 0) * UNITS[unit];
  const start = startMode === 'now' ? new Date() : new Date(startLocal);
  const end = new Date(start.getTime() + minutes * 60000);
  const valid = message.trim() && minutes > 0 && !Number.isNaN(start.getTime()) && end.getTime() > Date.now();

  async function save() {
    setError(''); setSaved('');
    const startsNow = startMode === 'now' || start.getTime() <= Date.now();
    const ok = await ask.confirm({
      title: startsNow ? 'Start maintenance now?' : 'Schedule maintenance?',
      message: startsNow
        ? `Everyone who is signed in will be signed out immediately, and nobody except you can sign in until ${fmtDateTime(end.toISOString())}.`
        : `Users will see your message now. At ${fmtDateTime(start.toISOString())} everyone will be signed out, and they can sign in again after ${fmtDateTime(end.toISOString())}.`,
      confirmText: startsNow ? 'Start now' : 'Schedule',
      danger: startsNow,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api('/api/admin/maintenance', {
        method: 'PUT',
        body: { enabled: true, message, start_at: (startMode === 'now' ? new Date() : start).toISOString(), end_at: end.toISOString() },
      });
      await load();
      onChanged?.();
      setSaved(startsNow ? 'Maintenance started.' : 'Maintenance scheduled.');
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  async function turnOff() {
    const active = rec?.state === 'active';
    const ok = await ask.confirm({
      title: active ? 'End maintenance now?' : 'Cancel scheduled maintenance?',
      message: active ? 'Users will be able to sign in again straight away.' : 'The notice will disappear and nobody will be signed out.',
      confirmText: active ? 'End now' : 'Cancel maintenance',
    });
    if (!ok) return;
    setBusy(true); setError(''); setSaved('');
    try {
      await api('/api/admin/maintenance', { method: 'PUT', body: active ? { action: 'end' } : { enabled: false } });
      await load();
      onChanged?.();
      setSaved(active ? 'Maintenance ended.' : 'Scheduled maintenance cancelled.');
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  if (!rec) return <p className="muted">{error || 'Loading…'}</p>;
  const st = STATUS[rec.state] || STATUS.off;
  const running = rec.state === 'scheduled' || rec.state === 'active';

  return (
    <div className="maint">
      <div className={`card maint-status s-${st.cls}`}>
        <span className="maint-dot" />
        <div className="grow">
          <strong>{st.label}</strong>
          <div className="small">
            {rec.state === 'scheduled' && <>Starts <b>{fmtDateTime(rec.start_at)}</b> · ends <b>{fmtDateTime(rec.end_at)}</b>. Users already see the notice.</>}
            {rec.state === 'active' && <>Users are signed out until <b>{fmtDateTime(rec.end_at)}</b>. You can still sign in as superadmin.</>}
            {st.text}
          </div>
        </div>
        {running && (
          <button className="btn small danger" onClick={turnOff} disabled={busy}>{rec.state === 'active' ? 'End now' : 'Cancel'}</button>
        )}
      </div>

      <div className="card form maint-form">
        <h3>{running ? 'Update maintenance' : 'Turn on maintenance'}</h3>

        <label>
          Message for users
          <textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} placeholder="e.g. We’re upgrading ME-mory. Back soon!" />
        </label>

        <div>
          <div className="field-label">Start</div>
          <div className="seg small-seg">
            <button type="button" className={startMode === 'now' ? 'active' : ''} onClick={() => setStartMode('now')}>Now</button>
            <button type="button" className={startMode === 'later' ? 'active' : ''} onClick={() => setStartMode('later')}>Schedule</button>
          </div>
          {startMode === 'later' && (
            <input type="datetime-local" value={startLocal} min={toLocalInput(new Date())} onChange={(e) => setStartLocal(e.target.value)} />
          )}
        </div>

        <div>
          <div className="field-label">Duration</div>
          <div className="chips-row">
            {PRESETS.map((p) => (
              <button
                type="button"
                key={p.label}
                className={`chip ${minutes === p.minutes ? 'active' : ''}`}
                onClick={() => {
                  if (p.minutes % 1440 === 0) { setAmount(p.minutes / 1440); setUnit('days'); }
                  else if (p.minutes % 60 === 0) { setAmount(p.minutes / 60); setUnit('hours'); }
                  else { setAmount(p.minutes); setUnit('minutes'); }
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="copy-box duration-row">
            <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Duration" />
            <select value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Unit">
              <option value="minutes">minutes</option>
              <option value="hours">hours</option>
              <option value="days">days</option>
            </select>
          </div>
        </div>

        {valid && (
          <div className="maint-summary small">
            {startMode === 'now' ? 'Starts immediately' : <>Starts <b>{fmtDateTime(start.toISOString())}</b></>} and ends{' '}
            <b>{fmtDateTime(end.toISOString())}</b>. Everyone signed in is signed out when it starts.
          </div>
        )}
        {error && <div className="note-err">{error}</div>}
        {saved && <div className="note-ok">{saved}</div>}

        <button className="btn primary block" disabled={busy || !valid} onClick={save}>
          {startMode === 'now' ? (rec.state === 'active' ? 'Save changes' : 'Start maintenance now') : running ? 'Save schedule' : 'Schedule maintenance'}
        </button>
      </div>
    </div>
  );
}
