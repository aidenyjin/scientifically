/** Shield badge for a league tier. Colours climb from grey-blue (Quark) to cosmic purple (Galaxy). */
const TIER_COLORS = ["#8fa3bf", "#5ccfff", "#2bc46b", "#14b8a6", "#ff9600", "#ff4b6e", "#1cb0f6", "#ffc800", "#a560e8", "#6c5ce7"];

export function LeagueBadge({ tier, size = 56, muted = false }: { tier: number; size?: number; muted?: boolean }) {
  const color = muted ? "var(--line-strong)" : TIER_COLORS[tier % TIER_COLORS.length];
  return (
    <svg viewBox="0 0 48 56" width={size} height={(size * 56) / 48} aria-hidden>
      <path d="M24 2 44 9v17c0 13-9 22-20 28C13 48 4 39 4 26V9l20-7Z" fill={color} />
      <path d="M24 2 44 9v17c0 13-9 22-20 28V2Z" fill="black" opacity="0.12" />
      <path d="M24 8 38 13v13c0 9-6 16-14 21-8-5-14-12-14-21V13l14-5Z" fill="white" opacity="0.22" />
      <text x="24" y="33" textAnchor="middle" fontSize="15" fontWeight="800" fill="white" fontFamily="var(--font-fredoka)">
        {tier + 1}
      </text>
    </svg>
  );
}

export { TIER_COLORS };
