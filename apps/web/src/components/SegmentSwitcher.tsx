import { setSegment } from "@/app/actions/segment";
import { journeysEnabled } from "@/lib/journey";
import { getSegmentWithSource, SEGMENTS } from "@/lib/segment";

const labels: Record<string, string> = {
  "new-visitor": "🆕 New visitor",
  "weekend-hiker": "🥾 Weekend hiker",
  "alpine-expert": "🏔️ Alpine expert",
};

const sourceText = {
  override: "you picked this",
  journey: "worked out by the journey service from what you've done",
  default: "default for visitors we don't know yet",
};

/** Lets you pretend to be a different kind of customer. Reads cookies, so
 * it must be rendered inside <Suspense>. Works without JavaScript too, because
 * it is a plain HTML form posting to a Server Action. */
export async function SegmentSwitcher() {
  const { segment: current, source } = await getSegmentWithSource();
  const pill = (active: boolean) =>
    `rounded-full border px-3 py-1 ${
      active ? "border-emerald-600 bg-emerald-600 text-white" : "border-zinc-300 hover:border-emerald-600 dark:border-zinc-700"
    }`;
  return (
    <form action={setSegment} className="flex flex-col gap-1 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-zinc-500">Segment:</span>
        {journeysEnabled && (
          <button name="segment" value="auto" className={pill(source !== "override")}>
            🤖 Auto
          </button>
        )}
        {SEGMENTS.map((segment) => (
          <button key={segment} name="segment" value={segment} className={pill(source === "override" && segment === current)}>
            {labels[segment]}
          </button>
        ))}
      </div>
      <p className="text-xs text-zinc-500">
        Currently <code>{current}</code> ({sourceText[source]}).
      </p>
    </form>
  );
}

export function SegmentSwitcherSkeleton() {
  return <div className="h-12 w-96 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" />;
}
