/**
 * Game-stat icons in the cast's line style: one flat fill, a thin darker
 * outline, no gloss. Sized by `size` (px).
 */
type IconProps = { size?: number; className?: string; muted?: boolean };

const LINE = { strokeWidth: 1.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

export function FlameIcon({ size = 24, className, muted }: IconProps) {
  const fill = muted ? "var(--surface-2)" : "var(--streak)";
  const edge = muted ? "var(--line-strong)" : "var(--streak-dark)";
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path
        d="M12 2.5c.9 3 3.2 4.7 4.7 6.9 1.2 1.7 1.9 3.6 1.9 5.7A6.6 6.6 0 0 1 12 21.6a6.6 6.6 0 0 1-6.6-6.4c0-2.2.9-4.1 2.3-5.6.3 1.6 1.1 2.7 2.2 3.2-.4-3.4.7-7.2 2.1-10.3Z"
        fill={fill}
        stroke={edge}
        {...LINE}
      />
      <path
        d="M12 12.4c.6 1.6 2.6 2.7 2.6 5a2.6 2.6 0 0 1-5.2 0c0-1.3.5-2.2 1.1-2.8.2.8.6 1.3 1.1 1.5-.1-1.3.1-2.6.4-3.7Z"
        fill={muted ? "var(--surface)" : "#f3d9a4"}
        stroke={edge}
        {...LINE}
        strokeWidth={1.2}
      />
    </svg>
  );
}

export function GemIcon({ size = 24, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path d="M7.2 4h9.6l4.2 5L12 20.5 3 9l4.2-5Z" fill="var(--gem)" stroke="var(--gem-dark)" {...LINE} />
      <path d="M3 9h18M9.4 9 12 4.2 14.6 9 12 20.3 9.4 9Z" fill="none" stroke="var(--gem-dark)" {...LINE} strokeWidth={1.1} />
    </svg>
  );
}

export function HeartIcon({ size = 24, className, muted }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path
        d="M12 20s-8-4.8-8-10.5A4.5 4.5 0 0 1 12 6.8a4.5 4.5 0 0 1 8 2.7C20 15.2 12 20 12 20Z"
        fill={muted ? "var(--surface-2)" : "var(--heart)"}
        stroke={muted ? "var(--line-strong)" : "color-mix(in oklab, var(--heart) 70%, black)"}
        {...LINE}
      />
    </svg>
  );
}

export function BoltIcon({ size = 24, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path d="M13.5 2.5 5 13.5h6l-1 8 8.5-11.3h-6l1-7.7Z" fill="var(--xp)" stroke="var(--xp-dark)" {...LINE} />
    </svg>
  );
}

export function SnowflakeIcon({ size = 24, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden fill="none">
      <g stroke="var(--freeze)" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
        <path d="M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5" />
      </g>
    </svg>
  );
}

export function TrophyIcon({ size = 24, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path
        d="M7 5H4.5a2.5 2.5 0 0 0 2.7 3.6M17 5h2.5a2.5 2.5 0 0 1-2.7 3.6"
        fill="none"
        stroke="var(--xp-dark)"
        {...LINE}
      />
      <path d="M7 3.5h10V8a5 5 0 0 1-10 0V3.5Z" fill="var(--xp)" stroke="var(--xp-dark)" {...LINE} />
      <path d="M10.6 13h2.8l.6 3.5h-4l.6-3.5Z" fill="var(--xp)" stroke="var(--xp-dark)" {...LINE} />
      <rect x="7.5" y="16.5" width="9" height="3.5" rx="1.2" fill="var(--xp)" stroke="var(--xp-dark)" {...LINE} />
    </svg>
  );
}

export function ChestIcon({ size = 24, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path d="M3.5 10.5a5 5 0 0 1 5-5h7a5 5 0 0 1 5 5H3.5Z" fill="#d4a46a" stroke="#8a5a2b" {...LINE} />
      <rect x="3.5" y="10.5" width="17" height="9" rx="1.8" fill="#c58d4f" stroke="#8a5a2b" {...LINE} />
      <rect x="10.4" y="9.2" width="3.2" height="4.6" rx="1" fill="var(--xp)" stroke="#8a5a2b" {...LINE} strokeWidth={1.2} />
    </svg>
  );
}
