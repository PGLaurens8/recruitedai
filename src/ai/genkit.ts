
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

/**
 * Genkit initialization for RecruitedAI.
 * Uses Gemini 1.5 Flash for a balance of speed, reliability, and high quota availability.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      // The API key is automatically handled by the environment or Studio settings.
    }),
  ],
  model: 'googleai/gemini-1.5-flash', // Stable production model with better quota availability
});
