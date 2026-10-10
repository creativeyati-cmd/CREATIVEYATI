"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import "./public-header.css";

const links = [["/", "Home"], ["/work", "Portfolio"], ["/services", "Services"], ["/academy", "Academy"], ["/courses", "Courses"], ["/about", "About"], ["/contact", "Contact"]];

export default function PublicHeader({ signedIn = false }) {
  const pathname = usePathname();
  const menu = useRef(null);
  const trigger = useRef(null);
  const active = href => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
  function notify(open) {
    trigger.current?.setAttribute("aria-expanded", String(open));
    window.dispatchEvent(new CustomEvent("portfolio-menu-change", { detail: { open } }));
  }
  function close() { menu.current?.close(); }
  useEffect(() => {
    const dialog = menu.current;
    const resize = () => { if (window.innerWidth >= 1180) dialog?.close(); };
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.dispatchEvent(new CustomEvent("portfolio-menu-change", { detail: { open: false } }));
    };
  }, []);
  return <header className="universal-header">
    <Link href="/" className="universal-brand" aria-label="AI Video Creator home"><span className="universal-brand-mark" aria-hidden="true">AI</span><span>AI VIDEO CREATOR<small>Create. Learn. Tell your story.</small></span></Link>
    <nav className="universal-desktop" aria-label="Primary">{links.map(([href,label]) => <Link href={href} key={href} aria-current={active(href) ? "page" : undefined}>{label}</Link>)}</nav>
    <Link className="universal-account" href={signedIn ? "/learn" : "/login"}>{signedIn ? "My learning" : "Sign in"}<span aria-hidden="true"> ↗</span></Link>
    <button className="universal-menu-trigger" ref={trigger} type="button" aria-label="Open menu" aria-controls="universal-menu" aria-expanded="false" onClick={() => { menu.current.showModal(); notify(true); }}>☰</button>
    <dialog id="universal-menu" className="universal-menu" ref={menu} onClose={() => notify(false)} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="universal-menu-inner"><div className="universal-menu-heading"><strong>Explore AI VIDEO CREATOR</strong><button type="button" aria-label="Close menu" onClick={close} autoFocus>✕</button></div>
        <nav aria-label="Mobile navigation">{links.map(([href,label]) => <Link href={href} key={href} onClick={close} aria-current={active(href) ? "page" : undefined}>{label}<span aria-hidden="true">↗</span></Link>)}</nav>
        <Link className="universal-mobile-account" href={signedIn ? "/learn" : "/login"} onClick={close}>{signedIn ? "My learning" : "Sign in to your account"}</Link>
        <Link href="/verify" onClick={close}>Verify a certificate</Link>
      </div>
    </dialog>
  </header>;
}
