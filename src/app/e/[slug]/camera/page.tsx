import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getEventBySlug } from "@/lib/events";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DEVICE_COOKIE } from "@/lib/device";
import { toPublicEvent, type GuestRow } from "@/lib/types";
import CameraView from "@/components/guest/CameraView";

export const dynamic = "force-dynamic";

export default async function CameraPage(ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const event = await getEventBySlug(slug);
  if (!event || event.status !== "active") redirect(`/e/${slug}`);

  const deviceToken = (await cookies()).get(DEVICE_COOKIE)?.value;
  if (!deviceToken) redirect(`/e/${slug}`);

  const { data: guest } = await supabaseAdmin()
    .from("guests")
    .select("*")
    .eq("event_id", event.id)
    .eq("device_token", deviceToken)
    .maybeSingle<GuestRow>();
  if (!guest) redirect(`/e/${slug}`);

  return (
    <CameraView
      event={toPublicEvent(event)}
      initialShotsLeft={Math.max(0, event.shots_per_guest - guest.shots_used)}
    />
  );
}
