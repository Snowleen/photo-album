'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, fmtDate } from '@/lib/client';
import Modal from '@/components/Modal';
import Logo from '@/components/Logo';
import { useDialog } from '@/components/useDialog';

const MODES = {
  individual: { label: 'Individual', icon: '👤', limit: 1 },
  couple: { label: 'Couple', icon: '💕', limit: 2 },
  family: { label: 'Family', icon: '☁️', limit: 10 },
  pet: { label: 'Pet', icon: '🐾', limit: 10 },
};

export default function AdminPage() {
  const router = useRouter();
  const [spaces, setSpaces] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [addUserTo, setAddUserTo] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [dialog, ask] = useDialog();

  const load = useCallback(async () => {
    try {
      const [s, u] = await Promise.all([api('/api/admin/spaces'), api('/api/admin/users')]);
      setSpaces(s.spaces);
      setUsers(u.users);
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

  async function renameSpace(s) {
    const name = await ask.prompt({ title: 'Rename space', label: 'Space name', defaultValue: s.name, confirmText: 'Rename' });
    if (name && name !== s.name) run(() => api(`/api/admin/spaces/${s.id}`, { method: 'PATCH', body: { name } }));
  }
  async function deleteSpace(s) {
    const yes = await ask.confirm({
      title: `Delete “${s.name}”?`,
      message: `All ${s.photo_count} photos and albums in this space will be permanently deleted. Logins are kept and stay in their other spaces. This cannot be undone.`,
      confirmText: 'Delete space',
      danger: true,
    });
    if (yes) run(() => api(`/api/admin/spaces/${s.id}`, { method: 'DELETE' }));
  }
  async function removeMember(s, u) {
    const yes = await ask.confirm({
      title: `Remove ${u.display_name} from “${s.name}”?`,
      message: 'They will no longer see this space. Their login and the photos they uploaded are kept.',
      confirmText: 'Remove',
      danger: true,
    });
    if (yes) run(() => api(`/api/admin/spaces/${s.id}/users/${u.id}`, { method: 'DELETE' }));
  }
  async function deleteAccount(u) {
    const yes = await ask.confirm({
      title: `Delete login @${u.username}?`,
      message: 'This removes the login from every space. Photos they uploaded stay in the spaces.',
      confirmText: 'Delete login',
      danger: true,
    });
    if (yes) run(() => api(`/api/admin/users/${u.id}`, { method: 'DELETE' }));
  }

  return (
    <div className="app" data-theme="admin">
      <header className="topbar">
        <div className="brand row gap"><span className="admin-logo"><Logo size={28} /></span> Photo Album <span className="badge">Superadmin</span></div>
        <button className="btn ghost" onClick={logout}>Log out</button>
      </header>

      <main className="container">
        <div className="row-between">
          <h2>Album spaces</h2>
          <button className="btn primary" onClick={() => setShowNew(true)}>+ New space</button>
        </div>
        {error && <p className="error">{error}</p>}
        {!spaces && <p className="muted">Loading…</p>}
        {spaces?.length === 0 && <p className="muted empty">No spaces yet. Create one for a person, couple, family or pet.</p>}

        <div className="space-list">
          {spaces?.map((s) => {
            const m = MODES[s.mode] || MODES.individual;
            const full = s.users.length >= m.limit;
            return (
              <div key={s.id} className={`card space-card mode-${s.mode}`}>
                <div className="row-between">
                  <div>
                    <h3>{m.icon} {s.name}</h3>
                    <p className="muted small">{s.photo_count} photos · created {fmtDate(s.created_at)}</p>
                  </div>
                  <div className="row gap">
                    <button className="btn small" onClick={() => renameSpace(s)}>Rename</button>
                    <button className="btn small danger" onClick={() => deleteSpace(s)}>Delete</button>
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
                    <strong>Members ({s.users.length}/{m.limit})</strong>
                    <button className="btn small primary" disabled={full} onClick={() => setAddUserTo(s)}>
                      {full ? 'Full' : '+ Add member'}
                    </button>
                  </div>
                  {s.users.length === 0 && <p className="muted small">No members yet.</p>}
                  {s.users.map((u) => (
                    <div key={u.id} className={`user-row ${u.active ? '' : 'disabled'}`}>
                      <div>
                        <div>{u.display_name}</div>
                        <div className="muted small">@{u.username}{!u.active && ' · disabled'}</div>
                      </div>
                      <button className="btn small danger" onClick={() => removeMember(s, u)}>Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="row-between section-head">
          <h2>Logins</h2>
          <span className="muted small">{users.length} total</span>
        </div>
        {users.length === 0 && <p className="muted small">No logins yet. Add a member to a space to create one.</p>}
        <div className="card accounts">
          {users.map((u) => (
            <div key={u.id} className={`account-row ${u.active ? '' : 'disabled'}`}>
              <div className="account-info">
                <div><strong>{u.display_name}</strong> <span className="muted small">@{u.username}{!u.active && ' · disabled'}</span></div>
                <div className="tags">
                  {u.spaces.length === 0 && <span className="tag warn">Not in any space</span>}
                  {u.spaces.map((sp) => <span key={sp.id} className="tag">{MODES[sp.mode]?.icon} {sp.name}</span>)}
                </div>
              </div>
              <div className="row gap wrap">
                <button className="btn small" onClick={() => setResetUser(u)}>Reset password</button>
                <button className="btn small" onClick={() => run(() => api(`/api/admin/users/${u.id}`, { method: 'PATCH', body: { active: !u.active } }))}>
                  {u.active ? 'Disable' : 'Enable'}
                </button>
                <button className="btn small danger" onClick={() => deleteAccount(u)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {showNew && <NewSpaceModal onClose={() => setShowNew(false)} onDone={() => { setShowNew(false); load(); }} />}
      {addUserTo && (
        <AddMemberModal
          space={addUserTo}
          users={users.filter((u) => !addUserTo.users.some((m) => m.id === u.id))}
          onClose={() => setAddUserTo(null)}
          onDone={() => { setAddUserTo(null); load(); }}
        />
      )}
      {resetUser && <ResetModal user={resetUser} onClose={() => setResetUser(null)} />}
      {dialog}
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
        <label>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sun & Moon Album" required autoFocus /></label>
        <label>Theme</label>
        <div className="mode-grid">
          {Object.entries(MODES).map(([key, v]) => (
            <button type="button" key={key} className={`mode-card m-${key} ${mode === key ? 'active' : ''}`} onClick={() => setMode(key)}>
              <span className="mode-icon">{v.icon}</span>
              <strong>{v.label}</strong>
              <span className="muted small">up to {v.limit} member{v.limit > 1 ? 's' : ''}</span>
            </button>
          ))}
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn primary block">Create space</button>
      </form>
    </Modal>
  );
}

function AddMemberModal({ space, users, onClose, onDone }) {
  const [tab, setTab] = useState(users.length ? 'existing' : 'new');
  const [userId, setUserId] = useState('');
  const [f, setF] = useState({ display_name: '', username: '', password: '' });
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const body = tab === 'existing' ? { user_id: userId } : f;
      await api(`/api/admin/spaces/${space.id}/users`, { method: 'POST', body });
      onDone();
    } catch (err) { setError(err.message); }
  }

  return (
    <Modal title={`Add member to ${space.name}`} onClose={onClose}>
      <div className="seg">
        <button type="button" className={tab === 'existing' ? 'active' : ''} onClick={() => setTab('existing')} disabled={!users.length}>Existing login</button>
        <button type="button" className={tab === 'new' ? 'active' : ''} onClick={() => setTab('new')}>New login</button>
      </div>
      <form onSubmit={submit} className="form">
        {tab === 'existing' ? (
          <>
            <p className="muted small">Give someone who already has a login access to this space too. They can switch between their spaces after signing in.</p>
            <div className="pick-list">
              {users.map((u) => (
                <button type="button" key={u.id} className={`pick ${userId === u.id ? 'active' : ''}`} onClick={() => setUserId(u.id)}>
                  <span className="avatar">{u.display_name.slice(0, 1).toUpperCase()}</span>
                  <span className="grow">
                    <strong>{u.display_name}</strong> <span className="muted small">@{u.username}</span>
                    <span className="muted small block-line">{u.spaces.map((s) => s.name).join(', ') || 'Not in any space'}</span>
                  </span>
                  <span className="radio" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <label>Display name<input value={f.display_name} onChange={set('display_name')} placeholder="e.g. Shirleen" required /></label>
            <label>Username (for login)<input value={f.username} onChange={set('username')} autoCapitalize="none" required /></label>
            <label>Password<input value={f.password} onChange={set('password')} minLength={6} required /></label>
          </>
        )}
        {error && <p className="error">{error}</p>}
        <button className="btn primary block" disabled={tab === 'existing' && !userId}>Add to space</button>
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
    <Modal title={`Reset password · @${user.username}`} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>New password<input value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required autoFocus /></label>
        {msg && <p className="muted">{msg}</p>}
        <button className="btn primary block">Save</button>
      </form>
    </Modal>
  );
}
