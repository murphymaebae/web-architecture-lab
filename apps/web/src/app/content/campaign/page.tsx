import { Suspense } from "react";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { selectBlocks } from "@lab/content";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { Explainer } from "@/components/Explainer";
import { PageHeading } from "@/components/PageHeading";
import { SegmentSwitcher, SegmentSwitcherSkeleton } from "@/components/SegmentSwitcher";
import { Track } from "@/components/Track";
import { getCmsPage } from "@/lib/cms";
import { formatDate } from "@/lib/format";
import { getSegment } from "@/lib/segment";
import { exitPreview } from "./actions";

export const metadata = { title: "Campaign page" };

export default function CampaignPage() {
  return (
    <>
      <PageHeading title="Page builder + targeting">
        <p>This whole page below the line is assembled from CMS blocks.</p>
      </PageHeading>

      <Explainer>
        <p>
          The CMS entry <code>autumn-campaign</code> is a list of blocks (banner, hero, product
          rail, feature grid, text). <code>BlockRenderer.tsx</code> maps each block type to a React
          component. Editors can reorder or add blocks without a developer.
        </p>
        <p>
          <strong>Targeting:</strong> some blocks have an <code>audience</code> (for example the
          &quot;New here? 10% off&quot; banner is only for new visitors) or a list of <code>channels</code>{" "}
          (the last paragraph is web-only). Switch segment to see the page change. The
          filtering lives in <code>selectBlocks()</code> in <code>packages/content</code>, so the
          mobile app uses exactly the same rules.
        </p>
        <p>
          <strong>Preview:</strong> editors need to see unpublished changes. Open{" "}
          <a className="underline" href="/api/draft?secret=lab-preview-secret&slug=autumn-campaign">
            the preview link
          </a>{" "}
          (a CMS would open this for them). It turns on Next.js <em>Draft Mode</em>, which skips
          every cache for that one browser and shows the draft version, with a Black Friday
          banner added at the top.
        </p>
      </Explainer>

      <Suspense fallback={<SegmentSwitcherSkeleton />}>
        <SegmentSwitcher />
      </Suspense>

      <Track event={{ type: "campaign_view" }} />
      <hr className="border-zinc-200 dark:border-zinc-800" />

      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />}>
        <CampaignContent />
      </Suspense>
    </>
  );
}

async function CampaignContent() {
  const [{ isEnabled: preview }, segment] = await Promise.all([draftMode(), getSegment()]);
  const page = await getCmsPage("autumn-campaign", preview);
  if (!page) notFound();

  const blocks = selectBlocks(page.blocks, { channel: "web", segment });

  return (
    <div className="flex flex-col gap-6">
      {preview && (
        <form action={exitPreview} className="flex items-center justify-between rounded-lg bg-violet-600 px-4 py-2 text-sm text-white">
          <span>
            👀 Preview mode: showing the <strong>draft</strong> saved {formatDate(page.updatedAt)}.
          </span>
          <button className="rounded bg-white/20 px-3 py-1 hover:bg-white/30">Exit preview</button>
        </form>
      )}
      <p className="text-xs text-zinc-500">
        Showing {blocks.length} of {page.blocks.length} blocks for segment <code>{segment}</code> on channel{" "}
        <code>web</code>.
      </p>
      <BlockRenderer blocks={blocks} />
    </div>
  );
}
