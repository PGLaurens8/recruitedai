'use client';

// Client-only currency detection & persistence. The pure formatting primitives
// (Currency type, formatPrice, currencySymbol, toCurrency) live in
// src/lib/currency.ts so server code can use them too; they are re-exported here
// for backwards compatibility with existing imports from '@/lib/locale'.
export {
  type Currency,
  CURRENCIES,
  currencySymbol,
  formatPrice,
  toCurrency,
} from './currency';

import { type Currency, toCurrency } from './currency';

const STORAGE_KEY = 'recruitedai.currency';

export function detectDefaultCurrency(): Currency {
  // ZAR is the default — RecruitedAI's primary market is South Africa, so the
  // SSR fallback and the no-signal case both show ZAR pricing first. A stored
  // preference or a non-ZA locale signal can still switch it to USD below.
  if (typeof window === 'undefined') return 'ZAR';

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'USD' || stored === 'ZAR') return stored;

  const lang = window.navigator.language || '';
  if (/[-_]ZA$/i.test(lang)) return 'ZAR';

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === 'Africa/Johannesburg') return 'ZAR';
  } catch {
    // Intl may not be available — fall through to default.
  }

  return 'ZAR';
}

export function persistCurrency(currency: Currency): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, toCurrency(currency));
}
