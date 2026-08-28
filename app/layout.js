import "./globals.css";
import { getSeoSettings } from "@/lib/data/settings";

export async function generateMetadata() {
  const seo = await getSeoSettings();
  let metadataBase;
  try { metadataBase = new URL(seo.canonicalUrl); } catch { metadataBase = new URL("https://aivideocreator.cv"); }
  const images = seo.defaultOgImage ? [seo.defaultOgImage] : undefined;
  return {
    metadataBase,
    title: { default: seo.siteTitle, template: `%s | ${seo.siteTitle}` },
    description: seo.siteDescription,
    alternates: { canonical: seo.canonicalUrl },
    openGraph: { type: "website", url: seo.canonicalUrl, title: seo.siteTitle, description: seo.siteDescription, images },
    twitter: { card: "summary_large_image", title: seo.siteTitle, description: seo.siteDescription, images },
  };
}
const themeScript = `(()=>{try{const saved=localStorage.getItem('theme');const theme=saved||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'dark');document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme}catch{document.documentElement.dataset.theme='dark'}})()`;
export default function RootLayout({ children }) { return <html lang="en" data-theme="dark" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body>{children}</body></html>; }
