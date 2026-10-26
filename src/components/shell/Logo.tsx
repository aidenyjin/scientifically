/** Wordmark: a little flask + "scientifically". */
export function Logo({ compact = false, full = false }: { compact?: boolean; full?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden className="shrink-0">
        <path
          d="M12 3h8v2h-1v7.2l7.6 12.3A3 3 0 0 1 24 29H8a3 3 0 0 1-2.6-4.5L13 12.2V5h-1V3Z"
          fill="var(--brand)"
        />
        <path
          d="M9.2 20h13.6l3 4.9A2.4 2.4 0 0 1 23.7 28H8.3a2.4 2.4 0 0 1-2.1-3.1L9.2 20Z"
          fill="var(--correct)"
        />
        <circle cx="13" cy="23.5" r="1.6" fill="white" opacity="0.8" />
        <circle cx="18.5" cy="25" r="1.1" fill="white" opacity="0.7" />
        <rect x="14.5" y="6" width="1.6" height="5" rx=".8" fill="white" opacity="0.5" />
      </svg>
      {!compact && (
        <span
          className={`${full ? "inline" : "hidden xl:inline"} font-display text-brand text-[22px] font-bold tracking-tight`}
        >
          scientifically
        </span>
      )}
    </span>
  );
}
