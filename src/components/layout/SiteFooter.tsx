import Link from "next/link";
import { PyramidLogo } from "@/components/brand/PyramidLogo";
import { joinUs, primaryNavigation } from "./navigation";

const socialLinks = [
  ["Facebook", "https://www.facebook.com/pyramiddesignsbymadalpha/"],
  ["Instagram", "https://www.instagram.com/pyramiddesigns.ch1"],
  ["LinkedIn", "https://www.linkedin.com/company/pyramiddesignsofficial/"],
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div>
          <Link className="site-footer__brand-link" href="/" aria-label="Pyramid Designs home">
            <PyramidLogo className="site-footer__mark" decorative variant="symbol" />
          </Link>
        </div>
        <nav aria-label="Footer navigation">
          <p className="eyebrow">Explore</p>
          <ul>
            {primaryNavigation.map((item) => <li key={item.href}><Link href={item.href}>{item.label}</Link></li>)}
            <li><Link href={joinUs.href}>{joinUs.label}</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </nav>
        <div>
          <p className="eyebrow">Connect</p>
          <ul>
            {socialLinks.map(([label, href]) => <li key={label}><a href={href} target="_blank" rel="noreferrer">{label}</a></li>)}
          </ul>
          <a className="small" href="https://madalphadesigners.com" target="_blank" rel="noreferrer">MAD Alpha Designers</a>
          <p className="small site-footer__note">Pakistan</p>
        </div>
        <nav aria-label="Legal navigation">
          <p className="eyebrow">Legal</p>
          <ul>
            <li><Link href="/privacy">Privacy</Link></li>
            <li><Link href="/terms">Terms</Link></li>
            <li><Link href="/accessibility">Accessibility</Link></li>
          </ul>
          <p className="small site-footer__note">Public legal and contact details are pending owner approval.</p>
        </nav>
      </div>
    </footer>
  );
}
