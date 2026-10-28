import { Suspense } from "react";
import Link from "next/link";
import { Explainer } from "@/components/Explainer";
import { PageHeading } from "@/components/PageHeading";
import { formatTime } from "@/lib/format";
import { getJourneyDefinitions, getVisitorProfile, journeysEnabled, type JourneyDefinition, type VisitorProfile } from "@/lib/journey";
import { forgetMe } from "./actions";
import { RefreshButton } from "./RefreshButton";

export const metadata = { title: "Journey inspector" };

const channelIcon: Record<string, string> = { web: "🖥️", mobile: "📱", email: "✉️", push: "🔔", store: "🏬" };

export default function JourneyPage() {
  return (
    <>
      <PageHeading title="Journey inspector">
        <p>
          Everything the journey service knows about you, and where you are in each customer
          journey. Browse the site in another tab, then refresh this page.
        </p>
      </PageHeading>

      <Explainer>
        <p>
          <strong>1. Collect.</strong> Every page sends small events (<code>page_view</code>,{" "}
          <code>product_view</code>...) to <code>/api/track</code>, which forwards them to the
          journey service. The orders service sends <code>order_placed</code> itself, as an{" "}
          <em>event</em>: it announces what happened and doesn&apos;t wait for anyone.
        </p>
        <p>
          <strong>2. Identify.</strong> You get an anonymous id cookie on your first visit. When you
          sign in on the Account page, your anonymous history is merged into your customer profile
          (&quot;identity resolution&quot;). That is what lets a journey continue across devices.
        </p>
        <p>
          <strong>3. Profile.</strong> Interests and your segment are calculated from your events.
          The segment drives the targeted CMS blocks from step 1, so content now adapts to
          behaviour instead of a hand-picked cookie.
        </p>
        <p>
          <strong>4. Orchestrate.</strong> Each journey is a state machine. Events move you between
          states; each state says what to show on web and mobile, and what email or push message
          to send. The purple &quot;next best action&quot; boxes on the home and product pages come from
          here. Definitions live in <code>services/journey/src/journeys.ts</code>.
        </p>
        <p>
          Real-world equivalents: Segment, mParticle or Adobe Real-Time CDP for 1-3; Adobe Journey
          Optimizer, Salesforce Marketing Cloud, Braze or Iterable for 4.
        </p>
      </Explainer>

      {journeysEnabled ? (
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />}>
          <Inspector />
        </Suspense>
      ) : (
        <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          Journeys need the backend. Run <code>npm run dev</code> or <code>npm run dev:micro</code> from the
          repo root.
        </p>
      )}
    </>
  );
}

