import { PyramidMark } from "@/components/brand/PyramidMark";

/**
 * Static, server-rendered fallback and future Phase 1G replacement boundary.
 * The proposed mark geometry remains unchanged inside the composition.
 */
export function HomeHeroVisual() {
  return (
    <div
      className="home-hero-visual"
      data-future-component="interactive-hero-3d"
      data-content-status="provisional"
      aria-hidden="true"
    >
      <div className="home-hero-visual__grid" />
      <div className="home-hero-visual__plane home-hero-visual__plane--top" />
      <div className="home-hero-visual__plane home-hero-visual__plane--side" />
      <div className="home-hero-visual__mark-shell">
        <PyramidMark className="home-hero-visual__mark" decorative />
      </div>
      <div className="home-hero-visual__anchor" />
    </div>
  );
}
