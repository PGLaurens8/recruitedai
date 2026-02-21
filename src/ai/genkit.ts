
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

/**
 * Genkit initialization for RecruitedAI.
 * Uses Gemini 1.5 Flash for a balance of speed, reliability, and high quota availability.
 * 
 * If you encounter 404 or 429 errors, ensure your API key is valid and the 
 * Generative Language API is enabled in your Google AI Studio project.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      // The API key is automatically handled by the GOOGLE_GENAI_API_KEY environment variable.
    }),
  ],
  model: 'googleai/gemini-1.5-flash', // Stable production model identifier
});
