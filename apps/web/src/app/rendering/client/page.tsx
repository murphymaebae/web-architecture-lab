import { Explainer } from "@/components/Explainer";
import { StrategyLayout } from "@/components/StrategyLayout";
import { ClientProducts } from "./ClientProducts";

export const metadata = { title: "Client-side rendering" };

export default function ClientPage() {
  return (
    <StrategyLayout slug="client">
      <Explainer>
        <p>
          With <strong>client-side rendering (CSR)</strong> the server sends an almost empty page
          plus JavaScript. The browser runs that JavaScript, calls an API
          (<code>/api/products</code>), and builds the product list itself.
        </p>
        <p>
          You can see the cost: the skeleton appears first, and only then does the browser start
          asking for data. Search engines and link previews may only see the empty skeleton. The
          upside is rich interactivity: the filter re-renders instantly without a page load.
        </p>
        <p>
          Modern React mixes both: Server Components for most of the page, and small Client
          Components (<code>&quot;use client&quot;</code>) only where you need interactivity. Look at
          the source: only <code>ClientProducts.tsx</code> is a Client Component.
        </p>
      </Explainer>
      <ClientProducts />
    </StrategyLayout>
  );
}
