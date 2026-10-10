import "./globals.css";
import "./dashboard-refresh.css";
import "./learning-store.css";
import "./checkout-flow.css";
import "./course-experience.css";
import "./communications.css";
import { getSeoSettings } from "@/lib/data/settings";
import PwaInstall from "@/Components/PwaInstall";
import ToastHost from "@/Components/ToastHost";
import CreatorSchema from "@/Components/CreatorSchema";

export async function generateMetadata() {
  const seo = await getSeoSettings();
  let metadataBase;
  try { metadataBase = new URL(seo.canonicalUrl); } catch { metadataBase = new URL("https://aivideocreator.cv"); }
  const images = seo.defaultOgImage ? [seo.defaultOgImage] : undefined;
  return {
    metadataBase,
    appleWebApp: { capable: true, title: "AI Video Creator", statusBarStyle: "default" },
    icons: { apple: "/pwa/icon-192.png" },
    title: { default: seo.siteTitle, template: `%s | ${seo.siteTitle}` },
    description: seo.siteDescription,
    alternates: { canonical: seo.canonicalUrl },
    openGraph: { type: "website", url: seo.canonicalUrl, title: seo.siteTitle, description: seo.siteDescription, images },
    twitter: { card: "summary_large_image", title: seo.siteTitle, description: seo.siteDescription, images },
  };
}
export default function RootLayout({ children }) { return <html lang="en" data-theme="light" style={{ colorScheme: "light" }}><body><CreatorSchema />{children}<ToastHost /><PwaInstall /></body></html>; }

export const viewport = { themeColor: "#174c38" };
