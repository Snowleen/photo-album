// Makes the site installable as an app (home-screen icon, opens full-screen).
export default function manifest() {
  return {
    name: 'ME-mory',
    short_name: 'ME-mory',
    description: 'Free private photo album for couples, families and pets.',
    categories: ['photo', 'lifestyle', 'social'],
    lang: 'en',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#e0527f',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
