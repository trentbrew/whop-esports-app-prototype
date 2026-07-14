"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Circuit" },
  { href: "/account", label: "Account" },
  { href: "/admin", label: "Organizer", tag: "admin" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav>
      {LINKS.map((l) => {
        const active =
          l.href === "/" ? pathname === "/" || pathname.startsWith("/t/") : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`navlink${active ? " active" : ""}`}
          >
            {l.label}
            {l.tag && <span className="tag">{l.tag}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
