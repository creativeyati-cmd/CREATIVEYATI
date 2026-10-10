"use client";
import { useEffect } from "react";

function setNavigation(element, open, restore = false) {
  if (!element) return;
  const mobile = window.matchMedia("(max-width: 899px)").matches;
  element.classList.toggle("is-nav-open", open && mobile);
  const aside = element.querySelector("aside");
  aside.inert = mobile && !open;
  const main = element.querySelector(".admin-main");
  if (main) main.inert = mobile && open;
  const tabs = element.querySelector(".student-bottom-nav");
  if (tabs) tabs.inert = mobile && open;
  const trigger = element.querySelector(".admin-nav-trigger");
  trigger?.setAttribute("aria-expanded", String(open && mobile));
  if (open && mobile) aside.querySelector("a, button")?.focus();
  else if (restore && mobile) trigger?.focus();
}

export default function useDashboardShell(shell, storageKey, pathname) {
  useEffect(() => {
    const element = shell.current;
    try { element.classList.toggle("is-collapsed", localStorage.getItem(storageKey) === "collapsed"); } catch {}
    const collapsed = element.classList.contains("is-collapsed");
    const collapseButton = element.querySelector(".admin-shell-toggle");
    collapseButton?.setAttribute("aria-expanded", String(!collapsed));
    collapseButton?.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
    collapseButton?.setAttribute("title", collapsed ? "Expand sidebar" : "Collapse sidebar");
    const breakpoint = window.matchMedia("(max-width: 899px)");
    const resize = () => setNavigation(element, false);
    const keyboard = (event) => {
      if (!element.classList.contains("is-nav-open")) return;
      if (event.key === "Escape") { setNavigation(element, false, true); return; }
      if (event.key !== "Tab") return;
      const targets = [...element.querySelectorAll('aside a[href], aside button:not([disabled]), aside input')].filter(node => node.getClientRects().length);
      const first = targets[0], last = targets.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    resize();
    breakpoint.addEventListener("change", resize); window.addEventListener("keydown", keyboard);
    return () => { breakpoint.removeEventListener("change", resize); window.removeEventListener("keydown", keyboard); };
  }, [shell, storageKey]);
  useEffect(() => { setNavigation(shell.current, false); }, [pathname, shell]);
  function toggle() {
    const element = shell.current, collapsed = element.classList.toggle("is-collapsed");
    try { localStorage.setItem(storageKey, collapsed ? "collapsed" : "expanded"); } catch {}
    const button = element.querySelector(".admin-shell-toggle");
    button?.setAttribute("aria-expanded", String(!collapsed));
    button?.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
    button?.setAttribute("title", collapsed ? "Expand sidebar" : "Collapse sidebar");
  }
  function toggleNav() {
    const element = shell.current;
    setNavigation(element, !element.classList.contains("is-nav-open"), true);
  }
  return { toggle, toggleNav };
}
