import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const serif = Playfair_Display({ subsets: ['latin'], variable: '--font-serif', display: 'swap' });

export const metadata = {
  title: 'Photo Album',
  description: 'Private photo albums for individuals, couples and families',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f9e3ec',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
