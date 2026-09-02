# 3D and motion prototype

**Phase:** 1K
**Research and implementation date:** September 2, 2026
**Status:** PASS WITH ISSUES

## 1. Purpose

Phase 1K adds a controlled procedural 3D proof of concept to the approved static frontend. The Home hero and Culture collaboration section remain complete without WebGL. The canvas is decorative progressive enhancement and does not contain navigation or essential content.

## 2. Home concept

The Home scene uses three separated tetrahedral volumes in Pyramid Designs yellow, charcoal and warm neutral. The pieces move from a restrained exploded state into an assembled composition, then retain a small idle drift. Precise-pointer desktop movement produces a limited camera shift. The scene is inspired by pyramid geometry without importing, distorting, recolouring or rebuilding the approved logo.

The existing `HomeHeroVisual` composition remains server-rendered underneath the optional canvas.

## 3. Culture concept

The Culture scene uses four connected visual volumes to represent disciplines contributing to one project conversation. It communicates multidisciplinary connection rather than reporting hierarchy. The current prototype labels Design, Development, Engineering, and Marketing and content, matching the existing frontend vocabulary without asserting a final organisation chart.

The equivalent HTML is a visible fieldset with four native radio controls and visible descriptions. Selecting a radio changes the visual emphasis when 3D is active. All descriptions remain present when JavaScript or WebGL is unavailable.

## 4. Dependency versions

Official npm registry and React Three Fiber documentation were checked on September 2, 2026.

| Package | Stable version researched | Decision |
| --- | ---: | --- |
| `three` | `0.185.1` | Installed as an exact runtime dependency. |
| `@react-three/fiber` | `9.7.0` | Installed as an exact runtime dependency. Its React 19 peer range matches the current site. |
| `@react-three/drei` | `10.7.8` | Researched but not installed. The procedural scenes need no helper abstraction. |
| `@types/three` | `0.185.4` | Installed as an exact development dependency for the current TypeScript toolchain. |

GSAP and Motion were not installed. CSS owns canvas fades; React Three Fiber owns scene animation and pointer response.

## 5. Client boundaries

The Home and Culture pages remain Server Components.

- `HomeHero3DEnhancement` is the Home capability and lazy-loading boundary.
- `HomeHeroScene` is loaded only when the Home capability policy permits an active canvas.
- `CultureCollaborationVisual` owns the semantic radio state and optional Culture enhancement.
- `CultureCollaborationScene` is loaded only when the Culture policy permits an active canvas.
- `progressive-3d.tsx` contains the shared capability, viewport, visibility and local error-boundary policy.

No route shell or complete page was converted to a Client Component.

## 6. Loading strategy

Static markup and imagery render immediately. `React.lazy` and `Suspense` defer each scene module. No spinner, blocking placeholder or canvas-sized blank area is introduced. A canvas fades over the already-rendered fallback after its WebGL renderer is created.

At 1280 x 800 in the final warm-cache production browser run, the Home canvas became visible 454ms after navigation began. This is a local measurement, not a field or cold-cache metric.

## 7. Fallback hierarchy

1. Precise-pointer viewport above 768px, WebGL available, motion allowed and Save-Data off: interactive 3D.
2. Reduced motion: static HTML/image fallback.
3. Save-Data: static HTML/image fallback.
4. WebGL unavailable: static HTML/image fallback.
5. Small viewport or coarse pointer: Home static fallback; Culture static fallback with an optional 3D button when otherwise eligible.
6. Runtime render error: local error boundary removes the enhancement and retains fallback content.
7. WebGL context loss: the canvas is visually withdrawn; restoration makes it visible again.
8. JavaScript unavailable: server-rendered Home composition and Culture image/semantic fieldset remain.

## 8. Reduced-motion behaviour

`prefers-reduced-motion: reduce` prevents either scene from loading. This removes assembly, idle motion, pointer camera movement and any future canvas-linked motion. The current browser tooling could inspect the normal-motion branch but could not emulate this media feature, so reduced-motion emulation remains a production validation gate.

