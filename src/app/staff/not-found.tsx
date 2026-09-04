import Link from "next/link";

export default function StaffNotFound() {
  return (
    <section className="staff-panel">
      <p className="eyebrow">Not available</p>
      <h1>The requested staff record is unavailable</h1>
      <p>The record may not exist or the current session may not be authorized to read it.</p>
      <Link className="button button-secondary" href="/staff">Return to staff portal</Link>
    </section>
  );
}
