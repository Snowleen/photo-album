'use client';

const Paw = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <ellipse cx="5.5" cy="9.5" rx="2.1" ry="2.7" transform="rotate(-20 5.5 9.5)" />
    <ellipse cx="9.6" cy="5.4" rx="2.1" ry="2.8" transform="rotate(-8 9.6 5.4)" />
    <ellipse cx="14.4" cy="5.4" rx="2.1" ry="2.8" transform="rotate(8 14.4 5.4)" />
    <ellipse cx="18.5" cy="9.5" rx="2.1" ry="2.7" transform="rotate(20 18.5 9.5)" />
    <path d="M12 11.2c-2.9 0-6 4.3-6 6.7 0 1.6 1.3 2.4 2.9 2.4 1.3 0 2-.6 3.1-.6s1.8.6 3.1.6c1.6 0 2.9-.8 2.9-2.4 0-2.4-3.1-6.7-6-6.7z" />
  </svg>
);

// Background decorations: hearts (couple), clouds (family), paw-print trail (pet).
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
  if (mode === 'pet') {
    // Two little walking trails that fade in step by step.
    const steps = 9;
    return (
      <div className="decor" aria-hidden>
        {[0, 1].map((t) =>
          Array.from({ length: steps }).map((_, i) => {
            const left = t === 0 ? 4 + i * 11 : 92 - i * 11;
            const top = t === 0 ? 80 - i * 7 + (i % 2) * 4 : 30 + i * 6 + (i % 2) * 4;
            return (
              <span
                key={`${t}-${i}`}
                className="paw"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  animationDelay: `${t * 4 + i * 0.5}s`,
                  transform: `rotate(${t === 0 ? 50 : -130}deg)`,
                }}
              >
                <Paw />
              </span>
            );
          })
        )}
      </div>
    );
  }
  return null;
}
