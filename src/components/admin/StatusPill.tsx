import { cn } from "@/lib/cn";

const STYLES: Record<string, string> = {
  published: "bg-correct-soft text-correct-ink",
  draft: "bg-xp/25 text-ink",
  archived: "bg-surface-2 text-muted",
  queued: "bg-surface-2 text-ink-soft",
  outlining: "bg-brand-soft text-brand",
  generating: "bg-brand-soft text-brand",
  done: "bg-correct-soft text-correct-ink",
  failed: "bg-wrong-soft text-wrong-ink",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const live = status === "outlining" || status === "generating";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase",
        STYLES[status] ?? "bg-surface-2 text-ink-soft",
        className,
      )}
    >
      {live && <span className="size-1.5 animate-pulse rounded-full bg-current" />}
      {status}
    </span>
  );
}
