"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
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
  return <button className="theme-toggle" type="button" onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
    <span aria-hidden="true">{theme === "dark" ? "Light" : "Dark"}</span>
  </button>;
}
