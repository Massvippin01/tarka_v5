import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "porcelain" | "obsidian" | "midnight-teal" | "obsidian-glass" | "high-contrast";

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sentinelx_theme");
      if (stored === "obsidian" || stored === "obsidian-glass" || stored === "porcelain" || stored === "midnight-teal" || stored === "high-contrast") {
        return stored as ThemeMode;
      }
      if (stored === "forensic-paper") return "porcelain";
      if (stored === "night-ops" || stored === "tarka") return "obsidian";
    }
    // Default to Daylight Executive Bento (porcelain)
    return "porcelain";
  });

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("sentinelx_theme", newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
    }
  };

  const cycleTheme = () => {
    const modes: ThemeMode[] = ["porcelain", "obsidian", "midnight-teal"];
    const currentNormalized = theme === "obsidian-glass" ? "obsidian" : theme;
    const nextIdx = (modes.indexOf(currentNormalized as ThemeMode) + 1) % modes.length;
    setTheme(modes[nextIdx]);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  // Global theme cycle shortcut (Alt + T)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "t" || e.key === "T")) {
        e.preventDefault();
        cycleTheme();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
};
