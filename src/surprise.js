import { parseFigure } from './parseFigure.js';

// Some indicators are "higher = currency bullish" (CPI, NFP, GDP, PMI, Retail Sales)
// Others are "higher = currency bearish" (Unemployment Rate, Jobless Claims)
const INVERTED_EVENTS = ['unemployment rate', 'unemployment claims', 'jobless claims'];

function isInverted(eventName) {
  const lower = eventName.toLowerCase();
  return INVERTED_EVENTS.some(k => lower.includes(k));
}

/**
 * Compute surprise = actual - forecast, direction-adjusted.
 * Positive surprise = bullish for that event's currency.
 * Negative surprise = bearish for that event's currency.
 *
 * Accepts raw string figures (e.g. "3.5%", "215K") and parses them.
 */
export function calculateSurprise({ event, country, actual, forecast }) {
  const actualNum = parseFigure(actual);
  const forecastNum = parseFigure(forecast);

  if (actualNum === null) {
    return null; // no actual value provided
  }
  if (forecastNum === null) {
    // no forecast to compare against - can't compute a surprise,
    // but we can still report the actual/previous values
    return { rawDiff: null, directionalSurprise: null, magnitude: 'no-forecast', currency: country, bullishFor: null };
  }

  const rawDiff = actualNum - forecastNum;
  const inverted = isInverted(event);
  const directionalSurprise = inverted ? -rawDiff : rawDiff;

  const magnitude =
    Math.abs(rawDiff) < 0.001
      ? 'in-line'
      : Math.abs(directionalSurprise) / Math.max(Math.abs(forecastNum), 0.01) > 0.15
        ? 'large'
        : 'modest';

  return {
    rawDiff: parseFloat(rawDiff.toFixed(3)),
    directionalSurprise: parseFloat(directionalSurprise.toFixed(3)),
    magnitude,
    currency: country,
    bullishFor: directionalSurprise > 0 ? country : directionalSurprise < 0 ? `not-${country}` : null,
  };
}
