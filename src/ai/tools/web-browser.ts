'use server';
/**
 * @fileOverview A tool for fetching the text content of a website.
 */
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { JSDOM } from 'jsdom';

const WebsiteContentInputSchema = z.object({
  url: z.string().describe('The URL of the website to scrape.'),
});

const WebsiteContentOutputSchema = z.object({
  content: z.string().describe('The scraped text content of the website.'),
});

function isPrivateIpv4(ip: string) {
  const parts = ip.split('.').map((v) => Number(v));
  if (parts.length !== 4 || parts.some((v) => Number.isNaN(v) || v < 0 || v > 255)) {
    return true;
  }

  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 0) return true;

  return false;
}

function isPrivateIpv6(ip: string) {
  const normalized = ip.toLowerCase();
  if (normalized === '::1') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true;
  }
  return false;
}

function assertSafeIp(ip: string) {
  if (isIP(ip) === 4 && isPrivateIpv4(ip)) {
    throw new Error('Private IPv4 addresses are not allowed.');
  }

  if (isIP(ip) === 6 && isPrivateIpv6(ip)) {
    throw new Error('Private IPv6 addresses are not allowed.');
  }
}

async function assertSafeUrl(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid URL.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http/https URLs are allowed.');
  }

  if (url.username || url.password) {
    throw new Error('URLs with embedded credentials are not allowed.');
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.local')) {
    throw new Error('Localhost and .local domains are not allowed.');
  }

  if (isIP(hostname)) {
    assertSafeIp(hostname);
    return url;
  }

  const records = await lookup(hostname, { all: true, verbatim: true });
  if (records.length === 0) {
    throw new Error('URL host could not be resolved.');
  }

  for (const record of records) {
    assertSafeIp(record.address);
  }

  return url;
}

async function fetchWithRedirectValidation(rawUrl: string) {
  let currentUrl = rawUrl;

  for (let i = 0; i < 5; i += 1) {
    const safeUrl = await assertSafeUrl(currentUrl);
    const response = await fetch(safeUrl.toString(), {
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
      headers: {
        'user-agent': 'RecruitedAI-WebFetcher/1.0',
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error('Redirect response missing location header.');
      }
      currentUrl = new URL(location, safeUrl).toString();
      continue;
    }

    return response;
  }

  throw new Error('Too many redirects.');
}

export const getWebsiteContent = ai.defineTool(
  {
    name: 'getWebsiteContent',
    description:
      'Fetches the text content from a given URL. Use this to get information from a specific company website.',
    inputSchema: WebsiteContentInputSchema,
    outputSchema: WebsiteContentOutputSchema,
  },
  async (input) => {
    try {
      const response = await fetchWithRedirectValidation(input.url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      const dom = new JSDOM(html);

      dom.window.document.querySelectorAll('script, style').forEach((el) => el.remove());

      const body = dom.window.document.querySelector('body');

      let textContent = body?.textContent || '';
      textContent = textContent.replace(/\s+/g, ' ').trim();
      const maxLength = 15000;
      if (textContent.length > maxLength) {
        textContent = textContent.substring(0, maxLength) + '... [content truncated]';
      }

      return {
        content: textContent,
      };
    } catch (error: any) {
      console.error(`Error fetching website content for ${input.url}:`, error);
      return {
        content: `Error: Could not retrieve content from the URL. The website may be down, blocking requests, or the URL may be incorrect. Error message: ${error.message}`,
      };
    }
  }
);
