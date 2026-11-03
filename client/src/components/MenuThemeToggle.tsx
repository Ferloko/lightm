import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export default function MenuThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return <button className="menu-theme-toggle" type="button" onClick={toggleTheme} aria-label={`Cambiar a modo ${theme === "light" ? "oscuro" : "claro"}`} title={theme === "light" ? "Dark mode" : "Light mode"}><span key={theme} className="menu-theme-toggle__icon"><>{theme === "light" ? <Moon size={17} /> : <Sun size={17} />}</></span></button>;
}
