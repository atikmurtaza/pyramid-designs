import { PyramidLogo } from "@/components/brand/PyramidLogo";
import { CurrentNavigationLink } from "./CurrentNavigationLink";
import { MobileNavigation } from "./MobileNavigation";
import { joinUs, primaryNavigation } from "./navigation";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner container">
        <CurrentNavigationLink className="brand-link" href="/" aria-label="Pyramid Designs home">
          <PyramidLogo decorative variant="symbol" />
        </CurrentNavigationLink>
        <nav className="desktop-navigation" aria-label="Primary navigation">
          {primaryNavigation.map((item) => <CurrentNavigationLink key={item.href} href={item.href}>{item.label}</CurrentNavigationLink>)}
        </nav>
        <CurrentNavigationLink className="button button-primary desktop-navigation__action" href={joinUs.href}>{joinUs.label}</CurrentNavigationLink>
        <MobileNavigation />
      </div>
    </header>
  );
}
