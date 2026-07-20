const SUFFIX_MULTIPLIERS = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 };

/**
 * Parses strings like "3.5%", "215K", "-0.2%", "1.2B" into plain numbers.
 * Returns null if the value is empty or unparseable.
 */
export function parseFigure(value) {
  if (value === null || value === undefined || value === '') return null;

  const str = String(value).trim();
  const match = str.match(/^(-?[\d.,]+)\s*([KMBT%])?$/i);
  if (!match) return null;

  const numPart = parseFloat(match[1].replace(/,/g, ''));
  if (isNaN(numPart)) return null;

  const suffix = match[2]?.toUpperCase();
  if (suffix && SUFFIX_MULTIPLIERS[suffix]) {
    return numPart * SUFFIX_MULTIPLIERS[suffix];
  }
  return numPart; // handles plain numbers and % (we treat % as the raw number)
}
