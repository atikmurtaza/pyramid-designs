import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";
type MediaFrameProps = PropsWithChildren<HTMLAttributes<HTMLElement> & { caption?: ReactNode }>;
export function MediaFrame({ children, caption, className = "", ...props }: MediaFrameProps) { return <figure className={`media-frame ${className}`.trim()} {...props}><div className="media-frame__content">{children}</div>{caption ? <figcaption className="caption media-frame__caption">{caption}</figcaption> : null}</figure>; }
