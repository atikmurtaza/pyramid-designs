import type { AnchorHTMLAttributes, PropsWithChildren } from "react";

export function TextLink({ children, className = "", ...props }: PropsWithChildren<AnchorHTMLAttributes<HTMLAnchorElement>>) {
  return <a className={`text-link ${className}`.trim()} {...props}>{children}</a>;
}
