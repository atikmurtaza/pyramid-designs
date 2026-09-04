"use client";

import { useFormStatus } from "react-dom";

export function PendingSubmitButton({ children }: Readonly<{ children: React.ReactNode }>) {
  const { pending } = useFormStatus();
  return (
    <button className="button button-primary" disabled={pending} type="submit">
      {pending ? "Saving…" : children}
    </button>
  );
}
