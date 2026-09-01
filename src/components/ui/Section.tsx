import type { ElementType, HTMLAttributes, PropsWithChildren } from "react";

type SectionProps = PropsWithChildren<HTMLAttributes<HTMLElement> & { as?: ElementType; spacing?: "compact" | "normal" | "editorial" }>;
export function Section({ as: Tag = "section", children, className = "", spacing = "normal", ...props }: SectionProps) { return <Tag className={`section section--${spacing} ${className}`.trim()} {...props}>{children}</Tag>; }
