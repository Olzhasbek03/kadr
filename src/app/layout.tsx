import type { Metadata, Viewport } from "next";
import { Cormorant, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

// Both families cover Kazakh Cyrillic (cyrillic-ext): Қ Ә Ү Ұ Ө Ң Ғ Һ І
const display = Cormorant({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-display",
});
const body = Inter({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Kadr — общая одноразовая камера для вашего праздника",
  description:
    "Гости сканируют QR-код и снимают на плёночную камеру в браузере. Фотографии проявляются утром — весь вечер глазами каждого гостя.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0c0a08",
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
