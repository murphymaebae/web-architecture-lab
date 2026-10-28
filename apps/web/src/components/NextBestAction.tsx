import Link from "next/link";
import { getNextBestAction, journeysEnabled } from "@/lib/journey";

/** A personalised slot. The journey service decides what goes here, based on
 * where this visitor is in their journeys. In enterprise tools this is called
 * a "decisioning" or "next best action" placement.
 *
 * Reads cookies (who is visiting), so wrap it in <Suspense>. */
export async function NextBestAction() {
  if (!journeysEnabled) return null;
  const action = await getNextBestAction();
  if (!action) return null;

  return (
    <aside className="flex flex-col gap-2 rounded-xl border border-violet-300 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold">{action.title}</p>
          <p className="text-sm">{action.body}</p>
        </div>
        {action.ctaHref && (
          <Link href={action.ctaHref} className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white hover:bg-violet-700">
            {action.ctaLabel ?? "Go"}
          </Link>
        )}
      </div>
      <p className="text-xs text-violet-800 dark:text-violet-300">
        🧭 Why am I seeing this? {action.reason}{" "}
        <Link href="/journey" className="underline">
          Open the journey inspector
        </Link>
      </p>
    </aside>
  );
}
