"use client";

import { useRouter } from "next/navigation";
import { useHotkeys } from "@/lib/keyboard";

/** Laptop shortcut on Home: Enter starts the next lesson. */
export function StartShortcut({ href }: { href: string }) {
  const router = useRouter();
  useHotkeys({ Enter: () => router.push(href) });
  return null;
}
