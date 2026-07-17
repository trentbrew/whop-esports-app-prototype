"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Breadcrumbs as FrostedBreadcrumbs } from "@whop/react/components";

const LABELS: Record<string, string> = {
  account: "Account",
  admin: "Organizer",
  checkout: "Checkout",
  complete: "Complete",
};

type Crumb = { href: string; label: string };

export function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);

  const trail: Crumb[] = [{ href: "/", label: "Home" }];

  for (let i = 0; i < parts.length; i++) {
    const segment = parts[i];
    if (segment === "t") continue;
    trail.push({
      href: "/" + parts.slice(0, i + 1).join("/"),
      label: LABELS[segment] ?? segment,
    });
  }

  return (
    <FrostedBreadcrumbs.Root color="gray">
      {trail.map((c, i) => {
        const last = i === trail.length - 1;
        return (
          <FrostedBreadcrumbs.Item
            key={`${c.href}-${i}`}
            asChild={!last}
            disabled={last}
          >
            {last ? (
              <span>{c.label}</span>
            ) : (
              <Link href={c.href}>{c.label}</Link>
            )}
          </FrostedBreadcrumbs.Item>
        );
      })}
    </FrostedBreadcrumbs.Root>
  );
}
