// ME-mory brand mark (cloud + photos) on a white rounded tile.
// The artwork has a white background, so it always sits on white.
export default function Logo({ size = 44 }) {
  return (
    <span className="logo-tile" style={{ width: size, height: size }}>
      <img src="/brand/memory-mark.png" alt="" width={size} height={size} />
    </span>
  );
}

/** Full logo: mark + "ME-mory" wordmark. */
export function FullLogo({ width = 180 }) {
  return <img className="full-logo" src="/brand/memory-logo.png" alt="ME-mory" width={width} style={{ height: 'auto' }} />;
}

export const BRAND = 'ME-mory';
