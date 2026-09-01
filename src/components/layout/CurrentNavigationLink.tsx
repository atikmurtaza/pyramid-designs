"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

type NavigationLinkProps = ComponentProps<typeof Link>;
export function CurrentNavigationLink({ href, children, ...props }: NavigationLinkProps) { const pathname = usePathname(); const current = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`); return <Link href={href} aria-current={current ? "page" : undefined} {...props}>{children}</Link>; }
