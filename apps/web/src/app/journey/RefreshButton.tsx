"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/** Re-fetch this page's server data without a full reload. */
export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => router.refresh())}
      className="rounded-lg border border-zinc-300 px-3 py-1 text-sm hover:border-emerald-600 dark:border-zinc-700"
    >
      {pending ? "Refreshing..." : "↻ Refresh"}
    </button>
  );
}
