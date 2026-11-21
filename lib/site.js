// Public site details used for SEO (canonical links, sitemap, structured data).
// Set NEXT_PUBLIC_SITE_URL in Vercel if you move to a custom domain.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://photo-album-phi-six.vercel.app').replace(/\/+$/, '');
export const SITE_NAME = 'ME-mory';
export const SITE_TITLE = 'ME-mory – Free Private Photo Album for Couples, Families & Pets';
export const SITE_DESCRIPTION =
  'ME-mory is a free, private online photo album. Create shared albums with your partner, family or for your pets, add dates and notes to every memory, and download photos as JPG, PNG or PDF.';
export const SITE_KEYWORDS = [
  'ME-mory',
  'memory',
  'memory app',
  'free photo album',
  'free online photo album',
  'private photo album',
  'shared photo album',
  'couple photo album',
  'family photo album',
  'pet photo album',
  'digital photo album',
  'photo memories',
  'photo album app',
  'export photos to PDF',
];

/** Questions & answers shown on the home page and given to search/AI engines as FAQ data. */
export const FAQ = [
  {
    q: 'What is ME-mory?',
    a: 'ME-mory is a free, private online photo album. You keep your photos in a personal space, organise them into albums, and add the date the photo was taken and a short note so every memory keeps its story.',
  },
  {
    q: 'Is ME-mory free?',
    a: 'Yes. ME-mory is free to use. Request an account on the sign-up page and you can start uploading once it is approved.',
  },
  {
    q: 'Is my photo album private?',
    a: 'Yes. Albums are not public. Only the people who are members of your space can sign in and see its photos, and photo links expire after a few hours.',
  },
  {
    q: 'Can I share a photo album with my partner or family?',
    a: 'Yes. A space can be a couple album (2 people), a family album (up to 10 people), a pet album, or an individual album. Everyone in the space can upload and see the same photos, and each person can belong to several spaces and switch between them.',
  },
  {
    q: 'Can I download my photos as JPG, PNG or PDF?',
    a: 'Yes. Save any photo as JPG, PNG or PDF. Select several photos to export them together as one PDF, one photo per page with its date and note.',
  },
  {
    q: 'What happens when I delete a photo?',
    a: 'Deleted photos go to the Recycle bin first. You can restore them within 30 days; after 30 days they are deleted permanently. You can also delete them forever straight away.',
  },
  {
    q: 'Can I use ME-mory on my phone like an app?',
    a: 'Yes. Tap “Install app” on Android, or “Share → Add to Home Screen” on iPhone, to add ME-mory to your home screen. It opens full-screen like a normal app.',
  },
  {
    q: 'How do I get an account?',
    a: 'Tap “Sign up”, enter your name and email, and send the request. Once the administrator approves it, your sign-in details are emailed to you.',
  },
];