## 9. Save-Data behaviour

The capability check treats `navigator.connection?.saveData === true` as a hard static-fallback decision. The property is optional and absence does not block capable browsers. The available browser tooling could not emulate Save-Data, so this branch remains a production validation gate.

## 10. Mobile behaviour

Home defaults to its complete static hero at 768px and below or on a coarse pointer. Culture also defaults to the image and semantic fieldset, but offers `Enable optional 3D view` when WebGL is available, motion is allowed and Save-Data is off. The opt-in is local to the current page instance and is not persisted.

At 390 x 844, browser review confirmed zero Home canvases, the static hero visible, CTA bottom at 370.16px, and zero horizontal overflow. Culture initially had zero canvases, one opt-in button, four semantic radios and the fallback image. Activating the button produced one canvas without horizontal overflow.

## 11. Capability strategy

The policy uses only practical signals:

- WebGL 2 or WebGL availability;
- `prefers-reduced-motion`;
- optional Save-Data;
- a 768px viewport threshold;
- coarse pointer detection;
- section intersection;
- document visibility;
- local render failure.

No synthetic benchmark, device scoring or user-agent classification is present.

## 12. Asset budget

The scenes are fully procedural.

- GLB/model payload: `0 bytes`.
- Texture payload: `0 bytes`.
- Poster added by Phase 1K: `0 bytes`; existing static visual and Culture image are reused.
- Target compressed 3D asset budget: under 700KB.
- Actual compressed model/texture use: `0 bytes`, therefore within the asset budget.

## 13. Bundle impact

Measurements use production builds from the same checkout and raw file byte totals. Gzip values are the sum of each emitted script compressed independently with Node zlib level 9, making them reproducible but not a claim about a CDN's exact transfer encoding.

| Measurement | Before Phase 1K | After Phase 1K | Change |
| --- | ---: | ---: | ---: |
| All emitted static JavaScript chunks, raw | 607,850 bytes | 1,515,681 bytes | +907,831 bytes |
| All emitted static CSS chunks, raw | 84,542 bytes | 86,294 bytes | +1,752 bytes |

Browser-observed Home script sets after the Phase 1K build:

| Home state | Raw scripts | Level-9 gzip |
| --- | ---: | ---: |
| Mobile static fallback observed request set | 481,409 bytes | 144,035 bytes |
| Desktop after 3D canvas load | 1,384,939 bytes | 382,859 bytes |
| Deferred 3D difference | 903,530 bytes | 238,824 bytes |

The large deferred difference is the Three.js and React Three Fiber runtime plus the small procedural scene modules. It is not requested by the mobile static Home path in the observed production browser DOM.

## 14. Performance findings

- DPR is clamped to `[1, 1.5]`. At a browser DPR of 1.25, the 476.1 x 595.53 CSS-pixel Home canvas rendered at 595 x 744 device pixels.
- No shadows, environment maps, textures or post-processing are present.
- The Home canvas became ready in 454ms during the final warm-cache 1280 x 800 local production navigation.
- Scrolling Home fully offscreen changed the live canvas count from one to zero; returning to the hero restored one canvas.
- A reliable frame-rate capture was not available through the current browser tooling. The 50 to 60fps target on representative mid-range Android-class hardware remains a production validation gate.
- No claim is made about Android hardware, cold-cache loading, field Core Web Vitals or production CDN behaviour.

## 15. Accessibility

Both canvases are contained by `aria-hidden="true"` wrappers and are not focusable content. Home navigation and CTA content remain HTML. Culture retains a visible fieldset, legend, four radio controls and four text descriptions. Pointer, keyboard and touch users select the same native controls; no raycasting exposes essential information. The selected Culture row has a non-colour radio state and a forced-colours outline.

