"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinksProps {
  links: readonly { href: string; label: string }[];
}

export function NavLinks({ links }: NavLinksProps) {
  const pathname = usePathname() ?? "/";

  return (
    <>
      {links.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link ${active ? "nav-link-active" : ""}`}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
