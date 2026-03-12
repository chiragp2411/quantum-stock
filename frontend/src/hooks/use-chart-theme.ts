"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  return {
    gridColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
    tickColor: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)",
    legendColor: isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.75)",
    isDark,
  };
}
