import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * Genkit initialization for RecruitedAI.
 * Uses the modern @genkit-ai/google-genai plugin.
 * 
 * IMPORTANT: Ensure your GOOGLE_GENAI_API_KEY is correctly set in your .env file.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      // The API key is automatically handled by the GOOGLE_GENAI_API_KEY environment variable.
    }),
  ],
  model: 'googleai/gemini-1.5-flash', // Stable, fast, and high-quota production model
});
