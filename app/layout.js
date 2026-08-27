import "./globals.css";

export const metadata = { title: "Frame / Motion", description: "A video creator portfolio." };
const themeScript = `(()=>{try{const saved=localStorage.getItem('theme');const theme=saved||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'dark');document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme}catch{document.documentElement.dataset.theme='dark'}})()`;
export default function RootLayout({ children }) { return <html lang="en" data-theme="dark" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body>{children}</body></html>; }
