"use client";

export default function StaffError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="staff-panel" role="alert">
      <p className="eyebrow">Read unavailable</p>
      <h1>Staff data could not be loaded</h1>
      <p>No protected data was returned. Try the request again.</p>
      <button className="button button-secondary" type="button" onClick={reset}>Try again</button>
    </section>
  );
}
