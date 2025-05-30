"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const COOKIE_NAME = "active_theme";
const DEFAULT_THEME = "blue";

function setThemeCookie(theme: string) {
  if (typeof window === "undefined") return;

  document.cookie = `${COOKIE_NAME}=${theme}; path=/; max-age=31536000; SameSite=Lax; ${
    window.location.protocol === "https:" ? "Secure;" : ""
  }`;
}

type ThemeContextType = {
  activeTheme: string;
  setActiveTheme: (theme: string) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ActiveThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme?: string;
}) {

  const [activeTheme, setActiveTheme] = useState<string | null>(null)

useEffect(() => {
  const savedTheme = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`))
    ?.split("=")[1]

  setActiveTheme(savedTheme || DEFAULT_THEME)
}, [])

useEffect(() => {
  if (!activeTheme) return

  setThemeCookie(activeTheme)

  // Remove temas antigos
  Array.from(document.body.classList)
    .filter((className) => className.startsWith("theme-"))
    .forEach((className) => {
      document.body.classList.remove(className)
    })

  document.body.classList.add(`theme-${activeTheme}`)
  if (activeTheme.endsWith("-scaled")) {
    document.body.classList.add("theme-scaled")
  }
}, [activeTheme])

const theme = activeTheme ?? DEFAULT_THEME;

  return (
    <ThemeContext.Provider value={{ activeTheme: theme, setActiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeConfig() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error(
      "useThemeConfig must be used within an ActiveThemeProvider"
    );
  }
  return context;
}