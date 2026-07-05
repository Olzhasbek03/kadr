"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { GalleryItem } from "@/lib/types";
import { deleteMedia } from "@/app/dashboard/[eventId]/actions";
import MediaTile from "@/components/media/MediaTile";
import MediaLightbox from "@/components/media/MediaLightbox";
import AudioWishCard from "@/components/media/AudioWishCard";
import { DownloadIcon, ImageIcon, Mark, TrashIcon } from "@/components/icons";

/** Host gallery: full grid (visible pre-reveal for the host only), voice
 *  wishes, moderation delete, and "download all" as a server-streamed zip
 *  (constant memory, works for events of any size). */
export default function HostGallery({
  items: initialItems,
  eventId,
  eventSlug,
}: {
  items: GalleryItem[];
  eventId: string;
  eventSlug: string;
}) {
  const t = useTranslations("event");
  const tg = useTranslations("gallery");
  const [items, setItems] = useState(initialItems);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const wishes = useMemo(() => items.filter((m) => m.type === "audio"), [items]);
  const visual = useMemo(() => items.filter((m) => m.type !== "audio"), [items]);

  const remove = async (item: GalleryItem) => {
    if (deleting) return;
    if (!window.confirm(t("deleteConfirm"))) return;
    setDeleting(item.id);
    const result = await deleteMedia(eventId, item.id).catch(() => ({ ok: false }));
    setDeleting(null);
    if (result.ok) {
      setItems((list) => list.filter((m) => m.id !== item.id));
      setLightbox(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="card mt-5 flex flex-col items-center gap-4 px-6 py-16 text-center">
        <ImageIcon size={28} className="text-ink-2" />
        <p className="max-w-xs leading-relaxed text-ink-2">{t("noPhotosYet")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-2">{tg("mediaCount", { count: items.length })}</p>
        <a
          href={`/api/e/${eventSlug}/download`}
          className="btn btn-secondary !min-h-[52px]"
        >
          <DownloadIcon size={17} /> {t("downloadAll")}
        </a>
      </div>

      {wishes.length > 0 && (
        <section className="mt-6">
          <p className="label-soft">{tg("voiceWishes")}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {wishes.map((item) => (
              <div key={item.id} className="relative">
                <AudioWishCard item={item} />
                <button
                  type="button"
                  onClick={() => void remove(item)}
                  disabled={deleting === item.id}
                  className="absolute -right-1.5 -top-1.5 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-ink-2 transition hover:text-danger disabled:opacity-50"
                  aria-label={tg("deleteItem")}
                >
                  {deleting === item.id ? (
                    <Mark size={13} className="animate-spin" />
                  ) : (
                    <TrashIcon size={14} />
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {visual.length > 0 && (
        <div className="mt-5 grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5">
          {visual.map((item, i) => (
            <MediaTile
              key={item.id}
              item={item}
              index={i}
              mineLabel={null}
              onOpen={() => setLightbox(i)}
            />
          ))}
        </div>
      )}

      {lightbox !== null && visual[lightbox] && (
        <MediaLightbox
          items={visual}
          index={lightbox}
          onNavigate={setLightbox}
          onClose={() => setLightbox(null)}
          onDelete={(item) => void remove(item)}
        />
      )}
    </>
  );
}
