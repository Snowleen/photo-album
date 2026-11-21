'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, uploadPhoto, fmtDate, daysLeft } from '@/lib/client';
import { exportImage, exportPdf } from '@/lib/exporter';
import Modal from '@/components/Modal';
import ThemeDecor from '@/components/ThemeDecor';

const THEME_ICON = { individual: '📷', couple: '💕', family: '☁️' };

export default function AlbumPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState('photos'); // photos | albums | bin
  const [openAlbum, setOpenAlbum] = useState(null);
  const [photos, setPhotos] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [detail, setDetail] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [exportList, setExportList] = useState(null);
  const [showMove, setShowMove] = useState(false);
  const [toast, setToast] = useState('');

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
  const selectedPhotos = useMemo(() => (photos || []).filter((p) => selected.has(p.id)), [photos, selected]);

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
        <div className="brand">{THEME_ICON[mode]} {me.space.name}</div>
        <div className="row gap">
          <span className="muted small hide-sm">Hi, {me.user.display_name}</span>
          <button className="btn ghost" onClick={logout}>Log out</button>
        </div>
      </header>

      <nav className="tabs">
        <button className={tab === 'photos' ? 'active' : ''} onClick={() => switchTab('photos')}>🖼️ Photos</button>
        <button className={tab === 'albums' ? 'active' : ''} onClick={() => switchTab('albums')}>📚 Albums</button>
        <button className={tab === 'bin' ? 'active' : ''} onClick={() => switchTab('bin')}>🗑️ Recycle bin</button>
      </nav>

      <main className="container">
        {/* Toolbar */}
        <div className="row-between toolbar">
          <div className="row gap">
            {openAlbum && <button className="btn small" onClick={() => { setOpenAlbum(null); exitSelect(); }}>← Albums</button>}
            <h2>{inBin ? 'Recycle bin' : openAlbum ? openAlbum.name : tab === 'albums' ? 'Albums' : 'All photos'}</h2>
          </div>
          <div className="row gap wrap">
            {tab === 'albums' && !openAlbum && <button className="btn primary" onClick={async () => {
              const name = prompt('New album name');
              if (name) { try { await api('/api/albums', { method: 'POST', body: { name } }); loadAlbums(); } catch (e) { handleErr(e); } }
            }}>+ New album</button>}
            {openAlbum && (
              <>
                <button className="btn small" onClick={async () => {
                  const name = prompt('Rename album', openAlbum.name);
                  if (name) { try { await api(`/api/albums/${openAlbum.id}`, { method: 'PATCH', body: { name } }); setOpenAlbum({ ...openAlbum, name }); loadAlbums(); } catch (e) { handleErr(e); } }
                }}>Rename</button>
                <button className="btn small danger" onClick={async () => {
                  if (!confirm(`Delete album "${openAlbum.name}"? Photos inside will be kept (just not in this album).`)) return;
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
                if (!confirm('Permanently delete everything in the recycle bin?')) return;
                try { await api('/api/photos/bulk', { method: 'POST', body: { action: 'emptyBin' } }); refresh(); } catch (e) { handleErr(e); }
              }}>Empty bin</button>
            )}
          </div>
        </div>

        {inBin && <p className="muted small note">Photos here are permanently deleted automatically 30 days after being deleted. Restore them before then to keep them.</p>}

        {/* Albums list */}
        {tab === 'albums' && !openAlbum && (
          albums.length === 0 ? <p className="muted empty">No albums yet. Create one to organise your photos.</p> : (
            <div className="album-grid">
              {albums.map((a) => (
                <button key={a.id} className="album-card" onClick={() => setOpenAlbum(a)}>
                  <div className="album-cover">{a.cover ? <img src={a.cover} alt="" loading="lazy" /> : <span>{THEME_ICON[mode]}</span>}</div>
                  <div className="album-name">{a.name}</div>
                  <div className="muted small">{a.count} photo{a.count === 1 ? '' : 's'}</div>
                </button>
              ))}
            </div>
          )
        )}

        {/* Photo grid */}
        {showGrid && (
          !photos ? <p className="muted">Loading…</p> :
          photos.length === 0 ? <p className="muted empty">{inBin ? 'Recycle bin is empty.' : 'No photos yet. Tap “Upload” to add some!'}</p> : (
            <>
              {selectMode && (
                <div className="row gap select-info">
                  <span>{selected.size} selected</span>
                  <button className="link" onClick={() => setSelected(new Set(selected.size === photos.length ? [] : photos.map((p) => p.id)))}>
                    {selected.size === photos.length ? 'Clear all' : 'Select all'}
                  </button>
                </div>
              )}
              <div className="photo-grid">
                {photos.map((p) => (
                  <button
                    key={p.id}
                    className={`photo-tile ${selected.has(p.id) ? 'selected' : ''}`}
                    onClick={() => (selectMode ? toggle(p.id) : setDetail(p))}
                  >
                    {p.url ? <img src={p.url} alt={p.remark || ''} loading="lazy" /> : <span className="muted">missing</span>}
                    {selectMode && <span className="check">{selected.has(p.id) ? '✓' : ''}</span>}
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
              <button className="btn" disabled={!selected.size} onClick={() => bulk('restore')}>♻️ Restore</button>
              <button className="btn danger" disabled={!selected.size} onClick={() => confirm(`Permanently delete ${selected.size} photo(s)?`) && bulk('purge')}>Delete forever</button>
            </>
          ) : (
            <>
              <button className="btn" disabled={!selected.size} onClick={() => setExportList(selectedPhotos)}>⬇️ Export</button>
              <button className="btn" disabled={!selected.size} onClick={() => setShowMove(true)}>📚 Move</button>
              <button className="btn danger" disabled={!selected.size} onClick={() => confirm(`Move ${selected.size} photo(s) to the recycle bin?`) && bulk('delete')}>🗑️ Delete</button>
            </>
          )}
        </div>
      ) : (
        !inBin && <button className="fab" onClick={() => setShowUpload(true)}>＋ Upload</button>
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
              <button key={a.id} className="btn block" onClick={() => { setShowMove(false); bulk('move', { album_id: a.id }); }}>📚 {a.name}</button>
            ))}
            <button className="btn block ghost" onClick={() => { setShowMove(false); bulk('move', { album_id: null }); }}>Remove from album</button>
            {albums.length === 0 && <p className="muted small">No albums yet — create one in the Albums tab.</p>}
          </div>
        </Modal>
      )}
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

function PhotoModal({ photo, albums, inBin, onClose, onExport, onChanged, onError }) {
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
              <button className="btn primary block" disabled={busy} onClick={() => act(() => api(`/api/photos/${photo.id}`, { method: 'PATCH', body: { restore: true } }), 'Photo restored')}>♻️ Restore</button>
              <button className="btn danger block" disabled={busy} onClick={() => confirm('Delete this photo forever? This cannot be undone.') && act(() => api(`/api/photos/${photo.id}?force=1`, { method: 'DELETE' }), 'Photo permanently deleted')}>Delete forever</button>
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
                <button className="btn grow" onClick={onExport}>⬇️ Export</button>
                <button className="btn danger grow" disabled={busy} onClick={() => confirm('Move this photo to the recycle bin?') && act(() => api(`/api/photos/${photo.id}`, { method: 'DELETE' }), 'Moved to recycle bin')}>🗑️ Delete</button>
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
