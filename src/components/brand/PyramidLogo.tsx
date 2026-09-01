import Image from "next/image";

type PyramidLogoProps = {
  className?: string;
  decorative?: boolean;
  title?: string;
  variant?: "master" | "symbol";
};

const logos = {
  master: {
    height: 2632,
    src: "/brand/approved/pyramid-designs-master.svg",
    width: 3214,
  },
  symbol: {
    height: 1770,
    src: "/brand/derived/pyramid-designs-symbol.svg",
    width: 2500,
  },
} as const;

export function PyramidLogo({ className, decorative = false, title = "Pyramid Designs", variant = "master" }: PyramidLogoProps) {
  const logo = logos[variant];

  return (
    <Image
      alt={decorative ? "" : title}
      aria-hidden={decorative || undefined}
      className={className}
      height={logo.height}
      src={logo.src}
      unoptimized
      width={logo.width}
    />
  );
}
