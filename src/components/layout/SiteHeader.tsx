import Link from "next/link";
import { PyramidMark } from "@/components/brand/PyramidMark";
import { MobileNavigation } from "./MobileNavigation";
import { joinUs, primaryNavigation } from "./navigation";

export function SiteHeader() { return <header className="site-header"><div className="site-header__inner container"><Link className="brand-link" href="/" aria-label="Pyramid Designs home"><PyramidMark title="Pyramid Designs proposed brand mark" /></Link><nav className="desktop-navigation" aria-label="Primary navigation">{primaryNavigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav><Link className="button button-primary desktop-navigation__action" href={joinUs.href}>{joinUs.label}</Link><MobileNavigation /></div></header>; }
