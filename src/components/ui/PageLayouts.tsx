import type { PropsWithChildren } from "react";
export function StandardPage({ children }: PropsWithChildren) { return <main id="main-content" className="page-standard">{children}</main>; }
export function EditorialPage({ children }: PropsWithChildren) { return <main id="main-content" className="page-editorial"><div className="text-measure">{children}</div></main>; }
export function WideMediaPage({ children }: PropsWithChildren) { return <main id="main-content" className="page-wide-media">{children}</main>; }
export function TextPage({ children }: PropsWithChildren) { return <main id="main-content" className="page-text"><div className="text-measure">{children}</div></main>; }
