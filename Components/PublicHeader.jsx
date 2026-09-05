"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AdminIcon, ChevronDownIcon, SocialIcon } from "./Icons";

const routes = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/work", label: "Work", icon: "video" },
  { href: "/about", label: "About", icon: "user" },
  { href: "/services", label: "Services", icon: "settings" },
  { href: "/courses", label: "Courses", icon: "book" },
  { href: "/contact", label: "Contact", icon: "mail" },
];

export default function PublicHeader({ site, current = "/" }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const root = useRef(null);
  const timer = useRef(null);
  const initials = String(site.creatorName || "Portfolio")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const profilePosition = `${Number(site.profileFocalX) || 50}% ${Number(site.profileFocalY) || 50}%`;

  function close() {
    if (!open) return;
    setOpen(false);
    setClosing(true);
    clearTimeout(timer.current);
    const closeMs = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue("--dropdown-close-dur"),
    ) || 150;
    timer.current = setTimeout(() => setClosing(false), closeMs);
  }

  function toggle() {
    if (open) {
      close();
      return;
    }
    clearTimeout(timer.current);
    setClosing(false);
    setOpen(true);
  }

  useEffect(() => {
    const outside = (event) => {
      if (!root.current?.contains(event.target)) close();
    };
    const key = (event) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
      clearTimeout(timer.current);
    };
  });

  useEffect(() => {
    if (!open || window.innerWidth >= 768) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("portfolio-menu-change", { detail: { open } }));
    return () => window.dispatchEvent(new CustomEvent("portfolio-menu-change", { detail: { open: false } }));
  }, [open]);

  return (
    <header className="site-header" ref={root}>
      <div className="identity-wrap">
        <Link href="/" className="identity">
          {site.profileImage ? (
            <Image className="profile-image" src={site.profileImage} width={46} height={46} sizes="(max-width: 767px) 40px, 46px" style={{ objectPosition: profilePosition }} alt={`${site.creatorName} profile`} priority />
          ) : (
            <span className="identity-mark">{initials}</span>
          )}
          <span>{site.creatorName}</span>
        </Link>
        <button
          className="menu-trigger"
          type="button"
          onClick={toggle}
          aria-controls="site-navigation"
          aria-expanded={open}
          aria-label={open ? "Close site navigation" : "Open site navigation"}
        >
          <ChevronDownIcon open={open} />
        </button>
        <div className={`mobile-menu-layer ${open ? "is-open" : ""} ${closing ? "is-closing" : ""}`}>
          <div className="mobile-menu-glass">
            <nav
              id="site-navigation"
              className={`t-dropdown public-menu mobile-nav-menu ${open ? "is-open" : ""} ${closing ? "is-closing" : ""}`}
              data-origin="top-left"
              aria-label="Site navigation"
              aria-hidden={!open}
            >
            {routes.map((route) => (
              <span className="t-tt-wrap mobile-nav-item" key={route.href}>
                <Link
                  href={route.href}
                  className={`t-tt-trigger ${current === route.href ? "is-active" : ""}`}
                  aria-label={route.label}
                  aria-current={current === route.href ? "page" : undefined}
                  tabIndex={open ? 0 : -1}
                  onClick={close}
                >
                  <AdminIcon name={route.icon} />
                  <span className="menu-label">{route.label}</span>
                </Link>
                <span className="t-tt" role="tooltip">{route.label}</span>
              </span>
            ))}
            {site.instagramUrl && (
              <span className="t-tt-wrap menu-social">
                <a className="t-tt-trigger" href={site.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram" tabIndex={open ? 0 : -1} onClick={close}>
                  <SocialIcon name="instagram" />
                  <span className="menu-label">Instagram</span>
                </a>
                <span className="t-tt" role="tooltip">Instagram</span>
              </span>
            )}
            {site.youtubeUrl && (
              <span className="t-tt-wrap menu-social">
                <a className="t-tt-trigger" href={site.youtubeUrl} target="_blank" rel="noreferrer" aria-label="YouTube" tabIndex={open ? 0 : -1} onClick={close}>
                  <SocialIcon name="youtube" />
                  <span className="menu-label">YouTube</span>
                </a>
                <span className="t-tt" role="tooltip">YouTube</span>
              </span>
            )}
            </nav>
          </div>
        </div>
      </div>
      <nav className="header-actions">
        <Link className="header-cta" href="/contact">{site.ctaLabel}<AdminIcon name="arrow" /></Link>
      </nav>
    </header>
  );
}
