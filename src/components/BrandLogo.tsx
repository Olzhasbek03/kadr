import Image from "next/image";

/**
 * The Kormem brand mark — the gold camera glyph, background keyed out so it
 * sits cleanly on the light hero, the black footer, or anywhere else. Paired
 * with the "Kormem" wordmark in headers; used on its own as a compact badge.
 *
 * Source art lives at public/brand/logo-source.png; the mark and full lockup
 * are exported from it (see the logo assets in public/brand/).
 */
const MARK_RATIO = 1009 / 809; // width / height of the exported mark

export function BrandMark({
  size = 32,
  className = "",
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/logo-mark.png"
      alt="Kormem"
      width={Math.round(size * MARK_RATIO)}
      height={size}
      priority={priority}
      className={className}
    />
  );
}

/**
 * Header/footer lockup: the camera mark next to the wordmark. `tone` picks the
 * wordmark colour so it reads on light or dark backgrounds.
 */
export function BrandLockup({
  size = 30,
  tone = "ink",
  className = "",
  priority = false,
}: {
  size?: number;
  tone?: "ink" | "ivory";
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark size={size} priority={priority} />
      <span
        className={`font-display leading-none ${tone === "ivory" ? "text-ivory" : ""}`}
        style={{ fontSize: size * 0.86 }}
      >
        Kormem
      </span>
    </span>
  );
}
