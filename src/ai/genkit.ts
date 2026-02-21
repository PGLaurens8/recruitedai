
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

/**
 * Genkit initialization for RecruitedAI.
 * Uses Gemini 2.0 Flash for ultra-fast CV extraction and analysis.
 */
export const ai = genkit({
  plugins: [
    googleAI({
      // The API key is automatically handled by the environment or Studio settings.
    }),
  ],
  model: 'googleai/gemini-2.0-flash', // Ultra-fast version optimized for high-throughput extraction
});
