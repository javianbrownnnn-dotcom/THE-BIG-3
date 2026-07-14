/**
 * Human-readable message from anything a data layer can throw. Supabase
 * (PostgREST/GoTrue/Functions) rejects with plain objects in several paths —
 * `String(err)` on those prints "[object Object]", which is what users were
 * seeing in error toasts. Route every toast through this instead.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function messageOf(err: any): string {
  if (err == null) return "Something went wrong (no error details).";
  if (typeof err === "string") return err;
  if (err instanceof Error && err.message) return err.message;
  // Supabase error shapes: {message, details, hint, code} (PostgREST),
  // {error_description} (OAuth), {error: "..."} (edge functions/HTTP).
  const msg =
    (typeof err.message === "string" && err.message) ||
    (typeof err.error_description === "string" && err.error_description) ||
    (typeof err.error === "string" && err.error) ||
    (typeof err.details === "string" && err.details);
  if (msg) {
    const hint = typeof err.hint === "string" && err.hint ? ` (${err.hint})` : "";
    return `${msg}${hint}`;
  }
  try {
    const json = JSON.stringify(err);
    if (json && json !== "{}") return json;
  } catch {
    // circular — fall through
  }
  return String(err);
}
