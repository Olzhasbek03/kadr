import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { supabaseServer } from "@/lib/supabase/server";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { LogoutIcon, Mark } from "@/components/icons";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const t = await getTranslations("dashboard");

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-ink">
            <Mark size={16} className="text-accent" />
            <span className="font-serif-display text-xl">Kadr</span>
          </Link>
          <div className="flex items-center gap-5">
            <LanguageSwitcher />
            <span className="hidden max-w-[180px] truncate text-sm text-muted sm:block">
              {user.email}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="icon-btn !h-11 !w-11 !min-h-0"
                aria-label={t("signOut")}
                title={t("signOut")}
              >
                <LogoutIcon size={17} />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 pb-24">{children}</main>
    </div>
  );
}
