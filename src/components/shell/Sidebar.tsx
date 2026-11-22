"use client";

import { House, Library, Store, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Logo } from "./Logo";

const NAV = [
  { href: "/learn", label: "Home", icon: House },
  { href: "/courses", label: "Courses", icon: Library },
  { href: "/shop", label: "Shop", icon: Store },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="sticky top-0 flex h-dvh w-[76px] shrink-0 flex-col px-3 py-6 xl:w-[248px] xl:px-3.5"
    >
      <Link
        href="/learn"
        className="mb-9 flex h-9 items-center gap-2 px-2.5"
        aria-label="Scientifically home"
      >
        <Logo />
      </Link>
      <ul className="grid gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                title={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-[background-color,color,transform] duration-150 active:scale-[0.97]",
                  active
                    ? "bg-surface text-ink font-medium shadow-[0_0_0_1px_var(--line),0_1px_3px_rgb(40_30_20/0.06)]"
                    : "text-ink-soft hover:bg-surface-2/70 hover:text-ink",
                )}
              >
                <Icon className="size-[19px] shrink-0" strokeWidth={1.6} />
                <span className="sr-only xl:not-sr-only">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
