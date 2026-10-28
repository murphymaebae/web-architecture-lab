import { Suspense } from "react";
import { connection } from "next/server";
import { Explainer } from "@/components/Explainer";
import { PageHeading } from "@/components/PageHeading";
import { DATA_SOURCE, GRAPHQL_URL, TOPOLOGY } from "@/lib/data-source";

export const metadata = { title: "Architecture" };

const services = [
  { name: "API (gateway or monolith)", url: GRAPHQL_URL, port: 4000 },
  { name: "catalog", url: process.env.CATALOG_URL ?? "http://localhost:4001/", port: 4001 },
  { name: "accounts", url: process.env.ACCOUNTS_URL ?? "http://localhost:4002/", port: 4002 },
  { name: "orders", url: process.env.ORDERS_URL ?? "http://localhost:4003/", port: 4003 },
  { name: "content", url: process.env.CONTENT_URL ?? "http://localhost:4004/", port: 4004 },
];

const comparison = [
  ["Deploy", "One thing to build, test and release.", "Each service ships on its own schedule."],
  ["Scale", "Scale everything together.", "Scale only the busy parts (e.g. catalog on Black Friday)."],
  ["Teams", "Everyone works in one codebase; needs discipline to keep modules apart.", "Each team owns a service end to end; needs agreement on APIs."],
  ["Data", "One database, real transactions across modules.", "Database per service; keeping data consistent needs events and sagas."],
  ["Speed of a request", "Function calls, microseconds.", "Network hops, milliseconds each. The gateway has to plan and parallelise."],
  ["Failure", "One bug can take the whole thing down.", "One service can fail while others keep working (if designed for it)."],
  ["Operations", "One process to monitor.", "Many processes, so you need tracing, service discovery, a gateway, CI per service."],
];

export default function ArchitecturePage() {
  return (
    <>
      <PageHeading title="Architecture: monolith vs microservices">
        <p>
          The same backend code can run as one process or as five. This page shows which one is
          running right now.
        </p>
      </PageHeading>

      <ModeBanner />

      <div className="grid gap-4 md:grid-cols-2">
        <Diagram
          title="Monolith"
          command="npm run dev"
          active={TOPOLOGY === "monolith"}
          boxes={[["API :4000", ["catalog", "accounts", "orders", "content"]]]}
        />
        <Diagram
          title="Microservices + gateway"
          command="npm run dev:micro"
          active={TOPOLOGY === "microservices"}
          boxes={[
            ["Gateway :4000", []],
            ["catalog :4001", []],
            ["accounts :4002", []],
            ["orders :4003", []],
            ["content :4004", []],
          ]}
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Live service check</h2>
        <Suspense fallback={<p className="text-sm text-zinc-500">Checking services...</p>}>
          <HealthTable />
        </Suspense>
        {DATA_SOURCE === "graphql" && (
          <p className="text-sm">
            Explore the API yourself: open{" "}
            <a className="underline" href={GRAPHQL_URL} target="_blank" rel="noreferrer">
              {GRAPHQL_URL}
            </a>{" "}
            for Apollo Sandbox, a GraphQL playground with autocomplete and schema docs.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Trade-offs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <tr>
                <th className="py-2 pr-4"></th>
                <th className="py-2 pr-4">Monolith</th>
                <th className="py-2">Microservices</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map(([topic, mono, micro]) => (
                <tr key={topic} className="border-b border-zinc-100 align-top dark:border-zinc-900">
                  <td className="py-2 pr-4 font-medium">{topic}</td>
                  <td className="py-2 pr-4">{mono}</td>
                  <td className="py-2">{micro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Explainer title="Where to look in the code">
        <p>
          <code>services/*/src/module.ts</code> holds each business area&apos;s schema and logic.{" "}
          <code>services/*/src/server.ts</code> runs one module as its own service.{" "}
          <code>services/monolith/src/server.ts</code> loads all modules into one process, and{" "}
          <code>services/gateway/src/server.ts</code> joins the separate services into one API.
        </p>
        <p>
          The interesting difference is how <code>orders</code> reaches other services: compare
          the <code>refs</code> and <code>inventory</code> passed in the monolith (function calls)
          with the ones in <code>services/orders/src/server.ts</code> (network calls).
        </p>
      </Explainer>
    </>
  );
}

function ModeBanner() {
  const text =
    DATA_SOURCE === "local"
      ? "The site is reading sample data directly (no backend). Run `npm run dev` or `npm run dev:micro` to use the GraphQL backend."
      : TOPOLOGY === "monolith"
        ? "The site is talking to the MONOLITH on port 4000."
        : "The site is talking to the GATEWAY on port 4000, which fans out to four services.";
  return <p className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100">{text}</p>;
}

function Diagram({
  title,
  command,
  active,
  boxes,
}: {
  title: string;
  command: string;
  active: boolean;
  boxes: [string, string[]][];
}) {
  return (
    <div className={`rounded-xl border-2 p-4 ${active ? "border-emerald-500" : "border-zinc-200 opacity-70 dark:border-zinc-800"}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        {active && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs text-white">running</span>}
      </div>
      <div className="mb-2 rounded border border-dashed border-zinc-400 px-3 py-1 text-center text-xs">Web (Next.js :3000)</div>
      <div className="text-center text-xs text-zinc-500">↓ GraphQL</div>
      <div className="flex flex-col gap-2">
        {boxes.map(([name, modules], i) => (
          <div key={name}>
            {i === 1 && <div className="text-center text-xs text-zinc-500">↓ query plan fans out</div>}
            <div className="rounded-lg bg-zinc-100 p-2 text-center text-sm dark:bg-zinc-900">
              <div className="font-medium">{name}</div>
              {modules.length > 0 && (
                <div className="mt-1 flex flex-wrap justify-center gap-1">
                  {modules.map((m) => (
                    <span key={m} className="rounded bg-white px-2 text-xs dark:bg-zinc-800">
                      {m} module
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Start with <code>{command}</code>
      </p>
    </div>
  );
}

async function HealthTable() {
  await connection(); // always check live, never cache
  const results = await Promise.all(services.map(checkService));
  return (
    <ul className="grid gap-2 sm:grid-cols-5">
      {results.map((r) => (
        <li key={r.port} className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
          <div className="font-medium">{r.name}</div>
          <div className="text-xs text-zinc-500">port {r.port}</div>
          <div className={r.up ? "text-emerald-600" : "text-zinc-400"}>{r.up ? `● up (${r.ms} ms)` : "○ not running"}</div>
        </li>
      ))}
    </ul>
  );
}

async function checkService(service: (typeof services)[number]) {
  const start = performance.now();
  try {
    const res = await fetch(service.url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "{ __typename }" }),
      signal: AbortSignal.timeout(1000),
    });
    return { ...service, up: res.ok, ms: Math.round(performance.now() - start) };
  } catch {
    return { ...service, up: false, ms: 0 };
  }
}
