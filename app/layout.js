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
export default function RootLayout({ children }) { return <html lang="en" data-theme="light" style={{ colorScheme: "light" }}><body>{children}</body></html>; }
