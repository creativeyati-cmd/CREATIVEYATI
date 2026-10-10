import { randomUUID } from "node:crypto";
import Link from "next/link";
import PublicHeader from "./PublicHeader";
export default function AuthLayout({ title, description, children, admin=false }) {
 return <>{!admin && <PublicHeader />}<div className="fm-auth" data-toast-cycle={randomUUID()}><aside className="fm-auth-aside"><Link className="fm-auth-brand" href="/">AI VIDEO CREATOR</Link><div><p className="fm-auth-label">{admin?"STUDIO & ACADEMY":"YOUR NEXT CHAPTER"}</p><h2>{admin?"One place to run your creative business.":"From your first idea to your final film."}</h2><p>{admin?"Manage your work, teach your courses and keep track of every payment.":"Practical modules. Lessons at your pace. A certificate to celebrate what you make."}</p></div><span className="fm-auth-frame" aria-hidden="true"/></aside><main className="fm-auth-main"><div className="fm-auth-card"><Link href="/" className="fm-auth-logo">AI VIDEO CREATOR</Link><p className="fm-auth-label">{admin?"ADMIN ACCESS":"ACADEMY"}</p><h1>{title}</h1><p className="fm-auth-lede">{description}</p>{children}</div></main></div></>;
}
