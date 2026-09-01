import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PyramidMark } from "@/components/brand/PyramidMark";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Surface } from "@/components/ui/Surface";
import { TextLink } from "@/components/ui/TextLink";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Design system review",
  robots: { index: false, follow: false },
};

const colors = [
  ["Background", "--color-background"],
  ["Surface", "--color-surface"],
  ["Elevated surface", "--color-surface-elevated"],
  ["Primary", "--color-primary"],
  ["Border", "--color-border"],
  ["Muted text", "--color-text-muted"],
] as const;

function ThemePreview({ theme }: { theme: "light" | "dark" }) {
  return (
    <section data-theme={theme} className="surface overflow-hidden" aria-label={`${theme} theme preview`}>
      <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-5 py-4">
        <p className="eyebrow">{theme} theme</p>
      </div>
      <div className="space-y-6 bg-[var(--color-background)] p-5 text-[var(--color-foreground)]">
        <div>
          <h3 className="type-h3 m-0 font-bold tracking-[-0.045em] text-[var(--color-text-strong)]">Measured, not ornamental.</h3>
          <p className="body m-0 mt-3 text-[var(--color-text-muted)]">Design system example content for colour, type and control review.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button>Primary action</Button>
          <Button variant="secondary">Secondary action</Button>
        </div>
        <TextLink href="#focus-example">Text link with a visible focus treatment</TextLink>
      </div>
    </section>
  );
}

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main id="main-content" className="bg-[var(--color-background)] text-[var(--color-foreground)]">
      <a className="skip-link" href="#review-content">Skip to review content</a>
      <Container>
        <div className="py-[var(--section-space)]" id="review-content">
          <p className="eyebrow">Pyramid Designs · Phase 1A</p>
          <h1 className="display m-0 mt-4">Design system review.</h1>
          <p className="body-large text-measure mt-6 text-[var(--color-text-muted)]">Synthetic review content only. This route is development-only and returns 404 in production.</p>

          <section className="section" aria-labelledby="logo-heading">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Brand asset comparison</p>
                <h2 className="type-h2 m-0 mt-2 font-bold tracking-[-0.055em]" id="logo-heading">Reference beside proposed mark trace</h2>
              </div>
              <p className="caption m-0">REQUIRES BRAND APPROVAL</p>
            </div>
            <div className="grid gap-[var(--grid-gap)] md:grid-cols-2">
              <Surface className="p-5">
                <p className="caption m-0">Supplied raster reference</p>
                <Image className="mt-4 h-auto w-full object-contain" src="/brand/reference/pyramid-logo-transparent.png" alt="Supplied Pyramid Designs logo reference" width={3214} height={2632} priority />
              </Surface>
              <Surface className="p-5">
                <p className="caption m-0">Proposed mark-only SVG trace</p>
                <PyramidMark className="mt-4 h-auto w-full" />
                <p className="small mb-0 mt-4 text-[var(--color-text-muted)]">The supplied Nexa Light wordmark is not reconstructed. It remains reference artwork pending licensed source files.</p>
              </Surface>
            </div>
            <div className="mt-[var(--grid-gap)] grid gap-[var(--grid-gap)] sm:grid-cols-2">
              <Surface className="bg-[#f7f4ed] p-5">
                <p className="caption text-[#30323d]">Light surface · small-size check</p>
                <PyramidMark className="mt-4 h-auto w-28" />
              </Surface>
              <Surface className="bg-[#1d1f27] p-5">
                <p className="caption text-[#f5f1e8]">Dark surface · favicon/mark check</p>
                <PyramidMark className="mt-4 h-auto w-16" />
              </Surface>
            </div>
          </section>

          <section className="section" aria-labelledby="themes-heading">
            <p className="eyebrow">Semantic colour tokens</p>
            <h2 className="type-h2 m-0 mt-2 font-bold tracking-[-0.055em]" id="themes-heading">One system, two deliberate themes</h2>
            <div className="mt-6 grid gap-[var(--grid-gap)] lg:grid-cols-2">
              <ThemePreview theme="light" />
              <ThemePreview theme="dark" />
            </div>
            <div className="mt-[var(--grid-gap)] grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {colors.map(([label, variable]) => (
                <div key={variable} className="surface overflow-hidden">
                  <div className="h-16 bg-[var(--swatch)]" style={{ "--swatch": `var(${variable})` } as React.CSSProperties} />
                  <p className="small m-0 p-3 font-bold">{label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="section" aria-labelledby="type-heading">
            <p className="eyebrow">Type, spacing and layout</p>
            <h2 className="type-h2 m-0 mt-2 font-bold tracking-[-0.055em]" id="type-heading">Editorial scale on a responsive grid</h2>
            <div className="mt-6 grid gap-[var(--grid-gap)] lg:grid-cols-[minmax(0,7fr)_minmax(16rem,5fr)]">
              <Surface className="p-6 sm:p-8">
                <p className="display m-0">Ideas take shape with intent.</p>
                <p className="body-large text-measure mb-0 mt-6 text-[var(--color-text-muted)]">Manrope is the proposed primary interface family. The system keeps long-form copy measured and controls compact.</p>
              </Surface>
              <Surface className="p-6">
                <p className="caption m-0">12-column desktop grid</p>
                <div className="editorial-grid mt-5 gap-1" aria-label="Responsive editorial grid demonstration">
                  {Array.from({ length: 12 }, (_, index) => <span className="h-24 bg-[var(--color-primary)]/75" key={index} />)}
                </div>
                <p className="small mb-0 mt-5 text-[var(--color-text-muted)]">At 1280px and above: twelve columns. From 768px: flexible editorial columns. Below 768px: one reading column.</p>
              </Surface>
            </div>
          </section>

          <section className="section" aria-labelledby="primitives-heading">
            <p className="eyebrow">Reusable primitives</p>
            <h2 className="type-h2 m-0 mt-2 font-bold tracking-[-0.055em]" id="primitives-heading">Native controls, restrained surfaces</h2>
            <Surface className="mt-6 p-6 sm:p-8">
              <div className="flex flex-wrap gap-3">
                <Button>Primary action</Button>
                <Button variant="secondary">Secondary action</Button>
                <Button variant="ghost">Ghost action</Button>
                <Button disabled>Disabled action</Button>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-5">
                <TextLink href="#focus-example">Text link</TextLink>
                <span className="rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs font-bold text-[var(--color-primary-foreground)]">Design system example</span>
              </div>
              <p className="small mb-0 mt-6 text-[var(--color-text-muted)]" id="focus-example">Tab through the controls to inspect the two-tone focus ring. Interaction targets are at least 44 by 44 CSS pixels.</p>
            </Surface>
          </section>
        </div>
      </Container>
    </main>
  );
}
