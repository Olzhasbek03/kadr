import type { SVGProps } from "react";

/**
 * Thin-stroke line icons, 24px grid. All inherit `currentColor` so tone is
 * controlled by the surrounding text color.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 22, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export const ArrowLeft = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M19 12H5m0 0 6-6m-6 6 6 6" />
  </svg>
);

export const ArrowRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12h14m0 0-6-6m6 6-6 6" />
  </svg>
);

export const CameraIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.2-1.8A1.5 1.5 0 0 1 10 4.5h4a1.5 1.5 0 0 1 1.3.7L16.5 7h2A1.5 1.5 0 0 1 20 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18V8.5Z" />
    <circle cx="12" cy="13" r="3.4" />
  </svg>
);

export const BoltIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M13 2 5 13.5h5.5L11 22l8-11.5h-5.5L13 2Z" />
  </svg>
);

export const FlipIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 9a8 8 0 0 1 14.2-3M20 15a8 8 0 0 1-14.2 3" />
    <path d="M18 2v4h-4M6 22v-4h4" />
  </svg>
);

export const FilmIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="4" width="17" height="16" rx="2" />
    <path d="M7.5 4v16M16.5 4v16M3.5 8h4M3.5 12h4M3.5 16h4M16.5 8h4M16.5 12h4M16.5 16h4" />
  </svg>
);

export const ClockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const QrIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="6" height="6" rx="1" />
    <rect x="14" y="4" width="6" height="6" rx="1" />
    <rect x="4" y="14" width="6" height="6" rx="1" />
    <path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5z" />
  </svg>
);

export const MonitorIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="12.5" rx="1.6" />
    <path d="M9 21h6" />
  </svg>
);

export const PrinterIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 8V3.5h10V8M7 17H4.5A1.5 1.5 0 0 1 3 15.5v-6A1.5 1.5 0 0 1 4.5 8h15A1.5 1.5 0 0 1 21 9.5v6a1.5 1.5 0 0 1-1.5 1.5H17" />
    <rect x="7" y="14" width="10" height="6.5" rx="1" />
  </svg>
);

export const CopyIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);

export const DownloadIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 4v11m0 0 4.5-4.5M12 15l-4.5-4.5" />
    <path d="M4.5 19.5h15" />
  </svg>
);

export const UploadIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 20V9m0 0 4.5 4.5M12 9l-4.5 4.5" />
    <path d="M4.5 4.5h15" />
  </svg>
);

export const ShareIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 15V4m0 0 3.5 3.5M12 4 8.5 7.5" />
    <path d="M6 11H5.5a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 18.5 11H18" />
  </svg>
);

export const VideoIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="6.5" width="13" height="11" rx="2" />
    <path d="m16 11 5-3v8l-5-3" />
  </svg>
);

export const EyeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const EyeOffIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 4l16 16" />
    <path d="M9.9 5.9A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17.5 17.5 0 0 1-3.2 3.9M6.1 8A17 17 0 0 0 2.5 12S6 18.5 12 18.5c1 0 2-.2 2.8-.5" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);

export const UsersIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8.5" r="3.5" />
    <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    <path d="M15.5 5.5a3.5 3.5 0 0 1 0 6.4M17 14.7c2 .6 3.5 2.2 3.5 4.8" />
  </svg>
);

export const WifiOffIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 4l16 16" />
    <path d="M12 18.5h.01" />
    <path d="M8.5 15a5.5 5.5 0 0 1 5-1.3M5 11.5a10 10 0 0 1 3-2M19 11.5a10 10 0 0 0-6.4-2.9M2 8a14.5 14.5 0 0 1 4-2.6M22 8a14.5 14.5 0 0 0-9-3.4" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const XIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const ChevronRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);

export const ImageIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m4 17.5 4.5-4.5 3.5 3.5 3-3 5 5" />
  </svg>
);

/** Kormem brand mark: a four-point spark, echoing a camera flash. */
export const Mark = ({ size = 20, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="none"
    {...props}
  >
    <path d="M12 1.5c.6 4.9 1.4 8 3.2 9.4 1.5 1.1 3.9 1.1 7.3 1.1-3.4 0-5.8 0-7.3 1.1-1.8 1.4-2.6 4.5-3.2 9.4-.6-4.9-1.4-8-3.2-9.4C7.3 12 4.9 12 1.5 12c3.4 0 5.8 0 7.3-1.1 1.8-1.4 2.6-4.5 3.2-9.4Z" />
  </svg>
);

export const MailIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="m3.5 7 8.5 6 8.5-6" />
  </svg>
);

