import { getTranslations } from "next-intl/server";
import { getEventBySlug } from "@/lib/events";
import { isRevealed, toPublicEvent } from "@/lib/types";
import GuestGallery from "@/components/guest/GuestGallery";

export const dynamic = "force-dynamic";

export default async function GuestGalleryPage(ctx: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await ctx.params;
  const event = await getEventBySlug(slug);

  // Ended events keep their gallery: the reveal often happens after the
  // night is over. Only a missing event is a dead end.
  if (!event) {
    const tc = await getTranslations("common");
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="font-display text-2xl text-ink-2">Kormem</span>
        <h1 className="font-display text-3xl">{tc("notFound")}</h1>
        <p className="text-ink-2">{tc("notFoundHint")}</p>
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
