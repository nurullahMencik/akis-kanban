import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";
import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { ShellSkeleton } from "@/components/shell/shell-skeleton";
import { PREFERENCES_BOOT_SCRIPT } from "@/lib/preferences-boot";
import "./globals.css";

const uiFont = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-ui",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Akış · Analitik odaklı Kanban",
    template: "%s · Akış",
  },
  description:
    "Akış: akış metriklerini (CFD, döngü süresi, throughput, burndown) kart hareketlerinden hesaplayan, çevrimdışı çalışan Kanban proje yönetimi uygulaması.",
  applicationName: "Akış",
  authors: [{ name: "Nurullah Mencik" }],
  openGraph: {
    title: "Akış · Analitik odaklı Kanban",
    description: "Local-first Kanban board with flow analytics, built with Next.js and TypeScript.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f3f2ee",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={uiFont.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFERENCES_BOOT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <Suspense fallback={<ShellSkeleton />}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
