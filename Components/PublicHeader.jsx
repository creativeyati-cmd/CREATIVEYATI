"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { AdminIcon, ChevronDownIcon } from "./Icons";

const routes = [{ href: "/", label: "Home", icon: "home" }, { href: "/work", label: "Work", icon: "video" }, { href: "/about", label: "About", icon: "user" }, { href: "/services", label: "Services", icon: "settings" }, { href: "/contact", label: "Contact", icon: "mail" }];

export default function PublicHeader({ site, current = "/" }) {
  const [open, setOpen] = useState(false); const [closing, setClosing] = useState(false); const root = useRef(null); const timer = useRef(null);
  function close() { if (!open) return; setOpen(false); setClosing(true); clearTimeout(timer.current); timer.current = setTimeout(() => setClosing(false), 150); }
  useEffect(() => { const outside = (event) => { if (!root.current?.contains(event.target)) close(); }; const key = (event) => { if (event.key === "Escape") close(); }; document.addEventListener("pointerdown", outside); document.addEventListener("keydown", key); return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", key); clearTimeout(timer.current); }; });
  return <header className="site-header" ref={root}><div className="identity-wrap"><Link href="/" className="identity">{site.profileImage ? <img className="profile-image" src={site.profileImage} alt="" /> : <span className="identity-mark">FM</span>}<span>{site.creatorName}</span></Link><button className="menu-trigger" type="button" onClick={() => { setClosing(false); setOpen((value) => !value); }} aria-expanded={open} aria-haspopup="menu" aria-label="Open site navigation"><ChevronDownIcon open={open} /></button><nav className={`t-dropdown public-menu ${open ? "is-open" : ""} ${closing ? "is-closing" : ""}`} data-origin="top-left" aria-label="Site navigation">{routes.map((route) => <Link key={route.href} href={route.href} className={current === route.href ? "is-active" : ""} onClick={close}><AdminIcon name={route.icon} />{route.label}</Link>)}{site.instagramUrl && <a href={site.instagramUrl} target="_blank" rel="noreferrer" onClick={close}>Instagram</a>}{site.youtubeUrl && <a href={site.youtubeUrl} target="_blank" rel="noreferrer" onClick={close}>YouTube</a>}</nav></div><nav className="header-actions"><ThemeToggle /><Link className="header-cta" href="/contact">{site.ctaLabel}<AdminIcon name="arrow" /></Link></nav></header>;
}