async function Inspector() {
  let profile: VisitorProfile | null;
  let definitions: JourneyDefinition[];
  try {
    [profile, definitions] = await Promise.all([getVisitorProfile(), getJourneyDefinitions()]);
  } catch (error) {
    return <p className="text-rose-600">{(error as Error).message}</p>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <RefreshButton />
        {profile && (
          <form action={forgetMe}>
            <button className="rounded-lg border border-zinc-300 px-3 py-1 text-sm hover:border-rose-600 dark:border-zinc-700">
              🗑️ Forget me
            </button>
          </form>
        )}
      </div>

      {!profile ? (
        <p className="text-sm text-zinc-500">
          No events yet. <Link href="/products" className="underline">Look at some products</Link> and come back.
        </p>
      ) : (
        <ProfileSummary profile={profile} />
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Journeys</h2>
        {definitions.map((journey) => (
          <JourneyDiagram key={journey.id} journey={journey} progress={profile?.journeys.find((j) => j.journeyId === journey.id)} />
        ))}
      </section>

      {profile && (
        <div className="grid gap-6 md:grid-cols-2">
          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">Recent events</h2>
            <ol className="flex flex-col gap-1 text-sm">
              {profile.events.map((e) => (
                <li key={e.id} className="flex gap-2">
                  <span className="font-mono text-xs text-zinc-500">{formatTime(Date.parse(e.at))}</span>
                  <span title={e.channel}>{channelIcon[e.channel] ?? "•"}</span>
                  <code>{e.type}</code>
                  <span className="truncate text-zinc-500">{e.productId ?? e.path ?? ""}</span>
                </li>
              ))}
            </ol>
          </section>
          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">Messages sent</h2>
            <p className="text-xs text-zinc-500">
              Emails and push notifications aren&apos;t really sent; they&apos;re kept here so you can see what
              would have gone out. The mobile app (step 4) shows the push ones.
            </p>
            {profile.outbox.length === 0 && <p className="text-sm text-zinc-500">Nothing yet.</p>}
            {profile.outbox.map((m) => (
              <div key={m.id} className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                <p>
                  {channelIcon[m.channel]} <strong>{m.title}</strong>
                </p>
                <p className="text-zinc-600 dark:text-zinc-400">{m.body}</p>
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}

function ProfileSummary({ profile }: { profile: VisitorProfile }) {
  const maxScore = Math.max(1, ...profile.interests.map((i) => i.score));
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <h2 className="mb-2 font-semibold">Identity</h2>
        <p>Profile: <code>{profile.id}</code></p>
        <p>Customer: {profile.userId ? <code>{profile.userId}</code> : <span className="text-zinc-500">not signed in</span>}</p>
        <p className="break-all">Anonymous ids: {profile.anonymousIds.map((a) => a.slice(0, 8)).join(", ") || "none"}</p>
      </div>
      <div className="rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <h2 className="mb-2 font-semibold">Profile</h2>
        <p>Segment: <code>{profile.segment}</code></p>
        <p>Events: {profile.eventCount}</p>
        <p>Orders: {profile.orderCount}</p>
      </div>
      <div className="rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <h2 className="mb-2 font-semibold">Interests</h2>
        {profile.interests.length === 0 && <p className="text-zinc-500">None yet.</p>}
        {profile.interests.map((i) => (
          <div key={i.tag} className="flex items-center gap-2">
            <span className="w-24 truncate">{i.tag}</span>
            <span className="h-2 rounded bg-emerald-500" style={{ width: `${(i.score / maxScore) * 100}px` }} />
            <span className="text-xs text-zinc-500">{i.score}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function JourneyDiagram({
  journey,
  progress,
}: {
  journey: JourneyDefinition;
  progress?: VisitorProfile["journeys"][number];
}) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">{journey.name}</h3>
        <span className="text-xs text-zinc-500">
          {progress ? `You entered "${progress.stateLabel}" at ${formatTime(Date.parse(progress.enteredAt))}` : `Not joined yet. Entry rule: ${journey.entryRule}`}
        </span>
      </div>
      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{journey.description}</p>
      <ol className="flex flex-col gap-2 md:flex-row md:items-stretch">
        {journey.states.map((state, i) => {
          const current = progress?.state === state.id;
          const visited = progress?.history.includes(state.id);
          return (
            <li key={state.id} className="flex flex-1 flex-col gap-1 md:flex-row md:items-center">
              {i > 0 && <span className="text-center text-zinc-400 md:px-1">→</span>}
              <div
                className={`flex-1 rounded-lg border p-3 text-sm ${
                  current
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-950/40"
                    : visited
                      ? "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
                      : "border-dashed border-zinc-300 dark:border-zinc-700"
                }`}
              >
                <p className="font-medium">
                  {current && "📍 "}
                  {state.label}
                </p>
                <p className="text-xs text-zinc-500">{state.description}</p>
                {state.channels.length > 0 && (
                  <p className="mt-1 text-xs">{state.channels.map((c) => channelIcon[c] ?? c).join(" ")}</p>
                )}
                {state.transitions.map((t) => (
                  <p key={t.to} className="mt-1 text-xs text-zinc-500">
                    → {t.to}: {t.when}
                  </p>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
