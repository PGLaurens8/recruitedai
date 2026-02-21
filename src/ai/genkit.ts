import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai'; 

/**
 * Genkit initialization for RecruitedAI.
 * Locked to Gemini 2.5 Flash per user requirement.
 */
export const ai = genkit({
  plugins: [
    googleAI() // Firebase Studio handles the API Key automatically
  ],
  model: 'googleai/gemini-2.5-flash', 
});
