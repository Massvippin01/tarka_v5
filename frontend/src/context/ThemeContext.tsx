import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "obsidian-glass" | "midnight-teal" | "porcelain" | "obsidian" | "high-contrast";

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("tarka_v5_theme");
      if (stored === "porcelain" || stored === "obsidian" || stored === "midnight-teal" || stored === "obsidian-glass" || stored === "high-contrast") {
        return stored as ThemeMode;
      }
    }
    // Phase 15 Canonical Default: Admin Dashboard V2 Midnight Navy & Ocean Blue Glass
    return "obsidian-glass";
  });

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("tarka_v5_theme", newTheme);
      document.documentElement.setAttribute("data-theme", newTheme);
    }
  };

  const cycleTheme = () => {
    const modes: ThemeMode[] = ["obsidian-glass", "midnight-teal", "porcelain", "obsidian"];
    const currentNormalized = theme;
    const nextIdx = (modes.indexOf(currentNormalized) + 1) % modes.length;
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
