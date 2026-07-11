// Server-safe currency primitives. These have no browser dependencies, so they
// can be imported from server components, API routes, and client code alike.
// Client-only detection/persistence (localStorage, navigator, timezone) lives in
// src/lib/locale.ts and re-exports these.

export type Currency = 'USD' | 'ZAR';

export const CURRENCIES: readonly Currency[] = ['ZAR', 'USD'] as const;

export const currencySymbol: Record<Currency, string> = { USD: '$', ZAR: 'R' };

/**
 * Formats a numeric amount with the correct symbol and locale grouping for the
 * given currency. ZAR uses en-ZA grouping; USD uses a plain dollar sign.
 */
export function formatPrice(amount: number, currency: Currency): string {
  if (currency === 'ZAR') return `R${amount.toLocaleString('en-ZA')}`;
  return `$${amount.toLocaleString('en-US')}`;
}

/** Narrows an arbitrary string to a supported Currency, defaulting to ZAR. */
export function toCurrency(value: string | null | undefined): Currency {
  return value === 'USD' ? 'USD' : 'ZAR';
}
