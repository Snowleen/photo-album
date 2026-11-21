'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, fmtDate } from '@/lib/client';
import Modal from '@/components/Modal';

const MODES = {
  individual: { label: 'Individual', icon: '👤', limit: 1 },
  couple: { label: 'Couple', icon: '💕', limit: 2 },
  family: { label: 'Family', icon: '☁️', limit: 10 },
};

export default function AdminPage() {
  const router = useRouter();
  const [spaces, setSpaces] = useState(null);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [addUserTo, setAddUserTo] = useState(null);
  const [resetUser, setResetUser] = useState(null);

  const load = useCallback(async () => {
    try {
      const { spaces } = await api('/api/admin/spaces');
      setSpaces(spaces);
    } catch (e) {
      if (e.status === 401) router.replace('/login');
      else setError(e.message);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function run(fn) {
    setError('');
    try { await fn(); await load(); } catch (e) { setError(e.message); }
  }

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  return (
    <div className="app" data-theme="admin">
      <header className="topbar">
        <div className="brand">🛡️ Superadmin</div>
        <button className="btn ghost" onClick={logout}>Log out</button>
      </header>

      <main className="container">
        <div className="row-between">
          <h2>Album spaces</h2>
          <button className="btn primary" onClick={() => setShowNew(true)}>+ New space</button>
        </div>
        {error && <p className="error">{error}</p>}
        {!spaces && <p className="muted">Loading…</p>}
        {spaces?.length === 0 && <p className="muted empty">No spaces yet. Create one for a person, couple or family.</p>}

        <div className="space-list">
          {spaces?.map((s) => {
            const m = MODES[s.mode];
            const full = s.users.length >= m.limit;
            return (
              <div key={s.id} className={`card space-card mode-${s.mode}`}>
                <div className="row-between">
                  <div>
                    <h3>{m.icon} {s.name}</h3>
                    <p className="muted small">{s.photo_count} photos · created {fmtDate(s.created_at)}</p>
                  </div>
                  <div className="row gap">
                    <button className="btn small" onClick={() => {
                      const name = prompt('Rename space', s.name);
                      if (name) run(() => api(`/api/admin/spaces/${s.id}`, { method: 'PATCH', body: { name } }));
                    }}>Rename</button>
                    <button className="btn small danger" onClick={() => {
                      if (confirm(`Delete "${s.name}" with ALL its users and photos? This cannot be undone.`))
                        run(() => api(`/api/admin/spaces/${s.id}`, { method: 'DELETE' }));
                    }}>Delete</button>
                  </div>
                </div>

                <div className="mode-switch">
                  {Object.entries(MODES).map(([key, v]) => (
                    <button
                      key={key}
                      className={`chip ${s.mode === key ? 'active' : ''}`}
                      onClick={() => s.mode !== key && run(() => api(`/api/admin/spaces/${s.id}`, { method: 'PATCH', body: { mode: key } }))}
                    >
                      {v.icon} {v.label} <span className="muted small">(max {v.limit})</span>
                    </button>
                  ))}
                </div>

                <div className="users">
                  <div className="row-between">
                    <strong>Users ({s.users.length}/{m.limit})</strong>
                    <button className="btn small primary" disabled={full} onClick={() => setAddUserTo(s)}>
                      {full ? 'Full' : '+ Add user'}
                    </button>
                  </div>
                  {s.users.length === 0 && <p className="muted small">No users yet.</p>}
                  {s.users.map((u) => (
                    <div key={u.id} className={`user-row ${u.active ? '' : 'disabled'}`}>
                      <div>
                        <div>{u.display_name}</div>
                        <div className="muted small">@{u.username}{!u.active && ' · disabled'}</div>
                      </div>
                      <div className="row gap wrap">
                        <button className="btn small" onClick={() => setResetUser(u)}>Reset password</button>
                        <button className="btn small" onClick={() => run(() => api(`/api/admin/users/${u.id}`, { method: 'PATCH', body: { active: !u.active } }))}>
                          {u.active ? 'Disable' : 'Enable'}
                        </button>
                        <button className="btn small danger" onClick={() => {
                          if (confirm(`Remove user @${u.username}? Their photos stay in the space.`))
                            run(() => api(`/api/admin/users/${u.id}`, { method: 'DELETE' }));
                        }}>Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {showNew && <NewSpaceModal onClose={() => setShowNew(false)} onDone={() => { setShowNew(false); load(); }} />}
      {addUserTo && <AddUserModal space={addUserTo} onClose={() => setAddUserTo(null)} onDone={() => { setAddUserTo(null); load(); }} />}
      {resetUser && <ResetModal user={resetUser} onClose={() => setResetUser(null)} />}
    </div>
  );
}

function NewSpaceModal({ onClose, onDone }) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState('couple');
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    try {
      await api('/api/admin/spaces', { method: 'POST', body: { name, mode } });
      onDone();
    } catch (err) { setError(err.message); }
  }
  return (
    <Modal title="New album space" onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Shirleen & Jackson Album" required /></label>
        <label>Mode</label>
        <div className="mode-switch">
          {Object.entries(MODES).map(([key, v]) => (
            <button type="button" key={key} className={`chip ${mode === key ? 'active' : ''}`} onClick={() => setMode(key)}>
              {v.icon} {v.label} <span className="muted small">(max {v.limit})</span>
            </button>
          ))}
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn primary block">Create</button>
      </form>
    </Modal>
  );
}

function AddUserModal({ space, onClose, onDone }) {
  const [f, setF] = useState({ display_name: '', username: '', password: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    try {
      await api(`/api/admin/spaces/${space.id}/users`, { method: 'POST', body: f });
      onDone();
    } catch (err) { setError(err.message); }
  }
  return (
    <Modal title={`Add user to ${space.name}`} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>Display name<input value={f.display_name} onChange={set('display_name')} placeholder="e.g. Shirleen" required /></label>
        <label>Username (for login)<input value={f.username} onChange={set('username')} autoCapitalize="none" required /></label>
        <label>Password<input value={f.password} onChange={set('password')} minLength={6} required /></label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary block">Add user</button>
      </form>
    </Modal>
  );
}

function ResetModal({ user, onClose }) {
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  async function submit(e) {
    e.preventDefault();
    try {
      await api(`/api/admin/users/${user.id}`, { method: 'PATCH', body: { password } });
      setMsg('Password updated ✓');
      setPassword('');
    } catch (err) { setMsg(err.message); }
  }
  return (
    <Modal title={`Reset password for @${user.username}`} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>New password<input value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></label>
        {msg && <p className="muted">{msg}</p>}
        <button className="btn primary block">Save</button>
      </form>
    </Modal>
  );
}
