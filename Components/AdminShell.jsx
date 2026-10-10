"use client";
import DashboardPageShell from "./DashboardPageShell";

import { useRef } from "react";
import useDashboardShell from "@/Components/useDashboardShell";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminNavigation from "@/Components/AdminNavigation";
import { AdminIcon } from "@/Components/Icons";

const STORAGE_KEY = "cy-admin-sidebar";

// The shell is a grid whose first column is the sidebar width, so collapsing
// animates exactly one property — grid-template-columns — at the sidebar motion
// token. The collapsed state lives on the shell element and persists across
// visits.
//
// It is applied through the DOM rather than React state on purpose: state would
// have to be read in an effect (a cascading render, and the hydration mismatch
// that comes with reading storage during render). Nothing else re-renders when
// the sidebar collapses, so there is no state to hold.
export default function AdminShell({ logout, children }) {
  const shell = useRef(null);
  const pathname = usePathname();
  const { toggle, toggleNav } = useDashboardShell(shell, STORAGE_KEY, pathname);
  return <div className="admin-shell" ref={shell}>
    <aside>
      <div className="admin-shell-head">
        <Link className="wordmark" href="/admin">AI VIDEO CREATOR</Link>
        <button
          className="admin-shell-toggle"
          type="button"
          onClick={toggle}
          aria-expanded="true"
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <AdminIcon name="arrow" />
        </button>
        <button className="admin-nav-close" type="button" onClick={toggleNav} aria-label="Close navigation">✕</button>
      </div>
      <AdminNavigation />
      <form action={logout}><button type="submit"><AdminIcon name="logout" />Log out</button></form>
    </aside>
    {/* a real element, so tapping the scrim actually closes the sheet */}
    <button className="admin-nav-scrim" type="button" onClick={toggleNav} aria-label="Close navigation" tabIndex={-1} />
    <button className="admin-nav-trigger" type="button" onClick={toggleNav} aria-expanded="false" aria-label="Open navigation">☰</button>
    <main className="admin-main"><DashboardPageShell>{children}</DashboardPageShell></main>
  </div>;
}
