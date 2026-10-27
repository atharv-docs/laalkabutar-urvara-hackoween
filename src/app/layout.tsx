import type { Metadata, Viewport } from "next";
import { Mukta } from "next/font/google";
import { UrvaraProvider } from "@/components/providers/UrvaraProvider";
import "./globals.css";

/** Mukta (Ek Type) sets Latin and Devanagari on one shared design, so Hindi never falls back to a mismatched face. */
const mukta = Mukta({
  variable: "--font-mukta",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Urvara AI", template: "%s · Urvara AI" },
  description: "Every Farm. Every Resource. In Sync. Voice-first multi-farm coordination for owners and farmers.",
};

export const viewport: Viewport = {
  themeColor: "#234735",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-scroll-behavior keeps route changes jumping instantly to the top; only in-page scrolling glides.
    <html lang="en" data-scroll-behavior="smooth" className={`${mukta.variable} h-full antialiased`}>
      <body className="min-h-full">
        <UrvaraProvider>{children}</UrvaraProvider>
      </body>
    </html>
  );
}
