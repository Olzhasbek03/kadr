import type { Metadata } from "next";
import PwaRegister from "@/components/guest/PwaRegister";

/**
 * Guest-route layout: wires the per-event manifest and iOS install meta so
 * "Add to Home Screen" produces an app icon that opens straight into the
 * event camera, full screen, no browser chrome.
 */
export async function generateMetadata(ctx: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await ctx.params;
  return {
    manifest: `/e/${slug}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Kormem",
    },
    icons: {
      apple: "/apple-touch-icon.png",
    },
  };
}

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PwaRegister />
    </>
  );
}
