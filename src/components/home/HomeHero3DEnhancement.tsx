"use client";

import { lazy, Suspense, useCallback, useState } from "react";
import { CanvasErrorBoundary, useProgressive3D } from "@/components/three/progressive-3d";

const HomeHeroScene = lazy(() => import("./HomeHeroScene"));

export function HomeHero3DEnhancement() {
  const { active, containerRef, fail } = useProgressive3D("fallback");
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);
  const handleContextLost = useCallback(() => {
    setReady(false);
    fail();
  }, [fail]);

  return (
    <div
      ref={containerRef}
      className={`home-hero-3d${ready ? " home-hero-3d--ready" : ""}`}
      aria-hidden="true"
    >
      {active && (
        <CanvasErrorBoundary onError={fail}>
          <Suspense fallback={null}>
            <HomeHeroScene
              onReady={handleReady}
              onContextLost={handleContextLost}
              onContextRestored={handleReady}
            />
          </Suspense>
        </CanvasErrorBoundary>
      )}
    </div>
  );
}
