"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@whop/react/components";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/account", label: "Account" },
  { href: "/admin", label: "Organizer", tag: "admin" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav>
      {LINKS.map((l) => {
        const active =
          l.href === "/"
            ? pathname === "/" || pathname.startsWith("/t/")
            : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`navlink${active ? " active" : ""}`}
          >
            {l.label}
            {l.tag && (
              <Badge size="1" color="blue" variant="soft">
                {l.tag}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
