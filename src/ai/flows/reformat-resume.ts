'use server';

/**
 * @fileOverview This file contains the Genkit flow for reformatting a resume.
 *
 * - reformatResume - A function that handles the resume reformatting process.
 * - ReformatResumeInput - The input type for the reformatResume function.
 * - ReformatResumeOutput - The return type for the reformatResume function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ReformatResumeInputSchema = z.object({
  resumeDataUri: z
    .string()
    .describe(
      "The resume file (Word or PDF) as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ReformatResumeInput = z.infer<typeof ReformatResumeInputSchema>;

const ReformatResumeOutputSchema = z.object({
  reformattedResume: z
    .string()
    .describe('The reformatted resume in a modern, professional format.'),
  missingInformation: z
    .array(z.string())
    .describe('An array of strings indicating missing information in the resume.'),
  questions: z
    .array(z.string())
    .describe('An array of questions to prompt the user to complete the resume.'),
});
export type ReformatResumeOutput = z.infer<typeof ReformatResumeOutputSchema>;

export async function reformatResume(input: ReformatResumeInput): Promise<ReformatResumeOutput> {
  return reformatResumeFlow(input);
}

const reformatResumePrompt = ai.definePrompt({
  name: 'reformatResumePrompt',
  input: {schema: ReformatResumeInputSchema},
  output: {schema: ReformatResumeOutputSchema},
  prompt: `You are an AI resume expert. You will reformat the provided resume into a modern, professional template.

You will identify any missing information in the resume and provide an array of strings indicating what is missing.

You will also provide an array of questions to prompt the user to complete the resume with the missing information.

Resume:
{{media url=resumeDataUri}}`,
});

const reformatResumeFlow = ai.defineFlow(
  {
    name: 'reformatResumeFlow',
    inputSchema: ReformatResumeInputSchema,
    outputSchema: ReformatResumeOutputSchema,
  },
  async input => {
    const {output} = await reformatResumePrompt(input);
    return output!;
  }
);