Browser review confirmed the expected focusable semantic radio group, no horizontal overflow, and no canvas overlap with Home H1 or CTA regions.

## 16. Runtime lifecycle

An `IntersectionObserver` activates a scene only while its owning visual intersects the viewport. Leaving the section unmounts the canvas and disposes the renderer through React Three Fiber. `visibilitychange` also removes the active scene while the document is hidden. Returning to the section or visible tab remounts the cached scene module.

The offscreen path was browser-verified. The available in-app browser kept the inspected document visible when another test tab opened, so the hidden-tab branch was not runtime-observed and remains a production validation item.

## 17. Error and context-loss handling

A local React error boundary catches scene/module failures, logs a safe development-only warning and retains the static fallback. WebGL context loss prevents the default terminal loss, hides the canvas, and restores it after `webglcontextrestored`. No technical error is presented to visitors.

Actual forced context-loss injection was not available in the controlled browser tooling and remains a production validation item.

## 18. Deferred 3D scope

Phase 1K does not add Work or project viewers, Careers 3D, Join 3D, Contact 3D, Company 3D, full-page canvas backgrounds, scroll pinning, scroll hijacking, GSAP, Motion, post-processing, analytics or project-specific models.

## 19. Production validation still required

- Owner/reviewer visual acceptance of the Home and Culture concepts.
- Reduced-motion emulation on supported desktop and mobile browsers.
- Save-Data emulation on a browser exposing the Network Information API.
- Deliberate WebGL-disabled and forced context-loss tests.
- Hidden-tab suspension on a browser that exposes a genuine background visibility state.
- Cold-cache and throttled-network canvas timing.
- Representative mid-range Android hardware frame-rate, thermal and battery review.
- Safari, Firefox and production Chrome WebGL review.
- Production CDN compression and field performance measurements.
- Final factual Culture taxonomy and copy approval.

## 20. Phase 1L inputs

If Phase 1K receives owner/reviewer acceptance, Phase 1L should perform the final complete frontend acceptance gate across static and enhanced states. It should include the production-content replacement inventory, browser and accessibility matrix, performance budgets, fallback proof, final dependency/security review and an explicit decision on whether the 238,824-byte reproducibly gzipped deferred runtime is acceptable for launch.

Phase 1L is not started by this document.

## 21. Phase 1K-V verification

**Verification date:** September 2, 2026
**Result:** PASS WITH ISSUES

This section records the final controlled fallback, lifecycle and performance verification. It does not replace the original Phase 1K observations above; where Phase 1K-V found a defect or obtained stronger evidence, the result below supersedes the earlier prototype observation.

### Reduced motion

Chrome browser-level `prefers-reduced-motion: reduce` emulation was exercised on Home and Culture. Both routes produced zero canvases, and the deferred Three.js / React Three Fiber runtime was not requested. Home retained its static visual, H1 and HTML CTAs. Culture retained its fallback image, fieldset, legend and four radio controls. At 390px and 320px, the optional 3D control was absent, so reduced-motion users could not opt into the animated enhancement. No canvas-sized layout hole remained.

### Save-Data

`navigator.connection.saveData` was injected as `true` before page scripts in isolated browser contexts, exercising the production capability branch without adding a repository test seam. Home and Culture produced zero canvases, did not request the deferred 3D runtime and retained their complete static and semantic content. The mobile Culture opt-in was absent under Save-Data.

### Hidden-tab lifecycle

Genuine hidden-document verification was unavailable in the local automation environment. Headless background pages continued to report `document.visibilityState === "visible"`; CDP frozen lifecycle state suspended execution but emitted no visibility transition; and switching away from a headful Chrome tab still left the inspected page reporting visible. The hidden-tab listener therefore remains source-present but not runtime-verified and is retained as a pre-production gate. No PASS is claimed for hidden-tab suspend/resume.

### Forced WebGL context loss

