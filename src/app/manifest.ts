import type { MetadataRoute } from "next";

/**
 * Root web manifest: makes korme.org itself installable ("Add to Home
 * Screen" produces a Kormem icon that opens the site). Guest event pages
 * override this with a per-event manifest (see /e/[slug]/manifest.webmanifest)
 * so an installed event icon opens straight into that event's camera.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kormem",
    short_name: "Kormem",
    description:
      "A shared camera for events. Guests join by QR, and everything appears in one live gallery.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf8f5",
    theme_color: "#faf8f5",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
