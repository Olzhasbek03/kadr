import { getTranslations } from "next-intl/server";
import { getEventBySlug } from "@/lib/events";
import { isRevealed, toPublicEvent } from "@/lib/types";
import GuestGallery from "@/components/guest/GuestGallery";
import { Mark } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function GuestGalleryPage(ctx: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await ctx.params;
  const event = await getEventBySlug(slug);

  if (!event || event.status !== "active") {
    const tc = await getTranslations("common");
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <Mark size={22} className="text-muted" />
        <h1 className="font-serif-display text-3xl">{tc("notFound")}</h1>
        <p className="text-muted">{tc("notFoundHint")}</p>
      </main>
    );
  }

  return (
    <GuestGallery
      event={toPublicEvent(event)}
      initiallyRevealed={isRevealed(event.reveal_at)}
    />
  );
}
