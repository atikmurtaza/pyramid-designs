import type { HTMLAttributes, PropsWithChildren } from "react";

export function Surface({ children, className = "", ...props }: PropsWithChildren<HTMLAttributes<HTMLElement>>) {
  return <section className={`surface ${className}`.trim()} {...props}>{children}</section>;
}