`WEBGL_lose_context` was exercised on Home and Culture. The initial implementation attempted restoration and exposed a Three.js page error. The shared enhancement policy was corrected so context loss marks the optional enhancement failed and permanently retires that canvas for the current mount. Retesting observed one canvas become zero; static Home content and Culture semantic controls remained usable; attempted restoration left the safe fallback in place; navigation remained available; and no page or console errors were emitted. This fail-closed fallback supersedes the restoration behaviour described in the original Phase 1K record.

### Cold cache and desktop deferred loading

Fresh isolated Chrome contexts with cache disabled confirmed static content before enhancement:

- At 1440px, Home DOM/static content was available at approximately 940ms, the deferred runtime request began at approximately 1,049ms, and the canvas was ready at approximately 1,855ms. Measured cumulative layout shift was `0`.
- At 1280px under a Fast-3G-equivalent controlled profile, Home DOM/static content was available at approximately 517ms, the deferred runtime request began at approximately 1,354ms, and the canvas was ready at approximately 3,493ms. Measured cumulative layout shift was `0.000105`.

In both runs, the server-rendered H1, CTAs and fallback visual were present before any canvas and remained usable while 3D loaded. These are local controlled measurements, not field Core Web Vitals or production CDN claims.

### Mobile network loading and Culture opt-in

At 390px and 320px, Home initially produced no canvas and made no request for the deferred 3D runtime. Its HTML CTAs retained at least 44px targets and the page had no horizontal overflow.

At both mobile widths, Culture initially produced no canvas or deferred-runtime request, while retaining the fallback image, four semantic radios and a 44px-minimum opt-in control. Activating the opt-in requested the deferred runtime and created exactly one canvas. Keyboard selection changed the checked semantic state and visible row highlight to Engineering. Navigating away reduced the canvas count to zero. Under reduced motion or Save-Data, the opt-in was absent as recorded above.

### Offscreen lifecycle

Home and Culture each completed two repeated offscreen cycles with observed canvas counts `1 -> 0 -> 1 -> 0 -> 1`. The maximum live canvas count remained one, with no visible DOM canvas accumulation. This verifies viewport unmount/remount; it does not substitute for the separate hidden-tab gate.

### Accessibility regression

Enhanced canvases had `tabIndex=-1` and an `aria-hidden="true"` ancestor. Focus did not enter a canvas across 18 Home tab stops, and Home CTAs remained ordinary HTML. Culture remained a fieldset with a legend and four native radios; ArrowDown changed selection from Design to Development. Checked radio state and the visible selected-row treatment preserve meaning beyond colour alone. Canvas loading, offscreen unmounting and context failure did not move focus.

### Performance budget judgment

The final production build emits 1,515,681 raw bytes of static JavaScript in total. The observed mobile Home request set was 481,409 raw / 144,035 level-9 gzip bytes; the desktop enhanced request set was 1,384,939 raw / 382,859 gzip bytes; and the deferred difference was 903,530 raw / 238,824 gzip bytes. A cold Chrome response for the main runtime chunk reported 236,545 encoded bytes.

The approximately 239KB gzip deferred runtime is acceptable for this Phase 1 proof concept because mobile/static fallback does not request it, desktop loading is genuinely deferred behind useful server-rendered content, and it introduces no blocking model or texture payload. Drei, GSAP, Motion, post-processing, GLB models and textures remain absent. Launch acceptance still requires field/device evidence and a later final performance decision.

### Remaining production validation

- Genuine hidden-tab suspend/resume in a browser environment that exposes background visibility state.
- Representative physical mid-range Android validation targeting stable approximately 50-60fps without material input or scroll degradation, plus thermal and battery review.
- Safari and Firefox fallback, WebGL, accessibility and lifecycle review.
- Production CDN compression and field performance measurements.
- Owner/reviewer visual acceptance and final factual Culture taxonomy/copy approval.

Phase 1K-V did not deploy, touch production DNS, add backend/provider integration or begin Phase 1L.
