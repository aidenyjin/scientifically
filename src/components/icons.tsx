/** Filled game-stat icons with a soft highlight, sized by `size` (px). */
type IconProps = { size?: number; className?: string; muted?: boolean };

export function FlameIcon({ size = 24, className, muted }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path
        d="M12 1.8c1 3.2 3.4 5 5 7.3 1.3 1.8 2.1 3.8 2.1 6A7.1 7.1 0 0 1 12 22.2a7.1 7.1 0 0 1-7.1-6.9c0-2.4 1-4.4 2.5-6 .3 1.7 1.2 2.9 2.4 3.4-.4-3.6.8-7.7 2.2-10.9Z"
        fill={muted ? "var(--line-strong)" : "var(--streak)"}
      />
      <path
        d="M12 11.6c.7 1.8 2.9 3 2.9 5.6a2.9 2.9 0 0 1-5.8 0c0-1.4.6-2.4 1.2-3.1.2.9.7 1.5 1.2 1.7-.1-1.5.1-2.9.5-4.2Z"
        fill={muted ? "var(--surface)" : "#ffd23f"}
      />
      {!muted && <ellipse cx="7.6" cy="14.6" rx="0.9" ry="1.9" transform="rotate(20 7.6 14.6)" fill="white" opacity="0.35" />}
    </svg>
  );
}

export function GemIcon({ size = 24, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path d="M7 3.5h10l4.5 5.2L12 21 2.5 8.7 7 3.5Z" fill="var(--gem)" />
      <path d="M7 3.5h10l-2.2 5.2H9.2L7 3.5Z" fill="#7fd6ff" />
      <path d="M2.5 8.7h6.7L12 21 2.5 8.7Z" fill="var(--gem-dark)" />
      <path d="M9.2 8.7 12 3.6l2.8 5.1H9.2Z" fill="#b8ebff" />
    </svg>
  );
}

export function HeartIcon({ size = 24, className, muted }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path
        d="M12 20.5s-8.5-5.1-8.5-11A4.7 4.7 0 0 1 12 6.6a4.7 4.7 0 0 1 8.5 2.9c0 5.9-8.5 11-8.5 11Z"
        fill={muted ? "var(--line-strong)" : "var(--heart)"}
      />
      <ellipse cx="8" cy="9.3" rx="2" ry="1.3" fill="white" opacity={muted ? 0.4 : 0.55} transform="rotate(-30 8 9.3)" />
    </svg>
  );
}

export function BoltIcon({ size = 24, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path d="M13.5 2 4.5 13.5h6L9.5 22l9-12h-6.2L13.5 2Z" fill="var(--xp)" />
      <path d="M13.5 2 9 7.8l3.3.3L13.5 2Z" fill="#fff2b0" />
    </svg>
  );
}

export function SnowflakeIcon({ size = 24, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden fill="none">
      <g stroke="var(--freeze)" strokeWidth="2.4" strokeLinecap="round">
        <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
        <path d="M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5" />
      </g>
    </svg>
  );
}

export function TrophyIcon({ size = 24, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path d="M7 3h10v5a5 5 0 0 1-10 0V3Z" fill="var(--xp)" />
      <path d="M7 5H4.5a2.5 2.5 0 0 0 2.6 3.6M17 5h2.5a2.5 2.5 0 0 1-2.6 3.6" stroke="var(--xp-dark)" strokeWidth="1.8" fill="none" />
      <path d="M10.5 12.5h3l.7 4h-4.4l.7-4Z" fill="var(--xp-dark)" />
      <rect x="7.5" y="16.5" width="9" height="3.5" rx="1.2" fill="var(--xp-dark)" />
      <path d="M9 4.5h2v4.5a2 2 0 0 1-2-2V4.5Z" fill="#fff2b0" />
    </svg>
  );
}

export function ChestIcon({ size = 24, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <rect x="3" y="10" width="18" height="10" rx="2" fill="#c47a2c" />
      <path d="M3 10a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5H3Z" fill="#e0953f" />
      <rect x="3" y="10" width="18" height="2.4" fill="#8f531a" />
      <rect x="10.2" y="9" width="3.6" height="5" rx="1" fill="var(--xp)" />
    </svg>
  );
}
