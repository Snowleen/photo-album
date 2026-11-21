// Minimal line icons (24×24, stroke = currentColor). Used instead of emojis.
const Svg = ({ size = 18, children, fill = 'none', className = '', ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`icon ${className}`}
    aria-hidden
    {...rest}
  >
    {children}
  </svg>
);

export const UserIcon = (p) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></Svg>;
export const UsersIcon = (p) => <Svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.1.7 3.5 2.6 3.5 5.7" /></Svg>;
export const HeartIcon = (p) => <Svg {...p}><path d="M12 20s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.1a4.4 4.4 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z" /></Svg>;
export const CloudIcon = (p) => <Svg {...p}><path d="M7 18.5h10.5a4 4 0 0 0 .6-8 6 6 0 0 0-11.5 1.6A3.3 3.3 0 0 0 7 18.5z" /></Svg>;
export const PawIcon = (p) => (
  <Svg {...p}>
    <circle cx="6" cy="10" r="1.8" /><circle cx="9.7" cy="5.8" r="1.8" /><circle cx="14.3" cy="5.8" r="1.8" /><circle cx="18" cy="10" r="1.8" />
    <path d="M12 12c-2.6 0-5.2 3.7-5.2 5.8 0 1.4 1.1 2.1 2.5 2.1 1.1 0 1.7-.5 2.7-.5s1.6.5 2.7.5c1.4 0 2.5-.7 2.5-2.1 0-2.1-2.6-5.8-5.2-5.8z" />
  </Svg>
);
export const ImageIcon = (p) => <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="M21 16l-5-5-9 9" /></Svg>;
export const AlbumsIcon = (p) => <Svg {...p}><rect x="3" y="7" width="14" height="14" rx="2.5" /><path d="M7 3.5h11A2.5 2.5 0 0 1 20.5 6v11" /></Svg>;
export const TrashIcon = (p) => <Svg {...p}><path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13M10 11v5.5M14 11v5.5" /></Svg>;
export const DownloadIcon = (p) => <Svg {...p}><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14" /></Svg>;
export const MoveIcon = (p) => <Svg {...p}><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" /><path d="M10 13.5h6M13.5 11l2.5 2.5-2.5 2.5" /></Svg>;
export const RestoreIcon = (p) => <Svg {...p}><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.6" /><path d="M4 4v4.6h4.6" /></Svg>;
export const PlusIcon = (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const ArrowLeftIcon = (p) => <Svg {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></Svg>;
export const CheckIcon = (p) => <Svg {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
export const CloseIcon = (p) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>;
export const InboxIcon = (p) => <Svg {...p}><path d="M3 13.5 5.6 5.7A2.5 2.5 0 0 1 8 4h8a2.5 2.5 0 0 1 2.4 1.7L21 13.5V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M3 13.5h5l1.5 2.5h5l1.5-2.5h5" /></Svg>;
export const WrenchIcon = (p) => <Svg {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></Svg>;
export const SwitchIcon = (p) => <Svg {...p}><path d="M8 9l4-4 4 4M8 15l4 4 4-4" /></Svg>;

/** Icon for an album space's theme. */
export function ModeIcon({ mode, ...p }) {
  if (mode === 'couple') return <HeartIcon {...p} />;
  if (mode === 'family') return <CloudIcon {...p} />;
  if (mode === 'pet') return <PawIcon {...p} />;
  return <UserIcon {...p} />;
}
