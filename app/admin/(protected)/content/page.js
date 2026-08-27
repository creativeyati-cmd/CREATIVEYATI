import Link from "next/link";
export default function Content() { return <><div className="admin-title"><p>WEBSITE CONTENT</p><h1>Words and identity</h1></div><div className="admin-list"><Link href="/admin/content/hero">Hero & identity</Link><Link href="/admin/content/about">About & contact copy</Link></div></>; }
