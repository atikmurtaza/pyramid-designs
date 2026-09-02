import type { HTMLAttributes, PropsWithChildren } from "react";

type SectionProps = PropsWithChildren<HTMLAttributes<HTMLElement> & { as?: "div" | "section"; spacing?: "compact" | "normal" | "editorial" }>;
export function Section({ as = "section", children, className = "", spacing = "normal", ...props }: SectionProps) {
  const shared = { className: `section section--${spacing} ${className}`.trim(), ...props };
  return as === "div" ? <div {...shared}>{children}</div> : <section {...shared}>{children}</section>;
}
