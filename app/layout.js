import './globals.css';

export const metadata = {
  title: 'Photo Album',
  description: 'Private photo albums for individuals, couples and families',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
