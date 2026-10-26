"use client";

import { Dumbbell, House, ScrollText, ShieldHalf, Store, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Logo } from "./Logo";

const NAV = [
  { href: "/learn", label: "Learn", icon: House, color: "var(--brand)" },
  { href: "/practice", label: "Practice", icon: Dumbbell, color: "var(--heart)" },
  { href: "/leagues", label: "Leagues", icon: ShieldHalf, color: "var(--xp-dark)" },
  { href: "/quests", label: "Quests", icon: ScrollText, color: "var(--streak)" },
  { href: "/shop", label: "Shop", icon: Store, color: "var(--gem)" },
  { href: "/profile", label: "Profile", icon: UserRound, color: "var(--correct)" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="border-line sticky top-0 flex h-dvh w-[88px] shrink-0 flex-col border-r-2 px-3 py-6 xl:w-[248px] xl:px-4"
    >
      <Link
        href="/learn"
        className="mb-8 flex items-center gap-2 px-2.5"
        aria-label="Scientifically home"
      >
        <Logo />
      </Link>
      <ul className="grid gap-1.5">
        {NAV.map(({ href, label, icon: Icon, color }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                title={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "font-display flex h-12 items-center gap-4 rounded-2xl border-2 px-3 text-[15px] font-semibold tracking-wide uppercase transition-colors duration-150",
                  active
                    ? "border-brand/50 bg-brand-soft text-brand"
                    : "text-ink-soft hover:bg-surface-2 border-transparent",
                )}
              >
                <Icon className="size-[26px] shrink-0" strokeWidth={2.4} style={{ color }} />
                <span className="sr-only xl:not-sr-only">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
