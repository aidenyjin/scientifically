import { cn } from "@/lib/cn";

/**
 * Thin progress bar. Animates with transform (scaleX) so it stays smooth.
 * `value` is 0–1. `height` is capped at 8px: bars are a quiet readout here,
 * not a feature.
 */
export function ProgressBar({
  value,
  color = "var(--brand)",
  className,
  height = 6,
  label,
}: {
  value: number;
  color?: string;
  className?: string;
  height?: number;
  label?: string;
}) {
  const v = Math.max(0, Math.min(1, value));
  const h = Math.min(8, Math.max(4, Math.round(height * 0.5)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className={cn("bg-line relative w-full overflow-hidden rounded-full", className)}
      style={{ height: h }}
    >
      <div
        className="absolute inset-y-0 left-0 w-full origin-left rounded-full transition-transform duration-500 ease-[var(--ease-out)]"
        style={{ transform: `scaleX(${v})`, background: color }}
      />
    </div>
  );
}
