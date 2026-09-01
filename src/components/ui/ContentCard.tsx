import Link from "next/link";
import type { PropsWithChildren, ReactNode } from "react";
type ContentCardProps = PropsWithChildren<{ href: string; media?: ReactNode; meta?: ReactNode; title: string; supporting?: ReactNode; action?: ReactNode }>;
export function ContentCard({ href, media, meta, title, supporting, action, children }: ContentCardProps) { return <article className="content-card"><Link href={href} className="content-card__link"><div>{media}{meta ? <div className="content-card__meta">{meta}</div> : null}<h3 className="type-h3 content-card__title">{title}</h3>{supporting ? <p className="body content-card__supporting">{supporting}</p> : null}{children}</div>{action ? <span className="content-card__action">{action}</span> : null}</Link></article>; }
export function Metadata({ children }: PropsWithChildren) { return <span className="metadata">{children}</span>; }
