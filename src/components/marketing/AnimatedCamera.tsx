"use client";

import { useEffect, useState } from "react";

/**
 * The Kormem mark, alive: a lens that breathes slowly and blinks its
 * aperture every few seconds — as if quietly taking a shot. A soft flash
 * ring accompanies each blink. Pure SVG + CSS; framerate-independent and
 * disabled entirely under prefers-reduced-motion.
 */
export default function AnimatedCamera({ size = 280 }: { size?: number }) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // The aperture-blink keyframe closes at ~92% of its 6s cycle; fire the
    // flash ring just after, on the same clock.
    const id = setInterval(() => {
      setFlash(true);
      setTimeout(() => setFlash(false), 450);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }} aria-hidden>
      {/* flash ring */}
      <div
        className={`absolute inset-0 rounded-full transition-opacity duration-500 ${
          flash ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background:
            "radial-gradient(circle, rgba(143,192,196,0.35) 30%, rgba(143,192,196,0) 70%)",
        }}
      />
      <svg viewBox="0 0 280 280" width={size} height={size} className="relative">
        {/* body plate */}
        <circle cx="140" cy="140" r="128" fill="var(--surface)" />
        {/* lens ring */}
        <circle
          className="lens-breathe"
          cx="140"
          cy="140"
          r="86"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="10"
          opacity="0.9"
        />
        {/* aperture */}
        <circle className="aperture-blink" cx="140" cy="140" r="48" fill="var(--accent)" />
        {/* glint */}
        <circle cx="160" cy="118" r="11" fill="var(--ivory)" opacity="0.85" />
        {/* viewfinder dot */}
        <circle cx="216" cy="70" r="9" fill="var(--ivory)" opacity="0.4" />
      </svg>
    </div>
  );
}
