/** A slug we are willing to mint from client-supplied text. Pure, so
    both server routes and browser components can share it. */
export function sanitizeSlug(raw: string): string {
  return (raw ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
