"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./Icons";

export default function ThemeToggle({ iconOnly = false }) {
  const [theme, setTheme] = useState("dark");
  useEffect(() => setTheme(document.documentElement.dataset.theme || "dark"), []);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    localStorage.setItem("theme", next);
    document.cookie = `theme=${next};path=/;max-age=31536000;SameSite=Lax`;
    setTheme(next);
  }
  return <button className={`theme-toggle${iconOnly ? " icon-only" : ""}`} type="button" onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
    <span className="t-icon-swap" data-state={theme === "dark" ? "sun" : "moon"} aria-hidden="true"><span className="t-icon" data-icon="sun"><SunIcon /></span><span className="t-icon" data-icon="moon"><MoonIcon /></span></span>{!iconOnly && <span>{theme === "dark" ? "Light" : "Dark"}</span>}
  </button>;
}
