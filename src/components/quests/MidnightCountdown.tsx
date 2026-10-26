"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

/** Time left until local midnight in `timeZone` (when quests reset). */
export function MidnightCountdown({ timeZone }: { timeZone: string }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    const update = () => {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(new Date());
      const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
      const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
      const left = 24 * 60 - (h * 60 + m);
      setLabel(left >= 60 ? `${Math.floor(left / 60)}h ${left % 60}m left` : `${left}m left`);
    };
    const first = window.setTimeout(update, 0);
    const id = window.setInterval(update, 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [timeZone]);
  return (
    <span className="flex items-center gap-1.5 text-sm font-bold text-streak">
      <Clock className="size-4" /> {label ?? "…"}
    </span>
  );
}
