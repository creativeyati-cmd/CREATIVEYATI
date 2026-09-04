import { SocialIcon } from "./Icons";

export default function ProjectShareLinks({ title, url }) {
  const encodedUrl = encodeURIComponent(url); const encodedTitle = encodeURIComponent(title);
  const links = [
    { label: "Share on X", platform: "x", href: `https://x.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}` },
    { label: "Share on LinkedIn", platform: "linkedin", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { label: "Share on WhatsApp", platform: "whatsapp", href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}` },
    { label: "Share by email", platform: "email", href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}` },
  ];
  return <nav className="project-share" aria-label="Share this project">{links.map((link) => <a key={link.platform} href={link.href} target={link.platform === "email" ? undefined : "_blank"} rel={link.platform === "email" ? undefined : "noreferrer"}><SocialIcon name={link.platform} /><span>{link.label}</span></a>)}</nav>;
}
