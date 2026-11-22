import { cn } from "@/lib/cn";

/** Small keyboard-shortcut hint, e.g. on answer options. */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "border-line-strong text-muted inline-flex h-6 min-w-6 items-center justify-center rounded-md border px-1.5 font-mono text-[11px] font-normal",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
