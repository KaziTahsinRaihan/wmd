"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

export default function ThemeToggle({
  className = "",
  label = false,
}: {
  className?: string;
  label?: boolean;
}) {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={`inline-flex items-center gap-2 rounded-lg border border-gold-500/30 bg-ink-900/60 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 transition ${className}`}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {label && <span className="capitalize">{next}</span>}
    </button>
  );
}
