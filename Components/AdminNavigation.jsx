"use client";
import SidebarItem from "./SidebarItem";
import { usePathname } from "next/navigation";
const groups=[
 ["Workspace",[["/admin","Overview","home"],["/admin/activity","Activity log","folder"]]],
 ["Studio",[["/admin/videos","Projects","video"],["/admin/categories","Categories","folder"],["/admin/enquiries","Enquiries","mail"]]],
 ["Academy",[["/admin/courses","Courses","book"],["/admin/students","Students","user"],["/admin/certificates","Certificates","award"],["/admin/course-settings","Academy settings","settings"]]],
 ["Communications",[["/admin/communications/messages","Messages","mail"],["/admin/communications/newsletters","Newsletters","mail"],["/admin/communications/templates","Templates","doc"],["/admin/communications/history","History","folder"]]],
 ["Commerce",[["/admin/orders","Course orders","folder"],["/admin/invoices","Client invoices & receipts","book"],["/admin/payments","Payments","folder"],["/admin/coupons","Coupons","folder"]]],
 ["Website",[["/admin/content","Website content","folder"],["/admin/content/services","Services media","video"],["/admin/settings/social","Social profiles","user"]]],
 ["Settings",[["/admin/settings/documents","Receipts & certificates","award"],["/admin/security","Account security","user"],["/admin/settings/email","Email delivery","mail"],["/admin/settings","General settings","settings"]]],
];
export default function AdminNavigation() {
 const pathname=usePathname();
 const paths=groups.flatMap(([,links])=>links.map(([href])=>href));
 const current=paths.filter(href=>pathname===href||(href!=="/admin"&&pathname.startsWith(href+"/"))).sort((a,b)=>b.length-a.length)[0];
 return <nav aria-label="Administration">{groups.map(([title,links])=><div className="admin-nav-group" key={title}><p className="admin-nav-label">{title}</p>{links.map(([href,label,icon])=><SidebarItem key={href} href={href} label={label} icon={icon} active={current===href}/>)}</div>)}<SidebarItem href="/" target="_blank" rel="noreferrer" label="View website" icon="home"/></nav>;
}
