"use client";

import { cn } from "@/lib/cn";

/** Accessible on/off switch. The knob slides with transform only. */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-8 w-14 shrink-0 rounded-full transition-colors duration-200",
        checked ? "bg-correct" : "bg-line-strong",
        disabled && "opacity-60",
      )}
    >
      <span
        aria-hidden
        className="absolute top-1 left-1 size-6 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[var(--ease-out)]"
        style={{ transform: checked ? "translateX(24px)" : "translateX(0)" }}
      />
    </button>
  );
}
