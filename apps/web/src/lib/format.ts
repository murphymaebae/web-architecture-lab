// Small formatting helpers shared by server and client code.

export function formatPrice(dollars: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(dollars);
}

/** "14:05:09.123 UTC" - precise enough to see two renders a second apart. */
export function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number, size = 2) => String(n).padStart(size, "0");
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${pad(d.getUTCMilliseconds(), 3)} UTC`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" });
}
