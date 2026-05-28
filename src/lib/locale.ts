'use client';

export type Currency = 'USD' | 'ZAR';

const STORAGE_KEY = 'recruitedai.currency';

export function detectDefaultCurrency(): Currency {
  if (typeof window === 'undefined') return 'USD';

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

  return 'USD';
}

export function persistCurrency(currency: Currency): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, currency);
}

export function formatPrice(amount: number, currency: Currency): string {
  if (currency === 'ZAR') return `R${amount.toLocaleString('en-ZA')}`;
  return `$${amount}`;
}

export const currencySymbol: Record<Currency, string> = { USD: '$', ZAR: 'R' };
