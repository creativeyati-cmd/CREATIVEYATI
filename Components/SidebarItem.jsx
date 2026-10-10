import Link from "next/link";
import { AdminIcon } from "./Icons";

export default function SidebarItem({ href, label, icon, active = false, ...props }) {
  return <Link {...props} href={href} title={label} className={`dashboard-sidebar-item${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}><AdminIcon name={icon}/><span>{label}</span></Link>;
}
