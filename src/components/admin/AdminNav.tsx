"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const LINKS = [
  {
    href: "/admin",
    label: "Packs",
    match: (p: string) => p === "/admin" || p.startsWith("/admin/packs"),
  },
  {
    href: "/admin/generate",
    label: "Generate",
    match: (p: string) => p.startsWith("/admin/generate"),
  },
  { href: "/admin/jobs", label: "Jobs", match: (p: string) => p.startsWith("/admin/jobs") },
  { href: "/admin/agents", label: "Agents", match: (p: string) => p.startsWith("/admin/agents") },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex items-center gap-1">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={l.match(pathname) ? "page" : undefined}
          className={cn(
            "font-display rounded-xl px-3 py-2 text-sm font-semibold tracking-wide uppercase transition-colors duration-150",
            l.match(pathname) ? "bg-brand-soft text-brand" : "text-ink-soft hover:bg-surface-2",
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
