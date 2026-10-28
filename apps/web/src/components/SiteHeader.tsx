import Link from "next/link";

const links = [
  { href: "/rendering", label: "Rendering" },
  { href: "/content", label: "Content" },
  { href: "/products", label: "Products" },
];

/** The top navigation bar. It has no data or runtime APIs, so Next.js
 * prerenders it once and reuses it for every page. */
export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
        <Link href="/" className="font-semibold">
          ⛰️ Trailhead <span className="font-normal text-zinc-500">· Architecture Lab</span>
        </Link>
        <ul className="ml-auto flex gap-4 text-sm">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="hover:text-emerald-600">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
