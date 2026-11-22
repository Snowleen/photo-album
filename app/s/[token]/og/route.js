import { NextResponse } from 'next/server';
import { findSharedAlbum, shareImage } from '@/lib/share';

export const dynamic = 'force-dynamic';

// Link-preview picture for a shared album (cover + album name), shown by WhatsApp, Facebook, etc.
export async function GET(req, { params }) {
  const album = await findSharedAlbum(params.token);
  const bytes = album ? await shareImage(album) : null;
  if (!bytes) return NextResponse.redirect(new URL('/og.png', req.url));
  return new NextResponse(bytes, {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=600' },
  });
}
