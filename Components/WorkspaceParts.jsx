import Link from "next/link";
export function WorkspaceIcon({ name = "book" }) {
  const paths = { book: "M4 4h6l2 2 2-2h6v16h-6l-2 2-2-2H4z M12 6v16", people: "M4 21v-4a5 5 0 0 1 10 0v4 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 13a5 5 0 0 1 4 5v3", award: "M12 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12 M8 14l-1 7 5-2 5 2-1-7", arrow: "M5 12h14 m-5-5 5 5-5 5", bell: "M6 9a6 6 0 0 1 12 0c0 7 3 7 3 8H3c0-1 3-1 3-8 M10 21h4", check: "m5 12 4 4 10-10", wallet: "M3 6h17v15H3z M3 6V3h14v3 M20 11h-6v5h6", flame: "M13 3c1 5-4 6-4 9-2-1-2-3-2-3-6 8 1 13 5 12 8-1 8-9 1-18Z" };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.arrow}/></svg>;
}
export function ProgressBar({ value, label }) {
  return <div className="sw-progress aw-progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span style={{ width: `${value}%` }}/></div>;
}
export function ProgressRing({ value }) {
  return <span className="sw-ring sw-ring-gold" role="img" aria-label={`${value}% complete`}><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42"/><circle className="sw-ring-fill" cx="50" cy="50" r="42" pathLength="100" strokeDasharray={`${value} 100`}/></svg><span>{value}%</span></span>;
}

export function MetricCard({ label, value, icon, href, caption, gold = false }) {
  const Tag = href ? Link : "div";
  return <Tag {...(href ? { href } : {})} className={`dashboard-metric${String(value).length > 9 ? " has-long-value" : ""}${gold ? " is-gold" : ""}`}><span>{label}{icon && <WorkspaceIcon name={icon}/>}</span><strong>{value}</strong>{caption && <small>{caption}</small>}</Tag>;
}
