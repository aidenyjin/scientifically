/** Blank marker used by fill_blank and word_bank text. */
export const BLANK = "___";

export function countBlanks(text: string): number {
  return text.split(BLANK).length - 1;
}

/** Split text into the pieces between blanks: "a ___ b ___ c" → ["a ", " b ", " c"]. */
export function splitBlanks(text: string): string[] {
  return text.split(BLANK);
}

/** Normalise a typed answer: trim, collapse whitespace, optional lowercase. */
export function normalizeAnswer(value: string, caseSensitive = false): string {
  const collapsed = value.trim().replace(/\s+/g, " ");
  return caseSensitive ? collapsed : collapsed.toLowerCase();
}
