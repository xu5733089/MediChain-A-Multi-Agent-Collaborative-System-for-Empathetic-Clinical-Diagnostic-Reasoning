import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({ dark: false, toggle: () => {} });

function useTheme() {
  return useContext(ThemeContext);
}

function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("medichain-theme");
    if (stored === "dark") return true;
    if (stored === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      dark ? "dark" : "light",
    );
    localStorage.setItem("medichain-theme", dark ? "dark" : "light");
  }, [dark]);

  const toggle = () => setDark((value) => !value);

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export { ThemeProvider, useTheme };
