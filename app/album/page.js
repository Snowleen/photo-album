'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, uploadPhoto, fmtDate, daysLeft } from '@/lib/client';
import { exportImage, exportPdf } from '@/lib/exporter';
import Modal from '@/components/Modal';
import ThemeDecor from '@/components/ThemeDecor';
import { useDialog } from '@/components/useDialog';
import { MaintenanceWatcher } from '@/components/MaintenanceNotice';
import { ModeIcon, ImageIcon, AlbumsIcon, TrashIcon, ArrowLeftIcon, CheckIcon, RestoreIcon, DownloadIcon, MoveIcon, PlusIcon, SwitchIcon } from '@/components/Icons';

const PHOTO_SORTS = [
  { key: 'uploaded_desc', label: 'Newest uploaded' },
  { key: 'uploaded_asc', label: 'Oldest uploaded' },
  { key: 'taken_desc', label: 'Date taken (newest)' },
  { key: 'taken_asc', label: 'Date taken (oldest)' },
  { key: 'name_asc', label: 'Name (A–Z)' },
  { key: 'name_desc', label: 'Name (Z–A)' },
];
const ALBUM_SORTS = [
  { key: 'created_desc', label: 'Newest first' },
  { key: 'created_asc', label: 'Oldest first' },
  { key: 'name_asc', label: 'Name (A–Z)' },
  { key: 'name_desc', label: 'Name (Z–A)' },
];
const byText = (a, b) => (a || '').localeCompare(b || '', undefined, { sensitivity: 'base', numeric: true });
const takenDate = (p) => p.capture_date || (p.uploaded_at || '').slice(0, 10);

function sortPhotos(list, key) {
  const out = [...list];
  const cmp = {
    uploaded_desc: (a, b) => b.uploaded_at.localeCompare(a.uploaded_at),
    uploaded_asc: (a, b) => a.uploaded_at.localeCompare(b.uploaded_at),
    taken_desc: (a, b) => takenDate(b).localeCompare(takenDate(a)) || b.uploaded_at.localeCompare(a.uploaded_at),
    taken_asc: (a, b) => takenDate(a).localeCompare(takenDate(b)) || a.uploaded_at.localeCompare(b.uploaded_at),
    name_asc: (a, b) => byText(a.original_name, b.original_name),
    name_desc: (a, b) => byText(b.original_name, a.original_name),
  }[key];
  return cmp ? out.sort(cmp) : out;
}
function sortAlbums(list, key) {
  const out = [...list];
  const cmp = {
    created_desc: (a, b) => b.created_at.localeCompare(a.created_at),
    created_asc: (a, b) => a.created_at.localeCompare(b.created_at),
    name_asc: (a, b) => byText(a.name, b.name),
    name_desc: (a, b) => byText(b.name, a.name),
  }[key];
  return cmp ? out.sort(cmp) : out;
}

/** Remembers a choice on this device. */
function useStoredState(storageKey, initial) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    try { const v = localStorage.getItem(storageKey); if (v) setValue(v); } catch {}
  }, [storageKey]);
  const set = (v) => { setValue(v); try { localStorage.setItem(storageKey, v); } catch {} };
  return [value, set];
}