/** Monochrome Google "G", line style to match the set. */
export const GoogleIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 10.8h8.2c.1.5.1 1 .1 1.5 0 5.2-3.5 8.7-8.3 8.7A9 9 0 0 1 12 3a8.6 8.6 0 0 1 6 2.4l-2.5 2.4A5.2 5.2 0 0 0 12 6.4a5.6 5.6 0 0 0 0 11.2c2.6 0 4.4-1.4 4.9-3.6H12v-3.2Z" />
  </svg>
);

export const LockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
    <path d="M8 10.5V8a4 4 0 1 1 8 0v2.5" />
  </svg>
);

export const UnlockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 7.7-1.5" />
  </svg>
);

export const LinkIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M10 14a4.2 4.2 0 0 0 6 0l3-3a4.24 4.24 0 0 0-6-6l-1.2 1.2" />
    <path d="M14 10a4.2 4.2 0 0 0-6 0l-3 3a4.24 4.24 0 0 0 6 6l1.2-1.2" />
  </svg>
);

export const CalendarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
  </svg>
);

export const LogoutIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
    <path d="M10 8 6 12l4 4M6 12h11" />
  </svg>
);

export const ShieldIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 2.5 4.5 5.5v6c0 4.6 3.2 8 7.5 10 4.3-2 7.5-5.4 7.5-10v-6L12 2.5Z" />
    <path d="m8.8 12 2.2 2.2 4.2-4.4" />
  </svg>
);

export const MicIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);

export const PlayIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 5.5v13l11-6.5-11-6.5Z" />
  </svg>
);

export const PauseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 5v14M16 5v14" />
  </svg>
);

export const StopIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" />
  </svg>
);

export const RedoIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 8a8.5 8.5 0 1 0 1.5 6M20 3v5h-5" />
  </svg>
);

export const TrashIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m3 0-.7 12.1a1.6 1.6 0 0 1-1.6 1.5H8.3a1.6 1.6 0 0 1-1.6-1.5L6 7m4 4v6m4-6v6" />
  </svg>
);

export const HeartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 20s-7-4.6-9-9c-1.2-2.7.5-6 3.6-6 1.9 0 3.6 1 4.4 2.6h2C13.8 6 15.5 5 17.4 5c3.1 0 4.8 3.3 3.6 6-2 4.4-9 9-9 9Z" />
  </svg>
);

export const CakeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 20h16M5 20v-6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6M12 12V9m0-2.5c1-1 .7-2.5-.2-3.5-.8 1-1 2.5.2 3.5Z" />
  </svg>
);

export const PlaneIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M10.5 13.5 4 11l1.5-1.5L11 10l4.5-4.5a1.4 1.4 0 0 1 2 2L13 12l.5 5.5L12 19l-2.5-6.5Z" />
  </svg>
);

export const GlassIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 3h8l-1 7a3 3 0 0 1-6 0L8 3ZM12 13v7m-3.5 0h7" />
  </svg>
);

export const SparkleIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 4l1.8 4.6L18 10l-4.2 1.4L12 16l-1.8-4.6L6 10l4.2-1.4L12 4ZM18.5 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" />
  </svg>
);

export const InfinityIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 15.5c-2 0-3.5-1.6-3.5-3.5S6 8.5 8 8.5c3.5 0 4.5 7 8 7 2 0 3.5-1.6 3.5-3.5S18 8.5 16 8.5c-3.5 0-4.5 7-8 7Z" />
  </svg>
);
