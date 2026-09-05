"use client";

import { motion, useReducedMotion } from "motion/react";

export function SunMoonIcon({ size = 17 }) { return <motion.svg aria-hidden="true" fill="none" height={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size} whileHover={{ rotate: [0, -8, 8, 0] }}><path d="M12 8a2.83 2.83 0 0 0 4 4 4 4 0 1 1-4-4" />{["M12 2v2","M12 20v2","m4.9 4.9 1.4 1.4","m17.7 17.7 1.4 1.4","M2 12h2","M20 12h2","m6.3 17.7-1.4 1.4","m19.1 4.9-1.4 1.4"].map((d) => <path d={d} key={d} />)}</motion.svg>; }

export function SunIcon({ size = 17 }) { return <svg fill="none" height={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>; }

export function MoonIcon({ size = 17 }) { return <svg fill="none" height={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></svg>; }

export function SoundIcon({ muted = false, size = 16 }) { return <svg aria-hidden="true" fill="none" height={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width={size}><path d="M11 5 6 9H3v6h3l5 4V5Z" />{muted ? <><path d="m16 9 5 6M21 9l-5 6" /></> : <><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" /></>}</svg>; }

export function SocialIcon({ name, size = 16 }) {
  const icon = {
    instagram: <><rect height="18" rx="5" width="18" x="3" y="3" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></>,
    youtube: <><path d="M22 12c0 2.3-.2 3.8-.5 4.8a4.8 4.8 0 0 1-2.7 2.7C17.8 19.8 16.3 20 12 20s-5.8-.2-6.8-.5a4.8 4.8 0 0 1-2.7-2.7C2.2 15.8 2 14.3 2 12s.2-3.8.5-4.8a4.8 4.8 0 0 1 2.7-2.7C6.2 4.2 7.7 4 12 4s5.8.2 6.8.5a4.8 4.8 0 0 1 2.7 2.7c.3 1 .5 2.5.5 4.8Z" /><path d="m10 8 6 4-6 4Z" /></>,
    tiktok: <path d="M15 4v10.5a5 5 0 1 1-4-4.9M15 4c.7 2.4 2.3 3.8 5 4" />,
    vimeo: <path d="M3 8c2.3-2.7 4.8-3.5 6-.7.7 1.7 1.2 5.3 2.2 7.2.8 1.6 1.4 1.8 2.5.2 1.1-1.5 2.4-3.7 1.2-4.3-.6-.3-1.5 0-2.2.5C17.8 5.8 20.3 4 21 5.7c.8 2.1-1.1 6.3-3.8 9.6-2.9 3.6-6.7 5.5-8.8 2.4C6.9 15.5 6.2 9.6 5.2 9c-.5-.3-1.2.2-1.8.7Z" />,
    linkedin: <><path d="M4 9v11M4 5.5v.01M9 20v-6c0-3 1.5-5 4.5-5S19 11 19 14v6M9 10v10" /></>,
    x: <path d="m4 4 16 16M20 4 4 20" />,
    behance: <><path d="M4 5h6a4 4 0 0 1 0 8H4zM4 13h7a3.5 3.5 0 0 1 0 7H4zM16 8h5M15 15h7a4 4 0 1 0-1 3" /></>,
    dribbble: <><circle cx="12" cy="12" r="9" /><path d="M6 5.5c4 3 7 7.5 8.5 15M4 14c5-1.5 10-1.7 16 .5M17.5 6.5c-3 3-7 4.7-13 5" /></>,
    whatsapp: <><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.1A8 8 0 1 1 20 11.5Z" /><path d="M9 8.5c.8 3 2.2 4.5 5.5 6" /></>,
    email: <><rect x="3" y="5" width="18" height="14" rx="1" /><path d="m4 7 8 6 8-6" /></>,
  }[name];
  return <svg aria-hidden="true" fill="none" height={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width={size}>{icon || <circle cx="12" cy="12" r="9" />}</svg>;
}

export function ChevronDownIcon({ size = 16, open = false }) { const reduceMotion = useReducedMotion(); return <motion.svg aria-hidden="true" animate={{ rotate: open ? 180 : 0, y: open ? 1 : 0 }} fill="none" height={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" transition={{ duration: reduceMotion ? 0 : .25 }} viewBox="0 0 24 24" width={size}><path d="m6 9 6 6 6-6" /></motion.svg>; }

const paths = { home:"M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z", video:"M3 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M17 10l4-2v8l-4-2", folder:"M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", book:"M4 5.5A2.5 2.5 0 0 1 6.5 3H11a2 2 0 0 1 2 2v16a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 0 4 21.5z M20 5.5A2.5 2.5 0 0 0 17.5 3H13v18a2 2 0 0 1 2-2h2.5a2.5 2.5 0 0 1 2.5 2.5z", mail:"M3 5h18v14H3z M3 7l9 6 9-6", settings:"M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.56V20.3H11.7v-.08A1.7 1.7 0 0 0 10.66 18.66a1.7 1.7 0 0 0-1.88.34l-.06.06L6.6 16.94l.06-.06A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.56-1.04H5.3v-3h.14A1.7 1.7 0 0 0 7 9.92a1.7 1.7 0 0 0-.34-1.88L6.6 7.98 8.72 5.86l.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 11.7 4.7v-.08h3v.08a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.04h.08v3h-.08A1.7 1.7 0 0 0 19.4 15z", logout:"M10 17l5-5-5-5 M15 12H3 M21 3v18", play:"M8 5v14l11-7z", user:"M20 21a8 8 0 0 0-16 0 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", arrow:"M5 12h14 M13 6l6 6-6 6" };
export function AdminIcon({ name, size = 16 }) { return <svg aria-hidden="true" fill="none" height={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24" width={size}><path d={paths[name] || paths.home} /></svg>; }
