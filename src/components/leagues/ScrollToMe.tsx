"use client";

import { useEffect } from "react";

/** Scroll the signed-in user's league row into view on load. */
export function ScrollToMe() {
  useEffect(() => {
    document.querySelector("[data-me]")?.scrollIntoView({ block: "nearest" });
  }, []);
  return null;
}
