import { NextResponse } from "next/server";
import { getEventBySlug } from "@/lib/events";

/**
 * Per-event web app manifest: "Add to Home Screen" from a guest page
 * installs an icon that opens straight into THIS event's camera, scoped so
 * the installed app never wanders into the host dashboard.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const event = await getEventBySlug(slug);
  if (!event) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      name: `${event.name} — Kormem`,
      short_name: "Kormem",
      description: "Shared event camera",
      id: `/e/${slug}`,
      start_url: `/e/${slug}/camera`,
      scope: `/e/${slug}`,
      display: "standalone",
      orientation: "portrait",
      background_color: "#F6F1EE",
      theme_color: "#F6F1EE",
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
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=3600",
      },
    }
  );
}
