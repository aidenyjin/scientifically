import { cn } from "@/lib/cn";

/**
 * Rounded progress bar. Animates with transform (scaleX) so it stays smooth.
 * `value` is 0–1.
 */
export function ProgressBar({
  value,
  color = "var(--correct)",
  className,
  height = 16,
  label,
}: {
  value: number;
  color?: string;
  className?: string;
  height?: number;
  label?: string;
}) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className={cn("relative w-full overflow-hidden rounded-full bg-line", className)}
      style={{ height }}
    >
      <div
        className="absolute inset-y-0 left-0 w-full origin-left rounded-full transition-transform duration-500 ease-[var(--ease-out)]"
        style={{ transform: `scaleX(${v})`, background: color }}
      >
        {/* glossy highlight */}
        <div
          className="absolute top-[22%] right-2 left-2 rounded-full bg-white/30"
          style={{ height: Math.max(3, height * 0.22) }}
        />
      </div>
    </div>
  );
}
