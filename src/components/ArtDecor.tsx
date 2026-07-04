/**
 * Abstract, painterly SVG art used in place of real photography.
 * No stock or generated photos — soft bokeh, grain, and line-art motifs
 * that read as "wedding photo" without depicting anyone specific.
 * Every instance needs a unique `id` (filter/gradient ids aren't scoped by React).
 */

/** Ambient background glow — sits behind the landing hero section. */
export function HeroGlow({ id, className }: { id: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 700"
      className={className}
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id={`${id}-a`} cx="30%" cy="20%" r="55%">
          <stop offset="0%" stopColor="#c9a876" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#c9a876" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-b`} cx="78%" cy="35%" r="45%">
          <stop offset="0%" stopColor="#a9c6e0" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#a9c6e0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-c`} cx="55%" cy="85%" r="40%">
          <stop offset="0%" stopColor="#8a6f8f" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#8a6f8f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="700" fill={`url(#${id}-a)`} />
      <rect width="1200" height="700" fill={`url(#${id}-b)`} />
      <rect width="1200" height="700" fill={`url(#${id}-c)`} />
    </svg>
  );
}

/**
 * Candid-photo stand-in: soft blurred silhouette shapes with warm rim light,
 * framed for the phone mockup screen (9:19).
 */
export function PhotoArt({
  id,
  className,
  style,
}: {
  id: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 300 633"
      className={className}
      style={style}
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a3226" />
          <stop offset="45%" stopColor="#221d1a" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </linearGradient>
        <radialGradient id={`${id}-sun`} cx="50%" cy="30%" r="35%">
          <stop offset="0%" stopColor="#e8c88a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#e8c88a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e8c88a" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#e8c88a" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      <rect width="300" height="633" fill={`url(#${id}-sky)`} />
      <rect width="300" height="633" fill={`url(#${id}-sun)`} />

      {/* two blurred figures, suggested rather than depicted */}
      <g filter={`url(#${id}-soft)`}>
        <ellipse cx="120" cy="430" rx="46" ry="130" fill="#141210" opacity="0.88" />
        <ellipse cx="185" cy="440" rx="42" ry="120" fill="#181513" opacity="0.85" />
        <circle cx="118" cy="300" r="26" fill="#131110" opacity="0.9" />
        <circle cx="188" cy="312" r="24" fill="#161311" opacity="0.88" />
      </g>

      {/* warm rim light along the silhouettes */}
      <g filter={`url(#${id}-soft)`} opacity="0.7">
        <ellipse cx="96" cy="420" rx="10" ry="120" fill={`url(#${id}-rim)`} />
      </g>

      {/* floating bokeh dots */}
      <g filter={`url(#${id}-soft)`}>
        <circle cx="60" cy="120" r="14" fill="#e8c88a" opacity="0.35" />
        <circle cx="245" cy="180" r="20" fill="#a9c6e0" opacity="0.22" />
        <circle cx="230" cy="90" r="9" fill="#e8c88a" opacity="0.3" />
        <circle cx="40" cy="240" r="7" fill="#e8c88a" opacity="0.25" />
      </g>

      {/* vignette */}
      <rect width="300" height="633" fill="black" opacity="0.12" />
    </svg>
  );
}

/** Thin-line wedding rings, used as a decorative flourish (not a UI icon). */
export function RingsMotif({ id, size = 56, className }: { id: string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size * 0.62}
      viewBox="0 0 90 56"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8c88a" />
          <stop offset="100%" stopColor="#a9c6e0" />
        </linearGradient>
      </defs>
      <circle cx="34" cy="30" r="21" fill="none" stroke={`url(#${id}-ring)`} strokeWidth="1.6" opacity="0.85" />
      <circle cx="56" cy="30" r="21" fill="none" stroke={`url(#${id}-ring)`} strokeWidth="1.6" opacity="0.85" />
    </svg>
  );
}

/** Thin line-art floral sprig, for section dividers. */
export function FloralSprig({ className }: { className?: string }) {
  return (
    <svg
      width="120"
      height="28"
      viewBox="0 0 120 28"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
    >
      <path d="M0 14 H44" opacity="0.5" />
      <path d="M76 14 H120" opacity="0.5" />
      <path d="M60 14 C 60 6, 52 3, 47 8 C 52 10, 56 13, 60 14 Z" />
      <path d="M60 14 C 60 6, 68 3, 73 8 C 68 10, 64 13, 60 14 Z" />
      <path d="M60 14 C 60 22, 52 25, 47 20 C 52 18, 56 15, 60 14 Z" />
      <path d="M60 14 C 60 22, 68 25, 73 20 C 68 18, 64 15, 60 14 Z" />
      <circle cx="60" cy="14" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}
