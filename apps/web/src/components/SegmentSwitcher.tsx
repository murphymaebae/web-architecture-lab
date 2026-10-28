import { setSegment } from "@/app/actions/segment";
import { getSegment, SEGMENTS } from "@/lib/segment";

const labels: Record<string, string> = {
  "new-visitor": "🆕 New visitor",
  "weekend-hiker": "🥾 Weekend hiker",
  "alpine-expert": "🏔️ Alpine expert",
};

/** Lets you pretend to be a different kind of customer. Reads a cookie, so
 * it must be rendered inside <Suspense>. Works without JavaScript too, because
 * it is a plain HTML form posting to a Server Action. */
export async function SegmentSwitcher() {
  const current = await getSegment();
  return (
    <form action={setSegment} className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-zinc-500">Pretend to be:</span>
      {SEGMENTS.map((segment) => (
        <button
          key={segment}
          name="segment"
          value={segment}
          className={`rounded-full border px-3 py-1 ${
            segment === current
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-zinc-300 hover:border-emerald-600 dark:border-zinc-700"
          }`}
        >
          {labels[segment]}
        </button>
      ))}
    </form>
  );
}

export function SegmentSwitcherSkeleton() {
  return <div className="h-8 w-80 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-900" />;
}
