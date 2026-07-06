"use client";

/**
 * Chrome fires `beforeinstallprompt` at most once per document, often long
 * before any React component mounts, and never again after client-side
 * navigation. Capture it at module-evaluation time (this module is pulled
 * in by the guest layout's PwaRegister, so it loads on every /e/* route)
 * and hand it to whoever asks later.
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let captured: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(e: BeforeInstallPromptEvent) => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    captured = e as BeforeInstallPromptEvent;
    listeners.forEach((fn) => fn(captured!));
  });
}

/** Subscribe to the install prompt; fires immediately if already captured. */
export function onInstallPrompt(fn: (e: BeforeInstallPromptEvent) => void): () => void {
  if (captured) fn(captured);
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
