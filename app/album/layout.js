// Private area: keep it out of search engines.
export const metadata = { title: 'My album', robots: { index: false, follow: false } };

export default function Layout({ children }) {
  return children;
}
