"use client";

/**
 * "Good morning, Aiden" in the learner's own time of day. Rendered on the
 * client clock; the server's hour may differ, so the text is allowed to
 * settle on hydration.
 */
export function Greeting({ name }: { name: string }) {
  const hour = new Date().getHours();
  const part = hour < 5 ? "evening" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const first = name.trim().split(/\s+/)[0] || "there";
  return (
    <span suppressHydrationWarning>
      Good {part}, {first}
    </span>
  );
}
