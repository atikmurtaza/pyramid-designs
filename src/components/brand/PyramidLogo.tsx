import Image from "next/image";

type PyramidLogoProps = {
  className?: string;
  decorative?: boolean;
  title?: string;
};

const approvedLogoPath = "/brand/approved/pyramid-designs-master.svg";

export function PyramidLogo({ className, decorative = false, title = "Pyramid Designs" }: PyramidLogoProps) {
  return (
    <Image
      alt={decorative ? "" : title}
      aria-hidden={decorative || undefined}
      className={className}
      height={2632}
      src={approvedLogoPath}
      unoptimized
      width={3214}
    />
  );
}
