import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getEventBySlug } from "@/lib/events";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DEVICE_COOKIE } from "@/lib/device";
import { isShootingOpen, toPublicEvent, type GuestRow } from "@/lib/types";
import GuestLanding from "@/components/guest/GuestLanding";

export const dynamic = "force-dynamic";

export default async function GuestPage(ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const event = await getEventBySlug(slug);

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

  // The gallery is live from the first shot, but the QR still lands guests
  // on the camera while shooting is open; only once it closes does the
  // event become a gallery to look back on.
  if (!isShootingOpen(event)) {
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
