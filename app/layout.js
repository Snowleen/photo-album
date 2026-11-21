import { Inter, Nunito, Playfair_Display } from 'next/font/google';
import { PwaRegister } from '@/components/Pwa';
import './globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const serif = Playfair_Display({ subsets: ['latin'], variable: '--font-serif', display: 'swap' });
const brand = Nunito({ subsets: ['latin'], weight: ['800'], variable: '--font-brand', display: 'swap' });

export const metadata = {
  title: 'ME-mory',
  description: 'ME-mory — private photo albums for you, your partner, your family and your pets.',
  applicationName: 'ME-mory',
  icons: {
    icon: [{ url: '/favicon-64.png', sizes: '64x64', type: 'image/png' }],
    apple: [{ url: '/apple-icon.png', sizes: '180x180' }],
  },
  appleWebApp: { capable: true, title: 'ME-mory', statusBarStyle: 'default' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f9e3ec',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${brand.variable}`}>
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
