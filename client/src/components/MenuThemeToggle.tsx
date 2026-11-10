import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

/** Light / dark switch: a sliding thumb over sun and moon, with a text label for the current mode. */
export default function MenuThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  return <button className={`theme-switch${dark ? " is-dark" : ""}`} type="button" role="switch" aria-checked={dark} onClick={toggleTheme} aria-label="Modo oscuro" title={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>
    <span className="theme-switch__track" aria-hidden="true">
      <span className="theme-switch__thumb" />
      <Sun className="theme-switch__icon theme-switch__icon--sun" size={14} strokeWidth={1.6} />
      <Moon className="theme-switch__icon theme-switch__icon--moon" size={13} strokeWidth={1.6} />
    </span>
    <span className="theme-switch__label">{dark ? "Oscuro" : "Claro"}</span>
  </button>;
}
