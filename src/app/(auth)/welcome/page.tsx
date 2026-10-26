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
        <Link href="/login" className="text-sm font-bold text-ink-soft hover:text-ink">
          Log in
        </Link>
      </header>
      <main className="grid flex-1 items-center gap-16 pb-16 md:grid-cols-2">
        <div className="relative mx-auto grid aspect-square w-full max-w-[460px] place-items-center">
          <div className="absolute inset-[8%] rounded-full bg-brand-soft" />
          <div className="relative animate-pop-in">
            <Character id="lumi" expression="happy" size={250} animate />
          </div>
          <Orbit id="nova" className="top-[4%] left-[10%]" delay={80} />
          <Orbit id="bond" className="top-[10%] right-[6%]" delay={140} />
          <Orbit id="pip" className="bottom-[12%] left-[2%]" delay={200} />
          <Orbit id="volt" className="right-[2%] bottom-[18%]" delay={260} />
          <Orbit id="terra" className="bottom-[0%] left-[40%]" delay={320} />
        </div>
        <div className="text-center md:text-left">
          <h1 className="animate-rise-in font-display text-[44px] leading-[1.1] font-semibold text-balance text-ink">
            The fun, bite-sized way to <span className="text-brand">learn science</span>.
          </h1>
          <p className="mt-4 animate-rise-in text-lg text-ink-soft [animation-delay:60ms]">
            Balance equations, launch projectiles, read graphs and build streaks — five minutes a day.
          </p>
          <div className="mt-9 grid max-w-sm animate-rise-in gap-3 [animation-delay:120ms] max-md:mx-auto">
            <Link href="/onboarding" className={buttonClassName({ size: "lg", block: true })}>
              Get started
            </Link>
            <Link href="/login" className={buttonClassName({ size: "lg", block: true, variant: "secondary" })}>
              I already have an account
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function Orbit({ id, className, delay }: { id: "nova" | "bond" | "pip" | "volt" | "terra"; className: string; delay: number }) {
  return (
    <div className={`absolute animate-pop-in ${className}`} style={{ animationDelay: `${delay}ms` }}>
      <Character id={id} expression="happy" size={92} animate />
    </div>
  );
}
