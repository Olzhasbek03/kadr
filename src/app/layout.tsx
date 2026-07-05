import type { Metadata, Viewport } from "next";
import { Golos_Text, Prata } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

// Both families cover Kazakh Cyrillic (cyrillic-ext): Қ Ә Ү Ұ Ө Ң Ғ Һ І
const display = Prata({
  weight: "400",
  subsets: ["latin", "cyrillic-ext"],
  variable: "--font-display",
});
const body = Golos_Text({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Kormem — общая камера вашего тоя",
  description:
    "Гости снимают на одноразовую камеру в браузере, а фотографии остаются скрытыми до утра. Потом весь вечер открывается в общей галерее.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f2f1",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