function SortSelect({ value, onChange, options }) {
  return (
    <label className="sort-select">
      <span>Sort</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Sort">
        {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
      </select>
    </label>
  );
}

const MODE_LABEL = { individual: 'Individual', couple: 'Couple', family: 'Family', pet: 'Pet' };

export default function AlbumPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState('photos'); // photos | albums | bin
  const [openAlbum, setOpenAlbum] = useState(null);
  const [photos, setPhotos] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [photoSort, setPhotoSort] = useStoredState('pa_photo_sort', 'uploaded_desc');
  const [albumSort, setAlbumSort] = useStoredState('pa_album_sort', 'created_desc');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [detail, setDetail] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [exportList, setExportList] = useState(null);
  const [showMove, setShowMove] = useState(false);
  const [toast, setToast] = useState('');
  const [showSwitch, setShowSwitch] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [dialog, ask] = useDialog();

  const notify = (m) => { setToast(m); setTimeout(() => setToast(''), 2800); };
  const handleErr = useCallback((e) => {
    if (e.status === 401) router.replace('/login');
    else notify(e.message);
  }, [router]);

  useEffect(() => {
    api('/api/auth/me')
      .then((d) => (d.role === 'superadmin' ? router.replace('/admin') : setMe(d)))
      .catch(() => router.replace('/login'));
  }, [router]);

  const loadAlbums = useCallback(() => api('/api/albums').then((d) => setAlbums(d.albums)).catch(handleErr), [handleErr]);

  const loadPhotos = useCallback(async () => {
    const url = tab === 'bin' ? '/api/photos?view=bin' : openAlbum ? `/api/photos?album=${openAlbum.id}` : '/api/photos';
    try { setPhotos((await api(url)).photos); } catch (e) { handleErr(e); }
  }, [tab, openAlbum, handleErr]);

  const refresh = useCallback(() => Promise.all([loadPhotos(), loadAlbums()]), [loadPhotos, loadAlbums]);

  useEffect(() => { if (me) loadAlbums(); }, [me, loadAlbums]);
  useEffect(() => {
    if (!me || (tab === 'albums' && !openAlbum)) return;
    setPhotos(null);
    loadPhotos();
  }, [me, tab, openAlbum, loadPhotos]);

  function switchTab(t) {
    setTab(t);
    setOpenAlbum(null);
    exitSelect();
  }
  function exitSelect() {
    setSelectMode(false);
    setSelected(new Set());
  }
  function toggle(id) {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  }
  const sortedPhotos = useMemo(() => sortPhotos(photos || [], photoSort), [photos, photoSort]);
  const sortedAlbums = useMemo(() => sortAlbums(albums, albumSort), [albums, albumSort]);
  // keep the on-screen order for exports (e.g. PDF page order)
  const selectedPhotos = useMemo(() => sortedPhotos.filter((p) => selected.has(p.id)), [sortedPhotos, selected]);

  async function bulk(action, extra = {}) {
    try {
      await api('/api/photos/bulk', { method: 'POST', body: { action, ids: [...selected], ...extra } });
      exitSelect();
      await refresh();
    } catch (e) { handleErr(e); }
  }

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  if (!me) return <div className="center muted">Loading…</div>;
  const mode = me.space.mode;
  const inBin = tab === 'bin';
  const showGrid = tab !== 'albums' || openAlbum;

  return (
    <div className="app" data-theme={mode}>
      <ThemeDecor mode={mode} />
      <header className="topbar">
        <button
          className={`brand brand-btn ${me.spaces.length > 1 ? 'can-switch' : ''}`}
          onClick={() => me.spaces.length > 1 && setShowSwitch(true)}
          title={me.spaces.length > 1 ? 'Switch album space' : undefined}
        >
          <ModeIcon mode={mode} size={20} className="brand-icon" /><span>{me.space.name}</span>
          {me.spaces.length > 1 && <span className="caret"><SwitchIcon size={14} /></span>}
        </button>
        <button className="profile-btn" onClick={() => setShowProfile(true)} title="My profile">
          <span className="hide-sm">{me.user.display_name}</span>
          <span className="avatar sm">{(me.user.display_name || '?').slice(0, 1).toUpperCase()}</span>
        </button>
      </header>

      <MaintenanceWatcher />
      <nav className="tabs">
        <button className={tab === 'photos' ? 'active' : ''} onClick={() => switchTab('photos')}><ImageIcon size={17} /> Photos</button>
        <button className={tab === 'albums' ? 'active' : ''} onClick={() => switchTab('albums')}><AlbumsIcon size={17} /> Albums</button>
        <button className={tab === 'bin' ? 'active' : ''} onClick={() => switchTab('bin')}><TrashIcon size={17} /> Recycle bin</button>
      </nav>

      <main className="container">
        {/* Toolbar */}
        <div className="row-between toolbar">
          <div className="row gap">
            {openAlbum && <button className="btn small" onClick={() => { setOpenAlbum(null); exitSelect(); }}><ArrowLeftIcon size={15} /> Albums</button>}
            <h2>{inBin ? 'Recycle bin' : openAlbum ? openAlbum.name : tab === 'albums' ? 'Albums' : 'All photos'}</h2>
          </div>
          <div className="row gap wrap">
            {tab === 'albums' && !openAlbum && <button className="btn primary" onClick={async () => {
              const name = await ask.prompt({ title: 'New album', label: 'Album name', placeholder: 'e.g. Honeymoon in Bali', confirmText: 'Create' });
              if (name) { try { await api('/api/albums', { method: 'POST', body: { name } }); loadAlbums(); } catch (e) { handleErr(e); } }
            }}>+ New album</button>}
            {openAlbum && (
              <>
                <button className="btn small" onClick={async () => {
                  const name = await ask.prompt({ title: 'Rename album', label: 'Album name', defaultValue: openAlbum.name, confirmText: 'Rename' });
                  if (name) { try { await api(`/api/albums/${openAlbum.id}`, { method: 'PATCH', body: { name } }); setOpenAlbum({ ...openAlbum, name }); loadAlbums(); } catch (e) { handleErr(e); } }
                }}>Rename</button>
                <button className="btn small danger" onClick={async () => {
                  if (!(await ask.confirm({ title: `Delete album “${openAlbum.name}”?`, message: 'The photos inside are kept — they just won’t be in this album any more.', confirmText: 'Delete album', danger: true }))) return;
                  try { await api(`/api/albums/${openAlbum.id}`, { method: 'DELETE' }); setOpenAlbum(null); loadAlbums(); } catch (e) { handleErr(e); }
                }}>Delete album</button>
              </>
            )}
            {showGrid && photos?.length > 0 && (
              <button className="btn small" onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}>
                {selectMode ? 'Cancel' : 'Select'}
              </button>
            )}
            {inBin && !selectMode && photos?.length > 0 && (
              <button className="btn small danger" onClick={async () => {
                if (!(await ask.confirm({ title: 'Empty recycle bin?', message: `All ${photos.length} photo(s) in the bin will be permanently deleted. This cannot be undone.`, confirmText: 'Empty bin', danger: true }))) return;
                try { await api('/api/photos/bulk', { method: 'POST', body: { action: 'emptyBin' } }); refresh(); } catch (e) { handleErr(e); }
              }}>Empty bin</button>
            )}
          </div>
        </div>

        {inBin && <p className="muted small note">Photos here are permanently deleted automatically 30 days after being deleted. Restore them before then to keep them.</p>}

        {/* Albums list */}
        {tab === 'albums' && !openAlbum && (
          albums.length === 0 ? <p className="muted empty">No albums yet. Create one to organise your photos.</p> : (
            <>
            <div className="list-bar">
              <span className="muted small">{albums.length} album{albums.length === 1 ? '' : 's'}</span>
              <SortSelect value={albumSort} onChange={setAlbumSort} options={ALBUM_SORTS} />
            </div>
            <div className="album-grid">
              {sortedAlbums.map((a) => (
                <button key={a.id} className="album-card" onClick={() => setOpenAlbum(a)}>
                  <div className="album-cover">{a.cover ? <img src={a.cover} alt="" loading="lazy" /> : <ModeIcon mode={mode} size={34} />}</div>
                  <div className="album-name">{a.name}</div>
                  <div className="muted small">{a.count} photo{a.count === 1 ? '' : 's'}</div>
                </button>
              ))}
            </div>
            </>
          )
        )}

        {/* Photo grid */}
        {showGrid && (
          !photos ? <p className="muted">Loading…</p> :
          photos.length === 0 ? <p className="muted empty">{inBin ? 'Recycle bin is empty.' : 'No photos yet. Tap “Upload” to add some!'}</p> : (
            <>
              <div className="list-bar">
                {selectMode ? (
                  <div className="row gap select-info">
                    <span>{selected.size} selected</span>
                    <button className="link" onClick={() => setSelected(new Set(selected.size === photos.length ? [] : photos.map((p) => p.id)))}>
                      {selected.size === photos.length ? 'Clear all' : 'Select all'}
                    </button>
                  </div>
                ) : (
                  <span className="muted small">{photos.length} photo{photos.length === 1 ? '' : 's'}</span>
                )}
                <SortSelect value={photoSort} onChange={setPhotoSort} options={PHOTO_SORTS} />
              </div>
              <div className="photo-grid">
                {sortedPhotos.map((p) => (
                  <button
                    key={p.id}
                    className={`photo-tile ${selected.has(p.id) ? 'selected' : ''}`}
                    onClick={() => (selectMode ? toggle(p.id) : setDetail(p))}
                  >
                    {p.url ? <img src={p.url} alt={p.remark || ''} loading="lazy" /> : <span className="muted">missing</span>}
                    {selectMode && <span className="check">{selected.has(p.id) && <CheckIcon size={15} />}</span>}
                    <span className="tile-label">
                      {inBin ? `${daysLeft(p.deleted_at)} days left` : fmtDate(p.capture_date || p.uploaded_at)}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )
        )}
      </main>

      {/* Bottom bar: upload or bulk actions */}
      {selectMode ? (
        <div className="bottom-bar">
          {inBin ? (
            <>
              <button className="btn" disabled={!selected.size} onClick={() => bulk('restore')}><RestoreIcon size={17} /> Restore</button>
              <button className="btn danger" disabled={!selected.size} onClick={async () => (await ask.confirm({ title: `Delete ${selected.size} photo(s) forever?`, message: 'They will be permanently deleted and cannot be recovered.', confirmText: 'Delete forever', danger: true })) && bulk('purge')}>Delete forever</button>
            </>
          ) : (
            <>
              <button className="btn" disabled={!selected.size} onClick={() => setExportList(selectedPhotos)}><DownloadIcon size={17} /> Export</button>
              <button className="btn" disabled={!selected.size} onClick={() => setShowMove(true)}><MoveIcon size={17} /> Move</button>
              <button className="btn danger" disabled={!selected.size} onClick={async () => (await ask.confirm({ title: `Delete ${selected.size} photo(s)?`, message: 'They will be moved to the recycle bin. You can restore them within 30 days.', confirmText: 'Move to bin', danger: true })) && bulk('delete')}><TrashIcon size={17} /> Delete</button>
            </>
          )}
        </div>
      ) : (
        !inBin && <button className="fab" onClick={() => setShowUpload(true)}><PlusIcon size={20} /> Upload</button>
      )}

      {showUpload && (
        <UploadModal
          albums={albums}
          defaultAlbum={openAlbum?.id || ''}
          onClose={() => setShowUpload(false)}
          onDone={(n) => { setShowUpload(false); notify(`${n} photo(s) uploaded`); refresh(); }}
        />
      )}
      {detail && (
        <PhotoModal
          photo={detail}
          albums={albums}
          inBin={inBin}
          onClose={() => setDetail(null)}
          onExport={() => setExportList([detail])}
          onChanged={(msg) => { setDetail(null); if (msg) notify(msg); refresh(); }}
          onError={handleErr}
          ask={ask}
        />
      )}
      {exportList && (
        <ExportModal
          photos={exportList}
          title={openAlbum?.name || me.space.name}
          onClose={() => setExportList(null)}
          onDone={() => { setExportList(null); exitSelect(); }}
        />
      )}
      {showMove && (
        <Modal title={`Move ${selected.size} photo(s) to album`} onClose={() => setShowMove(false)}>
          <div className="stack">
            {albums.map((a) => (
              <button key={a.id} className="btn block" onClick={() => { setShowMove(false); bulk('move', { album_id: a.id }); }}><AlbumsIcon size={16} /> {a.name}</button>
            ))}
            <button className="btn block ghost" onClick={() => { setShowMove(false); bulk('move', { album_id: null }); }}>Remove from album</button>
            {albums.length === 0 && <p className="muted small">No albums yet — create one in the Albums tab.</p>}
          </div>
        </Modal>
      )}
      {showSwitch && (
        <Modal title="Switch album space" onClose={() => setShowSwitch(false)}>
          <div className="stack">
            {me.spaces.map((s) => (
              <button
                key={s.id}
                className={`space-pick sp-${s.mode} ${s.id === me.space.id ? 'active' : ''}`}
                onClick={async () => {
                  if (s.id === me.space.id) return setShowSwitch(false);
                  try { await api('/api/auth/switch', { method: 'POST', body: { space_id: s.id } }); window.location.reload(); } catch (e) { handleErr(e); }
                }}
              >
                <span className="space-pick-icon"><ModeIcon mode={s.mode} size={22} /></span>
                <span className="grow">
                  <strong>{s.name}</strong>
                  <span className="muted small block-line">{MODE_LABEL[s.mode]} album</span>
                </span>
                {s.id === me.space.id && <span className="current">Current</span>}
              </button>
            ))}
          </div>
        </Modal>
      )}
      {showProfile && (
        <ProfileModal
          user={me.user}
          onClose={() => setShowProfile(false)}
          onSaved={(display_name) => { setMe({ ...me, user: { ...me.user, display_name } }); notify('Profile saved'); }}
          onLogout={logout}
        />
      )}
      {dialog}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function AlbumSelect({ albums, value, onChange }) {
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">— No album —</option>
      {albums.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
    </select>
  );
}

function UploadModal({ albums, defaultAlbum, onClose, onDone }) {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [captureDate, setCaptureDate] = useState('');
  const [remark, setRemark] = useState('');
  const [albumId, setAlbumId] = useState(defaultAlbum);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [files]);

  async function submit(e) {
    e.preventDefault();
    if (!files.length) return setError('Choose at least one photo');
    setError('');
    let done = 0;
    for (const f of files) {
      setProgress(`Uploading ${done + 1} of ${files.length}…`);
      try {
        await uploadPhoto(f, { capture_date: captureDate || null, remark: remark || null, album_id: albumId || null });
        done++;
      } catch (err) {
        setError(`${f.name}: ${err.message}`);
        setProgress('');
        return;
      }
    }
    onDone(done);
  }

  return (
    <Modal title="Upload photos" onClose={() => !progress && onClose()}>
      <form className="form" onSubmit={submit}>
        <label className="file-drop">
          <input type="file" accept="image/*" multiple onChange={(e) => setFiles([...e.target.files].filter((f) => f.type.startsWith('image/')))} />
          {files.length ? `${files.length} photo(s) chosen — tap to change` : 'Tap to choose photos'}
        </label>
        {previews.length > 0 && (
          <div className="preview-strip">{previews.map((u, i) => <img key={i} src={u} alt="" />)}</div>
        )}
        <label>Capture date <span className="muted small">(optional)</span>
          <input type="date" value={captureDate} onChange={(e) => setCaptureDate(e.target.value)} />
        </label>
        <label>Remark <span className="muted small">(optional)</span>
          <textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="A little note about this moment…" />
        </label>
        <label>Album<AlbumSelect albums={albums} value={albumId} onChange={setAlbumId} /></label>
        <p className="muted small">Upload date is recorded automatically.</p>
        {error && <p className="error">{error}</p>}
        <button className="btn primary block" disabled={!!progress}>{progress || 'Upload'}</button>
      </form>
    </Modal>
  );
}

function PhotoModal({ photo, albums, inBin, onClose, onExport, onChanged, onError, ask }) {
  const [captureDate, setCaptureDate] = useState(photo.capture_date || '');
  const [remark, setRemark] = useState(photo.remark || '');
  const [albumId, setAlbumId] = useState(photo.album_id || '');
  const [busy, setBusy] = useState(false);

  async function act(fn, msg) {
    setBusy(true);
    try { await fn(); onChanged(msg); } catch (e) { setBusy(false); onError(e); }
  }

  return (
    <Modal title={photo.original_name || 'Photo'} onClose={onClose} wide>
      <div className="photo-detail">
        <div className="photo-view">{photo.url && <img src={photo.url} alt={photo.remark || ''} />}</div>
        <div className="form">
          <div className="meta">
            <div><span className="muted">Uploaded:</span> {fmtDate(photo.uploaded_at)}</div>
            {photo.uploader?.display_name && <div><span className="muted">By:</span> {photo.uploader.display_name}</div>}
            {inBin && <div className="error">Deleted · {daysLeft(photo.deleted_at)} days until permanent deletion</div>}
          </div>
          {inBin ? (
            <>
              {photo.capture_date && <div><span className="muted">Captured:</span> {fmtDate(photo.capture_date)}</div>}
              {photo.remark && <p>{photo.remark}</p>}
              <button className="btn primary block" disabled={busy} onClick={() => act(() => api(`/api/photos/${photo.id}`, { method: 'PATCH', body: { restore: true } }), 'Photo restored')}><RestoreIcon size={17} /> Restore</button>
              <button className="btn danger block" disabled={busy} onClick={async () => (await ask.confirm({ title: 'Delete this photo forever?', message: 'It will be permanently deleted and cannot be recovered.', confirmText: 'Delete forever', danger: true })) && act(() => api(`/api/photos/${photo.id}?force=1`, { method: 'DELETE' }), 'Photo permanently deleted')}>Delete forever</button>
            </>
          ) : (
            <>
              <label>Capture date <span className="muted small">(optional)</span>
                <input type="date" value={captureDate} onChange={(e) => setCaptureDate(e.target.value)} />
              </label>
              <label>Remark<textarea rows={3} value={remark} onChange={(e) => setRemark(e.target.value)} /></label>
              <label>Album<AlbumSelect albums={albums} value={albumId} onChange={setAlbumId} /></label>
              <button className="btn primary block" disabled={busy} onClick={() => act(() => api(`/api/photos/${photo.id}`, {
                method: 'PATCH', body: { capture_date: captureDate || null, remark, album_id: albumId || null },
              }), 'Saved')}>Save changes</button>
              <div className="row gap">
                <button className="btn grow" onClick={onExport}><DownloadIcon size={17} /> Export</button>
                <button className="btn danger grow" disabled={busy} onClick={async () => (await ask.confirm({ title: 'Delete this photo?', message: 'It will be moved to the recycle bin. You can restore it within 30 days.', confirmText: 'Move to bin', danger: true })) && act(() => api(`/api/photos/${photo.id}`, { method: 'DELETE' }), 'Moved to recycle bin')}><TrashIcon size={17} /> Delete</button>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ExportModal({ photos, title, onClose, onDone }) {
  const multi = photos.length > 1;
  const [fmt, setFmt] = useState(multi ? 'pdf' : 'jpg');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function go() {
    setBusy(true);
    setError('');
    try {
      if (fmt === 'pdf') await exportPdf(photos, title);
      else await exportImage(photos[0], fmt);
      onDone();
    } catch (e) {
      setError(e.message || 'Export failed');
      setBusy(false);
    }
  }

  const opts = [
    { key: 'jpg', label: 'JPG', desc: 'Smaller file, best for sharing' },
    { key: 'png', label: 'PNG', desc: 'Lossless quality' },
    { key: 'pdf', label: 'PDF', desc: multi ? `${photos.length} photos, one per page` : 'Photo with its details' },
  ];

  return (
    <Modal title={multi ? `Export ${photos.length} photos` : 'Export photo'} onClose={() => !busy && onClose()}>
      <div className="stack">
        {opts.map((o) => {
          const disabled = multi && o.key !== 'pdf';
          return (
            <button key={o.key} className={`option ${fmt === o.key ? 'active' : ''}`} disabled={disabled} onClick={() => setFmt(o.key)}>
              <strong>{o.label}</strong>
              <span className="muted small">{disabled ? 'Only for a single photo' : o.desc}</span>
            </button>
          );
        })}
        {error && <p className="error">{error}</p>}
        <button className="btn primary block" disabled={busy} onClick={go}>{busy ? 'Preparing…' : `Save as ${fmt.toUpperCase()}`}</button>
      </div>
    </Modal>
  );
}

function ProfileModal({ user, onClose, onSaved, onLogout }) {
  const [nickname, setNickname] = useState(user.display_name || '');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function saveNick(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      await api('/api/auth/profile', { method: 'PATCH', body: { display_name: nickname } });
      onSaved(nickname.trim());
      setMsg({ ok: true, text: 'Nickname saved' });
    } catch (err) { setMsg({ ok: false, text: err.message }); }
    setBusy(false);
  }
  async function savePw(e) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      await api('/api/auth/profile', { method: 'PATCH', body: { current_password: current, new_password: next } });
      setCurrent(''); setNext('');
      setMsg({ ok: true, text: 'Password changed' });
    } catch (err) { setMsg({ ok: false, text: err.message }); }
    setBusy(false);
  }

  return (
    <Modal title="My profile" onClose={onClose}>
      <div className="stack">
        <div className="profile-head">
          <span className="avatar lg">{(nickname || '?').slice(0, 1).toUpperCase()}</span>
          <div className="min0">
            <strong>{user.display_name}</strong>
            <div className="muted small ellipsis">{user.email}</div>
          </div>
        </div>
        <form className="form" onSubmit={saveNick}>
          <label>Nickname <span className="muted small">(shown to others in your albums)</span>
            <div className="copy-box">
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={40} required />
              <button className="btn primary" disabled={busy || !nickname.trim() || nickname.trim() === user.display_name}>Save</button>
            </div>
          </label>
        </form>
        <div className="divider" />
        <form className="form" onSubmit={savePw}>
          <strong>Change password</strong>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" autoComplete="current-password" />
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="New password (at least 8 characters)" autoComplete="new-password" />
          <button className="btn block" disabled={busy || !current || next.length < 8}>Change password</button>
        </form>
        {msg && <div className={msg.ok ? 'note-ok' : 'note-err'}>{msg.text}</div>}
        <div className="divider" />
        <button className="btn danger block" onClick={onLogout}>Log out</button>
      </div>
    </Modal>
  );
}
