// Minimal service worker: lets the app be installed, and shows a friendly page when offline.
// It does not cache photos or data — everything still comes live from the server.
const OFFLINE_HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline · ME-mory</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#fdf2f6;font-family:system-ui,sans-serif;color:#3b1d2a;text-align:center;padding:24px">
<div><h1 style="font-family:Georgia,serif;font-weight:600">You're offline</h1>
<p style="color:#8a6574">ME-mory needs an internet connection. Please reconnect and try again.</p>
<button onclick="location.reload()" style="margin-top:12px;border:0;background:#e0527f;color:#fff;font-weight:600;padding:12px 22px;border-radius:12px;font-size:15px">Try again</button></div>
</body></html>`;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return; // let everything else go straight to the network
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    )
  );
});
