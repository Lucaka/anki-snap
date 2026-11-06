export function formatTagInput(tags: string[] | undefined): string {
  return (tags ?? []).join(", ");
}

/** Split a tag field on commas. Empty pieces are dropped only when saving, so a trailing comma can stay in the input. */
export function parseTags(text: string): string[] {
  return text
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
