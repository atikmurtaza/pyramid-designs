"use client";

import Image from "next/image";
import { lazy, Suspense, useCallback, useState } from "react";
import prototypeReview from "@/assets/culture/culture-prototype-review.webp";
import { CanvasErrorBoundary, useProgressive3D } from "@/components/three/progressive-3d";

const CultureCollaborationScene = lazy(() => import("./CultureCollaborationScene"));

const disciplines = [
  ["Design", "Shapes the visual, spatial and communication intent."],
  ["Development", "Turns intent into usable digital systems."],
  ["Engineering", "Connects technical decisions to practical constraints."],
  ["Marketing and content", "Clarifies audience, narrative and release context."],
] as const;

export function CultureCollaborationVisual() {
  const { active, containerRef, enableMobile, fail, showMobileOptIn } = useProgressive3D("opt-in");
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState(0);
  const handleReady = useCallback(() => setReady(true), []);
  const handleContextLost = useCallback(() => {
    setReady(false);
    fail();
  }, [fail]);

  return (
    <div className="culture-collaboration-visual">
      <figure className="culture-figure culture-figure--portrait" ref={containerRef}>
        <Image
          src={prototypeReview}
          alt="Synthetic image of a South Asian designer and engineer reviewing a physical prototype and printed layouts."
          sizes="(max-width: 768px) 100vw, 52vw"
        />
        <div
          className={`culture-collaboration-3d${ready ? " culture-collaboration-3d--ready" : ""}`}
          aria-hidden="true"
        >
          {active && (
            <CanvasErrorBoundary onError={fail}>
              <Suspense fallback={null}>
                <CultureCollaborationScene
                  selected={selected}
                  onReady={handleReady}
                  onContextLost={handleContextLost}
                  onContextRestored={handleReady}
                />
              </Suspense>
            </CanvasErrorBoundary>
          )}
        </div>
        <figcaption>Synthetic placeholder image remains the immediate fallback for the optional 3D view.</figcaption>
      </figure>

      {showMobileOptIn && (
        <button className="button button-secondary culture-collaboration__enable" type="button" onClick={enableMobile}>
          Enable optional 3D view
        </button>
      )}

      <fieldset className="culture-disciplines">
        <legend>Disciplines contributing to one project conversation</legend>
        {disciplines.map(([title, description], index) => (
          <label key={title}>
            <input
              type="radio"
              name="culture-discipline"
              value={title}
              checked={selected === index}
              onChange={() => setSelected(index)}
            />
            <span><strong>{title}</strong>{" "}{description}</span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
