import Link from "next/link";
import { redirect } from "next/navigation";
import { Character } from "@/characters/Character";
import { Logo } from "@/components/shell/Logo";
import { buttonClassName } from "@/components/ui/Button";
import { getCurrentUser } from "@/server/repo/users";

export default async function WelcomePage() {
  if (await getCurrentUser()) redirect("/learn");
  return (
    <div className="mx-auto flex min-h-dvh max-w-[1100px] flex-col px-10">
      <header className="flex h-20 items-center justify-between">
        <Logo full />
        <Link href="/login" className="text-ink-soft hover:text-ink text-sm font-bold">
          Log in
        </Link>
      </header>
      <main className="grid flex-1 items-center gap-16 pb-16 md:grid-cols-2">
        <div className="relative mx-auto aspect-square w-full max-w-[440px]">
          {/* Soft disc behind Lumi, with a dashed orbit the rest of the cast sits on. */}
          <div className="bg-brand-soft absolute inset-[15%] rounded-full" />
          <div className="border-line-strong absolute inset-[9%] rounded-full border-2 border-dashed" />
          <div className="animate-pop-in absolute inset-[22%]">
            <Character id="lumi" expression="happy" className="size-full" animate />
          </div>
          {ORBIT.map((o, i) => (
            <Orbit key={o} id={o} angle={-126 + i * 72} delay={80 + i * 60} />
          ))}
        </div>
        <div className="text-center md:text-left">
          <h1 className="animate-rise-in font-display text-ink text-[36px] leading-[1.1] font-semibold text-balance md:text-[44px]">
            The fun, <span className="whitespace-nowrap">bite-sized</span> way to{" "}
            <span className="text-brand">learn science</span>.
          </h1>
          <p className="animate-rise-in text-ink-soft mt-4 text-lg [animation-delay:60ms]">
            Balance equations, launch projectiles, read graphs and build streaks — five minutes a
            day.
          </p>
          <div className="animate-rise-in mt-9 grid max-w-sm gap-3 [animation-delay:120ms] max-md:mx-auto">
            <Link href="/onboarding" className={buttonClassName({ size: "lg", block: true })}>
              Get started
            </Link>
            <Link
              href="/login"
              className={buttonClassName({ size: "lg", block: true, variant: "secondary" })}
            >
              I already have an account
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

type CastId = "nova" | "bond" | "volt" | "terra" | "pip";

/** Clockwise from top-left; five evenly spaced seats on the orbit. */
const ORBIT: CastId[] = ["nova", "bond", "volt", "terra", "pip"];

/** A cast member in a round badge centred on the orbit ring (radius 41% of the hero). */
function Orbit({ id, angle, delay }: { id: CastId; angle: number; delay: number }) {
  const rad = (angle * Math.PI) / 180;
  const left = 50 + 41 * Math.cos(rad);
  const top = 50 + 41 * Math.sin(rad);
  return (
    <div
      className="absolute size-[21%] -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${left.toFixed(2)}%`, top: `${top.toFixed(2)}%` }}
    >
      <div
        className="animate-pop-in border-line bg-surface shadow-card grid size-full place-items-center rounded-full border-2"
        style={{ animationDelay: `${delay}ms` }}
      >
        <Character id={id} expression="happy" className="size-[82%] translate-y-[2%]" animate />
      </div>
    </div>
  );
}
