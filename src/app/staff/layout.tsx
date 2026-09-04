import type { Metadata } from "next";
import Link from "next/link";

import { PyramidLogo } from "@/components/brand/PyramidLogo";
import { resolveAuthenticatedStaff } from "@/lib/server/auth/session";
import { staffPortalNavigation } from "@/lib/server/staff-navigation";

import { formatStaffRole } from "./_components";
import { signOutStaff } from "./actions";
import "./staff.css";

export const metadata: Metadata = { title: "Staff portal" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StaffLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const principal = await resolveAuthenticatedStaff();
  const navigation = principal?.assuranceLevel === "aal2" ? staffPortalNavigation(principal) : [];

  return (
    <div className="staff-portal">
      <header className="staff-header">
        <div className="staff-header__inner">
          <Link className="staff-brand" href="/staff" aria-label="Pyramid Designs staff portal">
            <PyramidLogo decorative variant="symbol" />
            <span>Staff portal</span>
          </Link>
          {principal?.assuranceLevel === "aal2" ? (
            <div className="staff-session">
              <span>Verified staff session</span>
              <span className="staff-session__roles">
                {principal.roles.map(formatStaffRole).join(" · ")}
              </span>
              <form action={signOutStaff}>
                <button className="button button-secondary" type="submit">Sign out</button>
              </form>
            </div>
          ) : null}
        </div>
        {navigation.length ? (
          <nav className="staff-navigation" aria-label="Staff portal">
            <div className="staff-navigation__inner">
              {navigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
            </div>
          </nav>
        ) : null}
      </header>
      <main id="main-content" className="staff-main">{children}</main>
    </div>
  );
}
