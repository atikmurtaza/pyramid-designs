import { useId } from "react";

type PyramidMarkProps = {
  className?: string;
  decorative?: boolean;
  title?: string;
};

/** Proposed review trace only. It is not an approved production logo master. */
export function PyramidMark({ className, decorative = false, title = "Proposed Pyramid Designs mark" }: PyramidMarkProps) {
  const titleId = useId();

  return (
    <svg
      className={className}
      viewBox="0 0 480 360"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-labelledby={decorative ? undefined : titleId}
      xmlns="http://www.w3.org/2000/svg"
    >
      {decorative ? null : <title id={titleId}>{title}</title>}
      <path fill="#E8C547" d="M240 18 164 128h152L240 18ZM54 310l64-92 64 92H54Zm244 0 64-92 64 92H298Z" />
      <path fill="#30323D" d="m184 135-105 153 22 32 82-120 25 37-75 108h25l99-142-49-68h-24Zm65 0h58l73 106-63 92h-71l-28-40 91-131h24l-59 85h31l27-39-63-73Zm-60 210h67l-31-44-23 34h-34l21 30Z" />
    </svg>
  );
}
