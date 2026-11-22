import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadSharedAlbum, findSharedAlbum } from '@/lib/share';
import SharedGallery from '@/components/SharedGallery';
import Logo from '@/components/Logo';
import { AlbumCover } from '@/components/CoverCropper';
import './shared.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const album = await findSharedAlbum(params.token);
  if (!album) return { title: 'Album not found', robots: { index: false, follow: false } };
  const title = `Click here to view photos in “${album.name}”`;
  const description = `${album.space?.name ? `From ${album.space.name} · ` : ''}shared with ME-mory, the free private photo album.`;
  const image = `/s/${params.token}/og`;
  return {
    title: album.name,
    description,
    robots: { index: false, follow: false }, // shared albums stay out of search engines
    alternates: { canonical: null },
    openGraph: { type: 'website', title, description, url: `/s/${params.token}`, images: [{ url: image, width: 1200, height: 630, alt: album.name }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function SharedAlbumPage({ params }) {
  const data = await loadSharedAlbum(params.token);
  if (!data) notFound();
  const { album, space, cover, photos } = data;
  const mode = space?.mode || 'couple';

  return (
    <div className={`shared s-${mode}`}>
      <header className="shared-hero">
        {cover && (
          <div className="shared-cover">
            <AlbumCover src={cover.url} crop={cover.crop} alt="" />
          </div>
        )}
        <div className="shared-title">
          <p className="shared-from">{space?.name ? `From ${space.name}` : 'Shared album'}</p>
          <h1>{album.name}</h1>
          <p className="shared-count">{photos.length} photo{photos.length === 1 ? '' : 's'}</p>
        </div>
      </header>

      <main className="shared-main">
        {photos.length ? <SharedGallery photos={photos} /> : <p className="shared-empty">This album has no photos yet.</p>}
      </main>

      <footer className="shared-footer">
        <Link href="/" className="shared-brand"><Logo size={30} /> <span className="brand-word">ME-mory</span></Link>
        <span>Keep your own memories in a free private photo album.</span>
        <Link href="/signup" className="shared-cta">Create yours free</Link>
      </footer>
    </div>
  );
}
