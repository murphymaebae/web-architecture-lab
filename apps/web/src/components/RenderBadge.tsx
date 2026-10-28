import { formatTime } from "@/lib/format";

type Props = {
  /** Name of the rendering strategy, e.g. "Static (SSG)". */
  strategy: string;
  /** When this piece of HTML was produced (milliseconds since 1970). */
  renderedAt: number;
  /** Where the HTML was produced. */
  where: "server" | "browser";
  /** What to try so you can see the strategy in action. */
  tryThis?: string;
};

/** A small panel that tells you how and when a part of the page was rendered.
 * Reload the page and watch the time: does it change or not? */
export function RenderBadge({ strategy, renderedAt, where, tryThis }: Props) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
      <p>
        <strong>{strategy}</strong> · rendered in the <strong>{where}</strong> at{" "}
        <code className="font-mono">{formatTime(renderedAt)}</code>
      </p>
      {tryThis && <p className="mt-1 opacity-80">Try this: {tryThis}</p>}
    </div>
  );
}
