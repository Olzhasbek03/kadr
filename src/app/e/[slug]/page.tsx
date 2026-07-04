import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getEventBySlug } from "@/lib/events";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DEVICE_COOKIE } from "@/lib/device";
import { isRevealed, toPublicEvent, type GuestRow } from "@/lib/types";
import GuestLanding from "@/components/guest/GuestLanding";
import { Mark } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function GuestPage(ctx: { params: Promise<{ slug: string }> }) {
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

  if (isRevealed(event.reveal_at)) {
    redirect(`/e/${slug}/gallery`);
  }

  // Returning guest? (device cookie → existing guest row)
  const deviceToken = (await cookies()).get(DEVICE_COOKIE)?.value;
  let existing: { name: string | null; shotsLeft: number } | null = null;
  if (deviceToken) {
    const { data: guest } = await supabaseAdmin()
      .from("guests")
      .select("*")
      .eq("event_id", event.id)
      .eq("device_token", deviceToken)
      .maybeSingle<GuestRow>();
    if (guest) {
      existing = {
        name: guest.display_name,
        shotsLeft: Math.max(0, event.shots_per_guest - guest.shots_used),
      };
    }
  }

  return <GuestLanding event={toPublicEvent(event)} existing={existing} />;
}
