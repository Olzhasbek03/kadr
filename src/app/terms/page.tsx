import Link from "next/link";
import { getTranslations } from "next-intl/server";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ArrowLeft } from "@/components/icons";

/**
 * Terms of service. Adapted for a free, web-only test product: no
 * purchases, no App Store / Apple / Google clauses, no arbitration
 * boilerplate — just what the service is, how you may use it, who owns
 * the content, and the honest disclaimers of a test version.
 */
export default async function TermsPage() {
  const t = await getTranslations("terms");
  const sections = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => ({
    title: t(`s${i}Title`),
    body: t(`s${i}Body`),
  }));

  return (
    <main className="min-h-dvh">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-5 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-ink-2 transition-colors hover:text-ink"
        >
          <ArrowLeft size={16} /> Kormem
        </Link>
        <LanguageSwitcher />
      </header>

      <article className="mx-auto max-w-2xl px-5 pb-24 pt-6">
        <h1 className="font-display text-[clamp(2rem,5vw,2.7rem)]">{t("title")}</h1>
        <p className="mt-3 text-sm text-ink-2">{t("updated")}</p>
        <p className="mt-4 leading-[1.55] text-ink-2">{t("intro")}</p>

        <div className="mt-10 flex flex-col gap-4">
          {sections.map((section, i) => (
            <section key={i} className="card p-6 sm:p-8">
              <h2 className="text-lg font-[480]">{section.title}</h2>
              <p className="mt-3 whitespace-pre-line leading-[1.55] text-ink-2">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <p className="mt-10 text-sm leading-[1.5] text-ink-2">{t("contact")}</p>
      </article>
    </main>
  );
}
