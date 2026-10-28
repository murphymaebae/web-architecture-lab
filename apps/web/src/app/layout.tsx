import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { PageViewTracker } from "@/components/Track";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Trailhead · Architecture Lab",
    template: "%s · Trailhead Lab",
  },
  description: "A sandbox for learning enterprise web architecture with Next.js and React.",
};

// The root layout wraps every page. Anything here (like the header) is shared.
// `children` is the page currently being shown.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        {/* Sends a page_view event on every navigation (renders nothing). */}
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10">
          {children}
        </main>
        <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
          Trailhead Outfitters is a made-up store for learning purposes.
        </footer>
      </body>
    </html>
  );
}
