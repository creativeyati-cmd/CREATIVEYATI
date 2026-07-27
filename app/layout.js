import "./globals.css";

export const metadata = {
  title: "WebGL Glass Carousel",
  description:
    "Infinite scroll-driven portfolio carousel with a liquid-glass lens shader — three.js + GSAP.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
