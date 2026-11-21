import Link from 'next/link';
import './landing.css';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, FAQ } from '@/lib/site';
import Logo, { FullLogo } from '@/components/Logo';
import { InstallButton } from '@/components/Pwa';
import { HeartIcon, CloudIcon, PawIcon, UserIcon, AlbumsIcon, DownloadIcon, RestoreIcon, ImageIcon } from '@/components/Icons';

export const dynamic = 'force-dynamic';

const FEATURES = [
  { icon: HeartIcon, title: 'Shared albums for two', text: 'A couple space for you and your partner — both of you upload, both of you see every photo.' },
  { icon: CloudIcon, title: 'Family photo albums', text: 'Bring up to 10 family members into one private space and keep everyone’s photos together.' },
  { icon: PawIcon, title: 'Albums for your pets', text: 'A warm pet theme for the furry members of the family — every nap, zoomie and birthday.' },
  { icon: AlbumsIcon, title: 'Organise with albums, dates & notes', text: 'Group photos into albums, add the date each photo was taken and a note about the moment.' },
  { icon: DownloadIcon, title: 'Download as JPG, PNG or PDF', text: 'Save any photo to your device, or export many photos into one PDF — one photo per page.' },
  { icon: RestoreIcon, title: '30-day recycle bin', text: 'Deleted something by mistake? Restore it from the recycle bin within 30 days.' },
];

const THEMES = [
  { icon: UserIcon, name: 'Individual', note: 'Just for you', cls: 'individual' },
  { icon: HeartIcon, name: 'Couple', note: 'For two', cls: 'couple' },
  { icon: CloudIcon, name: 'Family', note: 'Up to 10 people', cls: 'family' },
  { icon: PawIcon, name: 'Pet', note: 'For furry friends', cls: 'pet' },
];

function JsonLd() {
  const data = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: SITE_NAME,
      alternateName: ['Memory', 'MEmory', 'ME-mory Photo Album', 'Memory Photo Album'],
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: 'PhotographyApplication',
      operatingSystem: 'Any (web browser), Android, iOS',
      browserRequirements: 'Requires a modern web browser',
      image: `${SITE_URL}/brand/memory-logo.png`,
      screenshot: `${SITE_URL}/og.png`,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      isAccessibleForFree: true,
      featureList: [
        'Free private online photo album',
        'Shared albums for couples (2 people)',
        'Family photo albums (up to 10 people)',
        'Pet photo albums',
        'Organise photos into albums',
        'Capture date and note on every photo',
        'Download photos as JPG or PNG',
        'Export one or many photos to PDF',
        '30-day recycle bin with restore',
        'Installable on phone home screen',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      alternateName: ['Memory', 'MEmory'],
      url: SITE_URL,
      inLanguage: 'en',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon-512.png`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export default async function Home({ searchParams }) {
  const s = await getSession();
  if (s?.role === 'superadmin') redirect('/admin');
  if (s?.role === 'user') redirect('/album');
  if (searchParams?.source === 'pwa') redirect('/login'); // opened from the installed app

  return (
    <div className="lp">
      <JsonLd />
      <header className="lp-nav">
        <Link href="/" className="lp-brand" aria-label="ME-mory home">
          <Logo size={38} /> <span className="brand-word">ME-mory</span>
        </Link>
        <nav className="lp-links" aria-label="Main">
          <a href="#features" className="hide-sm">Features</a>
          <a href="#faq" className="hide-sm">FAQ</a>
          <Link href="/login" className="top-btn">Sign in</Link>
          <Link href="/signup" className="top-btn solid">Sign up free</Link>
        </nav>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-text">
            <p className="lp-eyebrow">Free · Private · Made for the people you love</p>
            <h1>A free private photo album for couples, families &amp; pets</h1>
            <p className="lp-lead">
              <strong>ME-mory</strong> is a free online photo album where you keep your memories together — organised into albums,
              with the date and a little note on every photo, in a private space only your people can open.
            </p>
            <div className="lp-cta">
              <Link href="/signup" className="lp-btn primary">Get your free album</Link>
              <Link href="/login" className="lp-btn">Sign in</Link>
              <InstallButton className="lp-btn ghost" />
            </div>
          </div>
          <div className="lp-hero-art" aria-hidden>
            <div className="lp-logo-card"><FullLogo width={320} /></div>
            <div className="lp-floating f1"><HeartIcon size={18} /> Couple album</div>
            <div className="lp-floating f2"><CloudIcon size={18} /> Family album</div>
            <div className="lp-floating f3"><PawIcon size={18} /> Pet album</div>
          </div>
        </section>

        <section id="features" className="lp-section">
          <h2>Everything you need for your photo memories</h2>
          <p className="lp-sub">Simple enough for grandparents, lovely enough for your best moments.</p>
          <div className="lp-grid">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <article key={title} className="lp-card">
                <span className="lp-icon"><Icon size={22} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-section">
          <h2>A theme for every story</h2>
          <p className="lp-sub">Each album space has its own look — pick the one that fits.</p>
          <div className="lp-themes">
            {THEMES.map(({ icon: Icon, name, note, cls }) => (
              <div key={name} className={`lp-theme t-${cls}`}>
                <Icon size={26} />
                <strong>{name}</strong>
                <span>{note}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-section">
          <h2>How to start your free photo album</h2>
          <ol className="lp-steps">
            <li><span>1</span><div><h3>Request an account</h3><p>Tap “Sign up” and enter your name and email. It’s free.</p></div></li>
            <li><span>2</span><div><h3>Get approved</h3><p>Your sign-in details arrive by email once your request is approved.</p></div></li>
            <li><span>3</span><div><h3>Upload &amp; organise</h3><p>Add photos from your phone, sort them into albums and add notes to remember the moment.</p></div></li>
          </ol>
        </section>

        <section id="faq" className="lp-section">
          <h2>Frequently asked questions</h2>
          <div className="lp-faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary><h3>{f.q}</h3></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="lp-final">
          <ImageIcon size={30} />
          <h2>Keep every moment, beautifully</h2>
          <p>Start your free private photo album with ME-mory today.</p>
          <Link href="/signup" className="lp-btn primary light">Sign up free</Link>
        </section>
      </main>

      <footer className="lp-footer">
        <span>© {new Date().getFullYear()} ME-mory · Free private photo album</span>
        <nav aria-label="Footer">
          <Link href="/signup">Sign up</Link>
          <Link href="/login">Sign in</Link>
          <a href="#faq">FAQ</a>
        </nav>
      </footer>
    </div>
  );
}
