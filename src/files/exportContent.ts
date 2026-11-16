/** Export captions stay brief; original tactical notes are never modified. */
export function briefNote(note: string): string {
  const clean = note.replace(/\s+/gu, " ").trim();
  const chars = Array.from(clean);
  return chars.length <= 220
    ? clean
    : chars.slice(0, 219).join("").trimEnd() + "…";
}
