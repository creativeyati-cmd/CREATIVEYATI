import Link from "next/link";
import SocialLinks from "./SocialLinks";

export default function PublicFooter({ site, socialLinks = [] }) {
  return <footer className="public-footer">
    <span>{site.footerText || `© ${new Date().getFullYear()} ${site.creatorName}`}</span>
    <SocialLinks links={socialLinks} compact label="Creator profiles" />
    <nav aria-label="Footer navigation"><Link href="/work">Work</Link><Link href="/courses">Courses</Link><Link href="/contact">Contact</Link></nav>
  </footer>;
}
