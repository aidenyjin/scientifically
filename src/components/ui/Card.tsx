import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-3xl border border-line bg-surface p-5 shadow-card", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={cn("font-heading text-xl font-normal tracking-[-0.01em] text-ink", className)}>{children}</h3>;
}
