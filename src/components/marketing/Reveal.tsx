"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scroll-into-view reveal for landing sections, built so motion is purely
 * an enhancement: the server renders content VISIBLE (crawlers, previews,
 * print and no-JS all see the full page), and only after mount do we hide
 * elements that are still below the fold, releasing each one as it scrolls
 * into view. Reduced motion never hides anything.
 */
export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // "visible" is both the SSR default and the terminal state.
  const [state, setState] = useState<"visible" | "waiting">("visible");

  useEffect(() => {
    const el = ref.current;
    if (
      !el ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    // Only elements still comfortably below the fold get hidden; anything
    // already on screen must never blink out.
    if (el.getBoundingClientRect().top <= window.innerHeight * 0.9) return;

    setState("waiting");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("visible");
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal={state}
      className={className ? `reveal ${className}` : "reveal"}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
