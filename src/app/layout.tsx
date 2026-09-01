import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import "./globals.css";
import "./phase1b.css";
import "./active-navigation.css";

const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-manrope" });
export const metadata: Metadata = { title: { default: "Pyramid Designs", template: "%s | Pyramid Designs" }, description: "Pyramid Designs website foundation." };
const themeScript = `try { const theme = localStorage.getItem("pyramid-theme"); if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme; } catch {}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body className={manrope.variable}><a className="skip-link" href="#main-content">Skip to content</a><SiteHeader />{children}<SiteFooter /></body></html>;
}
