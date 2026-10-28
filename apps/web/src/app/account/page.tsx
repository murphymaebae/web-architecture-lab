import { Suspense } from "react";
import Link from "next/link";
import { users } from "@lab/domain";
import { signIn, signOut } from "@/app/actions/user";
import { Explainer } from "@/components/Explainer";
import { PageHeading } from "@/components/PageHeading";
import { DATA_SOURCE } from "@/lib/data-source";
import { formatDate, formatPrice } from "@/lib/format";
import { GraphQLRequestError, graphqlRequest } from "@/lib/graphql";
import { getUserId } from "@/lib/user";

export const metadata = { title: "Account" };

// ONE query, answered by FOUR services. The comments show who owns what.
const ME_QUERY = `query AccountPage {
  me {                 # accounts service
    name
    email
    segment
    orders {           # orders service (adds "orders" to User)
      id
      status
      createdAt
      total
      lines {
        quantity
        unitPrice
        product {      # catalog service
          name
          emoji
          slug
        }
      }
    }
    profile {          # journey service (adds "profile" to User)
      segment
      journeys { journeyName stateLabel }
    }
  }
}`;

type MeResult = {
  me: {
    name: string;
    email: string;
    segment: string;
    orders: {
      id: string;
      status: string;
      createdAt: string;
      total: number;
      lines: { quantity: number; unitPrice: number; product: { name: string; emoji: string; slug: string } }[];
    }[];
    profile: { segment: string; journeys: { journeyName: string; stateLabel: string }[] } | null;
  } | null;
};

export default function AccountPage() {
  return (
    <>
      <PageHeading title="Account">
        <p>Your profile and order history, fetched with a single GraphQL query.</p>
      </PageHeading>

      <Explainer>
        <p>
          This page sends <strong>one</strong> request to the GraphQL API on port 4000 (the query is
          shown below). In the <strong>monolith</strong>, one process answers all of it. In{" "}
          <strong>microservices</strong> mode, the gateway splits it into a <em>query plan</em>:
          ask <code>accounts</code> for the user, then <code>orders</code> for their orders and{" "}
          <code>journey</code> for their profile, then <code>catalog</code> for each product&apos;s
          name, and merges the answers.
        </p>
        <p>
          That is the main promise of GraphQL Federation for enterprises: each team owns its own
          service and schema, while apps see one joined-up API. Run <code>npm run dev:micro</code>{" "}
          and watch the terminal while this page loads to see each service log its part.
        </p>
      </Explainer>

      {DATA_SOURCE === "local" ? (
        <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          This page needs the backend. Stop the site and run <code>npm run dev</code> (monolith) or{" "}
          <code>npm run dev:micro</code> (microservices) from the repo root.
        </p>
      ) : (
        <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-900" />}>
          <AccountContent />
        </Suspense>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer font-medium">Show the GraphQL query</summary>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-950 p-4 text-xs text-zinc-100">{ME_QUERY}</pre>
      </details>
    </>
  );
}

async function AccountContent() {
  const userId = await getUserId();

  if (!userId) {
    return (
      <form action={signIn} className="flex flex-col gap-3">
        <p>Sign in as a demo user:</p>
        <div className="flex flex-wrap gap-2">
          {users.map((u) => (
            <button key={u.id} name="userId" value={u.id} className="rounded-lg border border-zinc-300 px-4 py-2 hover:border-emerald-600 dark:border-zinc-700">
              {u.name} <span className="text-xs text-zinc-500">({u.segment})</span>
            </button>
          ))}
        </div>
      </form>
    );
  }

  let data: MeResult;
  try {
    data = await graphqlRequest<MeResult>(ME_QUERY, {}, { userId });
  } catch (error) {
    const message = error instanceof GraphQLRequestError ? error.message : String(error);
    return <p className="text-rose-600">{message}</p>;
  }
  const me = data.me;
  if (!me) return <p>User not found.</p>;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-start justify-between rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div>
          <p className="text-lg font-semibold">{me.name}</p>
          <p className="text-sm text-zinc-500">
            {me.email} · CRM segment <code>{me.segment}</code>
          </p>
          {me.profile && (
            <p className="text-sm text-zinc-500">
              Behavioural segment <code>{me.profile.segment}</code> ·{" "}
              {me.profile.journeys.map((j) => `${j.journeyName}: ${j.stateLabel}`).join(" · ")}{" "}
              <Link href="/journey" className="underline">details</Link>
            </p>
          )}
        </div>
        <form action={signOut}>
          <button className="text-sm text-zinc-500 underline">Sign out</button>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Orders</h2>
        {me.orders.length === 0 && (
          <p className="text-sm text-zinc-500">
            No orders yet. <Link href="/products" className="underline">Buy something</Link>.
          </p>
        )}
        {me.orders.map((order) => (
          <div key={order.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex justify-between text-sm">
              <span>
                <strong>{order.id}</strong> · {formatDate(order.createdAt)} · {order.status}
              </span>
              <span className="font-medium">{formatPrice(order.total)}</span>
            </div>
            <ul className="mt-2 text-sm">
              {order.lines.map((line, i) => (
                <li key={i}>
                  {line.quantity} × {line.product.emoji}{" "}
                  <Link href={`/products/${line.product.slug}`} className="underline">
                    {line.product.name}
                  </Link>{" "}
                  at {formatPrice(line.unitPrice)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
