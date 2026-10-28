import { Explainer } from "@/components/Explainer";
import { PageHeading } from "@/components/PageHeading";
import { Playground } from "@/components/playground/Playground";

export const metadata = { title: "Architecture playground" };

/**
 * This page itself is a Server Component and is prerendered once at build time
 * (it has no data). The interactive part, <Playground>, is a Client Component:
 * its JavaScript is sent to the browser, and the simulation runs there.
 */
export default function PlaygroundPage() {
  return (
    <>
      <PageHeading title="Architecture playground">
        <p>
          Build a system out of boxes, send traffic through it, and break things. Every number
          updates live: tweak a setting or crash a box and watch the effect ripple through to what
          users feel.
        </p>
      </PageHeading>

      {/* Break out of the page's normal width so the canvas has room. */}
      <div className="relative left-1/2 w-[min(1400px,calc(100vw-2rem))] -translate-x-1/2">
        <Playground />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Explainer title="How to read the numbers">
          <p>
            <strong>req/s</strong> is requests per second. <strong>Busy</strong> is how close a box
            is to its capacity. Boxes go amber past 80% and red when they start refusing work.
          </p>
          <p>
            <strong>p50 / p95 / p99</strong> are percentiles. p95 = 300 ms means 95 out of 100
            requests finish within 300 ms. Averages hide the slow ones; percentiles don&apos;t.
          </p>
          <p>
            Dots on the arrows are traffic (more dots = more requests).{" "}
            <span className="text-red-600">Red dots</span> are requests that will fail somewhere
            further along.
          </p>
        </Explainer>
        <Explainer title="How the simulation works">
          <p>
            Ten times a second, the engine follows the traffic from the users down through each box.
            Each box can handle <code>capacity × replicas</code> requests per second. Beyond that,
            requests wait in a short line, and once the line is full they are refused.
          </p>
          <p>
            Waiting time grows sharply as a box gets busy (queueing theory: at 50% busy you wait
            about 1× the work time, at 90% about 9×). Then it works back up from the databases to
            the users, adding up latencies to get the percentiles.
          </p>
          <p>
            It&apos;s a model with made-up numbers, not a benchmark. The shapes of the curves are
            the lesson. Read more in <code>docs/learning/05-playground.md</code>.
          </p>
        </Explainer>
      </div>
    </>
  );
}
