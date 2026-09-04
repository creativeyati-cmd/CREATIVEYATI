import { SocialIcon } from "./Icons";

export default function SocialLinks({ links, label = "Social profiles", compact = false }) {
  if (!links?.length) return null;
  return <nav className={`social-links ${compact ? "is-compact" : ""}`} aria-label={label}>
    {links.map((link) => <a key={link.id} href={link.url} target={link.url.startsWith("mailto:") ? undefined : "_blank"} rel={link.url.startsWith("mailto:") ? undefined : "noreferrer"} aria-label={link.label}>
      <SocialIcon name={link.platform} />
      <span>{link.label}</span>
    </a>)}
  </nav>;
}
