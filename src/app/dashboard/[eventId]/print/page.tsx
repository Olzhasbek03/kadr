import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { supabaseServer } from "@/lib/supabase/server";
import { config } from "@/lib/config";
import type { EventRow } from "@/lib/types";
import QrCode from "@/components/QrCode";
import PrintButton from "@/components/dashboard/PrintButton";
import { ArrowLeft, Mark } from "@/components/icons";

/**
 * Ready-to-print table card: big QR + bilingual instructions (kk + ru are
 * both always printed — banquet halls are mixed-language). Stays white.
 */
export default async function PrintCardPage(ctx: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await ctx.params;
  const t = await getTranslations("print");
  const supabase = await supabaseServer();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle<EventRow>();
  if (!event) notFound();

  const joinUrl = `${config.appUrl}/e/${event.slug}`;
  const steps: Array<{ kk: string; ru: string }> = [
    { kk: "Камераңызды QR-кодқа бағыттаңыз", ru: "Наведите камеру на QR-код" },
    { kk: "Сілтемені ашыңыз — камера дайын", ru: "Откройте ссылку — камера готова" },
    { kk: `Әр қонаққа ${event.shots_per_guest} кадр`, ru: `У каждого гостя ${event.shots_per_guest} кадров` },
  ];

  return (
    <main className="min-h-screen bg-white text-neutral-900" style={{ colorScheme: "light" }}>
      <div className="no-print mx-auto flex max-w-2xl items-center justify-between px-6 py-5">
        <Link
          href={`/dashboard/${event.id}`}
          className="btn inline-flex min-h-[52px] items-center gap-2 rounded-full border border-neutral-300 px-5 font-medium text-neutral-800"
        >
          <ArrowLeft size={17} /> Kormem
        </Link>
        <PrintButton label={t("print")} />
      </div>

      <div className="mx-auto max-w-2xl px-8 py-10 text-center">
        <span className="inline-flex items-center gap-2 text-neutral-400">
          <Mark size={13} />
          <span className="font-display text-lg tracking-wide">Kormem</span>
        </span>
        <h1 className="font-display mt-5 text-5xl leading-[1.08]">{event.name}</h1>
        <p className="font-display mt-5 text-2xl text-neutral-700">
          Сіз де осы кештің фотографысыз
        </p>
        <p className="mt-1 text-neutral-500">Вы тоже фотограф этого вечера</p>

        <div className="mt-9 flex justify-center">
          <QrCode value={joinUrl} size={290} />
        </div>
        <p className="mt-4 text-lg font-medium tracking-wide text-neutral-600">
          {joinUrl.replace(/^https?:\/\//, "")}
        </p>

        <div className="mx-auto mt-10 grid max-w-md gap-5 text-left">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-5">
              <span className="font-display w-6 shrink-0 text-right text-3xl italic text-neutral-300">
                {i + 1}
              </span>
              <div>
                <p className="font-medium leading-snug">{step.kk}</p>
                <p className="mt-0.5 text-sm text-neutral-500">{step.ru}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-md border-t border-neutral-200 pt-5 text-sm leading-relaxed text-neutral-500">
          Фотолар жасырын сақталады және кейін бір галереяда ашылады.
          <br />
          Фотографии скрыты до момента проявки — потом откроются в общей галерее.
        </p>
      </div>
    </main>
  );
}
