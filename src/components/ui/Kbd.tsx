import { cn } from "@/lib/cn";

/** Small keyboard-shortcut hint, e.g. on answer options. */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded-md border-2 border-line px-1.5 font-sans text-xs font-bold text-muted",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
