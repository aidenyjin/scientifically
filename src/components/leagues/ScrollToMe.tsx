"use client";

import { useEffect } from "react";

/** Scroll the signed-in user's league row into view on load. */
export function ScrollToMe() {
  useEffect(() => {
    const row = document.querySelector("[data-me]");
    if (!row) return;
    // Only scroll when the row isn't already fully visible, and then centre it
    // so the rows around it (and the zone lines) stay in view.
    const r = row.getBoundingClientRect();
    if (r.top >= 0 && r.bottom <= window.innerHeight) return;
    row.scrollIntoView({ block: "center" });
  }, []);
  return null;
}
