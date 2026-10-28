import type { ReactNode } from "react";

/** A collapsible "How this works" box. Uses the native HTML <details> element,
 * so it opens and closes without any JavaScript. */
export function Explainer({
  title = "How this works",
  children,
  open = false,
}: {
  title?: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details
      open={open}
      className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-950 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100 [&_code]:font-mono [&_code]:text-[0.9em] [&_p+p]:mt-2"
    >
      <summary className="cursor-pointer font-semibold">{title}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
