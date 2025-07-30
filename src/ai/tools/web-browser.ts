'use server';
/**
 * @fileOverview A tool for fetching the text content of a website.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {JSDOM} from 'jsdom';

// Define the schema for the tool's input
const WebsiteContentInputSchema = z.object({
  url: z.string().describe('The URL of the website to scrape.'),
});

// Define the schema for the tool's output
const WebsiteContentOutputSchema = z.object({
  content: z.string().describe('The scraped text content of the website.'),
});

// Define the tool using Genkit's `defineTool`
export const getWebsiteContent = ai.defineTool(
  {
    name: 'getWebsiteContent',
    description: 'Fetches the text content from a given URL. Use this to get information from a specific company website.',
    input: {schema: WebsiteContentInputSchema},
    output: {schema: WebsiteContentOutputSchema},
  },
  async (input) => {
    try {
      const response = await fetch(input.url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const html = await response.text();
      const dom = new JSDOM(html);
      
      // Remove script and style elements
      dom.window.document.querySelectorAll('script, style').forEach((el) => el.remove());
      
      const body = dom.window.document.querySelector('body');
      
      // Extract text, normalize whitespace, and limit length
      let textContent = body?.textContent || '';
      textContent = textContent.replace(/\s+/g, ' ').trim();
      const maxLength = 15000; // Limit content size to avoid overly large prompts
      if (textContent.length > maxLength) {
        textContent = textContent.substring(0, maxLength) + '... [content truncated]';
      }

      return {
        content: textContent,
      };
    } catch (error: any) {
      console.error(`Error fetching website content for ${input.url}:`, error);
      // Return a structured error message that the LLM can understand
      return {
        content: `Error: Could not retrieve content from the URL. The website may be down, blocking requests, or the URL may be incorrect. Error message: ${error.message}`,
      };
    }
  }
);
