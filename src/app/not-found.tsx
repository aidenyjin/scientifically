import Link from "next/link";
import { Character } from "@/characters/Character";
import { buttonClassName } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg px-6 text-center">
      <Character id="terra" expression="thinking" size={140} animate />
      <h1 className="mt-4 font-display text-3xl font-semibold text-ink">This page wandered off</h1>
      <p className="mt-2 max-w-sm text-balance text-ink-soft">
        We couldn&apos;t find what you were looking for. It may have moved, or the link might be mistyped.
      </p>
      <Link href="/learn" className={buttonClassName({ size: "lg", className: "mt-8" })}>
        Back to learning
      </Link>
    </main>
  );
}
