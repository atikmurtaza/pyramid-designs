import "server-only";

// Test fixture only; production code never imports this module. No network or persistent envelope storage.
export function syntheticEmailAdapter(outcomes = ["ACCEPTED"], inspect = () => {}) {
  if (process.env.NODE_ENV !== "test") throw new Error("Synthetic email requires NODE_ENV=test.");
  let calls = 0;
  return { mode: "synthetic", get calls() { return calls; }, async send(envelope, signal) {
    if (process.env.NODE_ENV !== "test" || !envelope.recipient.endsWith("@example.invalid"))
      throw new Error("Synthetic email boundary rejected.");
    signal.throwIfAborted();
    await inspect(envelope);
    signal.throwIfAborted();
    const outcome = outcomes[Math.min(calls++, outcomes.length - 1)];
    if (outcome === "TIMEOUT") {
      await new Promise((_, reject) => {
        if (signal.aborted) reject(new Error("Synthetic timeout."));
        else signal.addEventListener("abort", () => reject(new Error("Synthetic timeout.")), { once: true });
      });
    }
    if (outcome === "CRASH_AFTER_ACCEPTANCE") throw new Error("Synthetic failure after acceptance.");
    return outcome;
  } };
}
