import Link from "next/link";

export function StaffPageHeading({ eyebrow, title, summary }: {
  eyebrow: string;
  title: string;
  summary: string;
}) {
  return (
    <header className="staff-page-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{summary}</p>
    </header>
  );
}

export function StaffEmptyState({ children }: Readonly<{ children: React.ReactNode }>) {
  return <p className="staff-empty">{children}</p>;
}

export function StaffBackLink({ href, children }: Readonly<{ href: string; children: React.ReactNode }>) {
  return <Link className="text-link staff-back-link" href={href}>{children}</Link>;
}

export function formatStaffDate(value: Date | null) {
  if (!value) return "No deadline";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(value);
}

export function formatStaffRole(role: string) {
  return role.toLowerCase().split("_").map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join(" ");
}
