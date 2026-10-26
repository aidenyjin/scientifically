/** Levenshtein edit distance (insert / delete / substitute, each cost 1). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row.push(Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost));
    }
    prev = row;
  }
  return prev[b.length];
}

export const MIN_TYPO_LETTERS = 5;

/**
 * Chemistry suffixes where one letter changes the meaning (alkane/alkene,
 * sulfate/sulfite, chlorine/chloride). A one-letter slip between two of
 * these is a different answer, not a typo.
 */
const MEANINGFUL_SUFFIXES = [
  ["ane", "ene", "yne"],
  ["ate", "ite", "ide", "ine"],
];

/** Distinct science terms one letter apart. Typing one for the other is never a typo. */
const CONFUSABLE_PAIRS = [
  ["proton", "photon"],
  ["neutron", "neuron"],
  ["absorb", "adsorb"],
  ["ileum", "ilium"],
];

function suffixFamily(word: string): { family: number; suffix: string } | null {
  for (let family = 0; family < MEANINGFUL_SUFFIXES.length; family++) {
    const suffix = MEANINGFUL_SUFFIXES[family].find((s) => word.endsWith(s));
    if (suffix) return { family, suffix };
  }
  return null;
}

function isConfusable(typed: string, answer: string): boolean {
  const a = suffixFamily(typed);
  const b = suffixFamily(answer);
  if (a && b && a.family === b.family && a.suffix !== b.suffix) return true;
  return CONFUSABLE_PAIRS.some(
    ([x, y]) => (typed.includes(x) && answer.includes(y)) || (typed.includes(y) && answer.includes(x)),
  );
}

/**
 * True when `typed` is a one-letter slip of `answer` (both already normalised
 * and lowercase). Only for answers with at least MIN_TYPO_LETTERS letters.
 */
export function isForgivableTypo(typed: string, answer: string): boolean {
  const letters = answer.match(/\p{L}/gu)?.length ?? 0;
  if (letters < MIN_TYPO_LETTERS) return false;
  if (levenshtein(typed, answer) !== 1) return false;
  return !isConfusable(typed, answer);
}
