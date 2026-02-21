import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai'; 

/**
 * Genkit initialization for RecruitedAI.
 * Standardized on Gemini 3 Flash for the 2026 stable environment.
 */
export const ai = genkit({
  plugins: [
    googleAI() // Firebase Studio handles the API Key automatically in 2026
  ],
  model: 'googleai/gemini-2.5-flash', // Use the string identifier for the Gemini 3 Flash model
});
