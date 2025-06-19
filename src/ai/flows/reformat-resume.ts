
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
    .describe('The reformatted resume in a modern, professional, human-readable text format, ready for display. This should NOT be a JSON string.'),
  fullName: z.string().optional().describe("The full name of the resume holder, extracted from the resume content."),
  currentJobTitle: z.string().optional().describe("The current or most recent job title of the resume holder, extracted from the resume content."),
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
The 'reformattedResume' output field MUST be a human-readable text version of the resume, well-formatted with appropriate sections, line breaks, and spacing.
It should be suitable for direct display to a user and for them to copy and paste.
DO NOT output a JSON string or any code-like structure for the 'reformattedResume' field itself.

You will also extract the full name of the resume holder and their current or most recent job title from the resume content. Populate the 'fullName' and 'currentJobTitle' fields in the output.
If these cannot be reliably determined, leave them blank or undefined.

Additionally, identify any missing information in the resume and provide an array of strings indicating what is missing in the 'missingInformation' field.
Provide an array of questions in the 'questions' field to prompt the user to complete the resume with the missing information.

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
