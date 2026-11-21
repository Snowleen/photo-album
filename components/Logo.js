// Brand mark: two overlapping photo frames with a heart.
export default function Logo({ size = 44, heart = '#e0527f' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <rect x="4" y="10" width="28" height="30" rx="6" transform="rotate(-8 4 10)" fill="currentColor" opacity="0.4" />
      <rect x="14" y="7" width="28" height="32" rx="6" fill="currentColor" />
      <path
        d="M28 30.5s-7-4.3-7-9.1c0-2.3 1.7-4 3.8-4 1.4 0 2.6.8 3.2 1.9.6-1.1 1.8-1.9 3.2-1.9 2.1 0 3.8 1.7 3.8 4 0 4.8-7 9.1-7 9.1z"
        fill={heart}
      />
    </svg>
  );
}
