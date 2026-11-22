import { SITE_URL } from '@/lib/site';

// Public pages can be indexed; private app pages and the API cannot.
export default function robots() {
  return {
    rules: [
      { userAgent: '*', allow: ['/', '/signup', '/login', '/llms.txt'], disallow: ['/admin', '/album', '/api/', '/s/'] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
