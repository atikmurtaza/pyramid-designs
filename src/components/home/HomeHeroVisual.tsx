import { PyramidLogo } from "@/components/brand/PyramidLogo";

/**
 * Static, server-rendered fallback and future Phase 1G replacement boundary.
 * The exact-geometry symbol derivative is rendered inside the composition.
 */
export function HomeHeroVisual() {
  return (
    <div
      className="home-hero-visual"
      data-future-component="interactive-hero-3d"
      data-content-status="provisional"
      data-logo-status="owner-approved-master"
      aria-hidden="true"
    >
      <div className="home-hero-visual__grid" />
      <div className="home-hero-visual__plane home-hero-visual__plane--top" />
      <div className="home-hero-visual__plane home-hero-visual__plane--side" />
      <div className="home-hero-visual__mark-field">
        <PyramidLogo className="home-hero-visual__mark" decorative variant="symbol" />
      </div>
      <div className="home-hero-visual__anchor" />
    </div>
  );
}
