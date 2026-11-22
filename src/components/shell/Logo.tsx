/** Wordmark: a small atom drawn in one line + "Scientifically" set in the heading serif. */
export function Logo({ compact = false, full = false }: { compact?: boolean; full?: boolean }) {
  return (
    <span className="text-ink flex items-center gap-2.5">
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden className="shrink-0" fill="none">
        <g stroke="currentColor" strokeWidth="1.5">
          <ellipse cx="12" cy="12" rx="10" ry="4.2" />
          <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(120 12 12)" />
        </g>
        <circle cx="12" cy="12" r="1.8" fill="var(--brand)" />
      </svg>
      {!compact && (
        <span
          className={`${full ? "inline" : "hidden xl:inline"} font-heading text-[25px] leading-none font-normal tracking-[-0.01em]`}
        >
          Scientifically
        </span>
      )}
    </span>
  );
}
