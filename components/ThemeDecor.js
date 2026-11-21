'use client';

// Floating background decorations: hearts for couple mode, clouds for family mode.
export default function ThemeDecor({ mode }) {
  if (mode === 'couple') {
    return (
      <div className="decor" aria-hidden>
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="heart"
            style={{
              left: `${(i * 7.3) % 100}%`,
              animationDelay: `${(i * 1.7) % 12}s`,
              animationDuration: `${12 + (i % 5) * 3}s`,
              fontSize: `${14 + (i % 4) * 8}px`,
            }}
          >
            ♥
          </span>
        ))}
      </div>
    );
  }
  if (mode === 'family') {
    return (
      <div className="decor" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className="cloud"
            style={{
              top: `${8 + i * 15}%`,
              animationDelay: `${-i * 9}s`,
              animationDuration: `${50 + i * 8}s`,
              transform: `scale(${0.6 + (i % 3) * 0.3})`,
            }}
          />
        ))}
      </div>
    );
  }
  return null;
}
