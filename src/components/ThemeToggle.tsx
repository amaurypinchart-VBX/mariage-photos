"use client";

import { useEffect, useState } from "react";

// Bascule clair/sombre en posant data-theme sur <html>.
export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  function toggle() {
    const root = document.documentElement;
    const cur = root.getAttribute("data-theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const isDark = cur === "dark" || (!cur && prefersDark);
    root.setAttribute("data-theme", isDark ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Changer de thème"
      className="grid h-[34px] w-[34px] place-items-center rounded-full border text-[15px] transition"
      style={{
        borderColor: "var(--line-strong)",
        background: "var(--surface-2)",
        color: "var(--ink-soft)",
      }}
      suppressHydrationWarning
    >
      {mounted ? "☾" : "☾"}
    </button>
  );
}
