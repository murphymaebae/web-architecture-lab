import type { ReactNode } from "react";

export function PageHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {children && <div className="max-w-2xl text-zinc-600 dark:text-zinc-400">{children}</div>}
    </header>
  );
}
