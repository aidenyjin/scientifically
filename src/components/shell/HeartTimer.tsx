"use client";

import { useEffect, useState } from "react";

/** "Next heart in 2:14:05", ticking each second. */
export function HeartTimer({
  nextHeartAt,
  className,
}: {
  nextHeartAt: string | null;
  className?: string;
}) {
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    if (!nextHeartAt) return;
    const tick = () => setNowMs(Date.now());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [nextHeartAt]);

  if (!nextHeartAt)
    return <p className={className ?? "text-muted text-sm font-bold"}>Hearts are full</p>;
  const left = nowMs === null ? null : Math.max(0, new Date(nextHeartAt).getTime() - nowMs);
  return (
    <p className={className ?? "text-muted text-sm font-bold"}>
      Next heart in <span className="tabular-nums">{left === null ? "…" : formatHms(left)}</span>
    </p>
  );
}

function formatHms(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
