
'use server';
/**
 * @fileOverview Generates a candidate profile summary from interview notes.
 *
 * - generateCandidateProfile - A function that handles the profile generation.
 * - GenerateCandidateProfileInput - The input type for the function.
 * - GenerateCandidateProfileOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCandidateProfileInputSchema = z.object({
  candidateName: z.string().optional().describe("The candidate's name."),
  candidateRole: z.string().optional().describe("The target role for the candidate."),
  interviewNotes: z.string().describe("A collection of notes taken by a recruiter during a screening interview. Each note is paired with the question asked."),
});
export type GenerateCandidateProfileInput = z.infer<typeof GenerateCandidateProfileInputSchema>;

const GenerateCandidateProfileOutputSchema = z.object({
  profileSummary: z.string().describe("A concise, professional summary of the candidate suitable for a client profile. It should be written in the third person, be 2-4 paragraphs long, and highlight the candidate's background, strengths, career goals, and overall suitability based on the interview notes."),
});
export type GenerateCandidateProfileOutput = z.infer<typeof GenerateCandidateProfileOutputSchema>;

export async function generateCandidateProfile(input: GenerateCandidateProfileInput): Promise<GenerateCandidateProfileOutput> {
  return generateCandidateProfileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCandidateProfilePrompt',
  input: {schema: GenerateCandidateProfileInputSchema},
  output: {schema: GenerateCandidateProfileOutputSchema},
  prompt: `You are an expert recruitment consultant. Your task is to write a compelling and professional candidate profile summary based on the raw interview notes provided.

The summary should be written in the third person.
It should be 2-4 paragraphs long.
Do not just repeat the notes; synthesize the information into a coherent narrative.
Start by introducing the candidate{{#if candidateName}}, {{candidateName}},{{/if}} and the type of role they are seeking{{#if candidateRole}} (e.g., {{candidateRole}}){{/if}}.
Highlight their key strengths, relevant experience, and career aspirations.
Conclude with a sentence on their overall suitability and availability.
Maintain a professional and positive tone.

Here are the interview notes:
---
{{{interviewNotes}}}
---`,
});

const generateCandidateProfileFlow = ai.defineFlow(
  {
    name: 'generateCandidateProfileFlow',
    inputSchema: GenerateCandidateProfileInputSchema,
    outputSchema: GenerateCandidateProfileOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
