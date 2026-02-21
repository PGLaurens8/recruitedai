import {genkit} from 'genkit';
import {googleAI, gemini15Flash} from '@genkit-ai/google-genai';

/**
 * Genkit initialization for RecruitedAI.
 * Uses the modern google-genai plugin and Gemini 1.5 Flash for optimal performance.
 * 
 * IMPORTANT: Ensure the "Generative Language API" is enabled in your Google Cloud Project
 * and that your GOOGLE_GENAI_API_KEY is correctly set in your .env file.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      // The API key is automatically handled by the GOOGLE_GENAI_API_KEY environment variable.
    }),
  ],
  model: gemini15Flash, // Stable, fast, and high-quota production model
});