"use client";

import { useActionState } from "react";
import { buyProduct, type BuyState } from "@/app/actions/orders";
import { formatPrice } from "@/lib/format";

/** A form wired to a Server Action. useActionState gives us the action's
 * latest result and whether it is still running ("pending"). */
export function BuyButton({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState<BuyState, FormData>(buyProduct, { status: "idle" });

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="productId" value={productId} />
      <button
        disabled={pending}
        className="w-fit rounded-lg bg-emerald-600 px-5 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Placing order..." : "Buy now"}
      </button>
      {state.status === "ok" && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          ✅ Order {state.orderId} placed ({formatPrice(state.total)}). See it on your Account page.
        </p>
      )}
      {state.status === "error" && <p className="text-sm text-rose-600">{state.message}</p>}
    </form>
  );
}
