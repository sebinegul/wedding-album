import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AdminProvider } from "@/components/AdminProvider";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

// Great Vibes (script) is vendored for the print PDFs; reuse the same file
// for the web so the couple names on the album page match the printed cards.
const greatVibes = localFont({
  src: "../lib/print/fonts/GreatVibes-Regular.ttf",
  variable: "--font-greatvibes",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "Wedding Album",
    template: "%s · Wedding Album",
  },
  description:
    "One shared album for every guest photo. Create an album, share the QR code, and watch photos from your wedding day arrive in real time.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#e11d48",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${greatVibes.variable}`}
      suppressHydrationWarning
    >
      <head />
      <body className="min-h-dvh bg-stone-50 font-sans text-stone-900 antialiased dark:bg-stone-950 dark:text-stone-100">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <ThemeProvider>
          <AdminProvider>
            {children}
            <Toaster position="top-center" richColors closeButton />
          </AdminProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
