
'use server';
/**
 * @fileOverview Generates a cover letter based on a master resume and a job description.
 *
 * - generateCoverLetter - A function that handles the cover letter generation process.
 * - GenerateCoverLetterInput - The input type for the generateCoverLetter function.
 * - GenerateCoverLetterOutput - The return type for the generateCoverLetter function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const GenerateCoverLetterInputSchema = z.object({
  masterResumeDataUri: z
    .string()
    .describe(
      "The user's master resume, as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  jobSpecDataUri: z
    .string()
    .optional()
    .describe(
      'The job specification file (e.g., PDF, DOCX), as a data URI. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
  jobSpecText: z.string().optional().describe('The text of the job specification, if a file is not provided.'),
  companyName: z.string().optional().describe('The name of the company. If not provided, AI will try to infer or use a placeholder.'),
  jobTitle: z.string().optional().describe('The job title. If not provided, AI will try to infer or use a placeholder.'),
  tailoredResumeText: z.string().optional().describe('Optional: Text of a resume already tailored to the job spec, for better focus.')
});
export type GenerateCoverLetterInput = z.infer<typeof GenerateCoverLetterInputSchema>;

export const GenerateCoverLetterOutputSchema = z.object({
  coverLetter: z.string().describe('The generated cover letter text.'),
});
export type GenerateCoverLetterOutput = z.infer<typeof GenerateCoverLetterOutputSchema>;

export async function generateCoverLetter(input: GenerateCoverLetterInput): Promise<GenerateCoverLetterOutput> {
  return generateCoverLetterFlow(input);
}

const generateCoverLetterPrompt = ai.definePrompt({
  name: 'generateCoverLetterPrompt',
  input: {schema: GenerateCoverLetterInputSchema},
  output: {schema: GenerateCoverLetterOutputSchema},
  prompt: `You are an expert resume and cover letter writer. Your task is to generate a concise, professional, and impactful cover letter.
The cover letter should be tailored for the role of '{{#if jobTitle}}{{jobTitle}}{{else}}[Job Title]{{/if}}' at '{{#if companyName}}{{companyName}}{{else}}[Company Name]{{/if}}'.
Use the provided Master Resume and Job Specification to identify the most relevant skills and experiences.
Highlight 2-3 key qualifications from the resume that directly address the requirements in the job specification.
Maintain an enthusiastic and professional tone.
The cover letter should be approximately 3-4 paragraphs.
If '{{jobTitle}}' or '{{companyName}}' are not explicitly provided or are generic, attempt to infer them from the Job Specification text if available, or use placeholders like "[Job Title]" and "[Company Name]" respectively.

Master Resume:
{{media url=masterResumeDataUri}}

Job Specification:
{{#if jobSpecText}}{{{jobSpecText}}}{{else}}{{#if jobSpecDataUri}}{{media url=jobSpecDataUri}}{{else}}No job specification text or file provided.{{/if}}{{/if}}

{{#if tailoredResumeText}}
Optionally, consider this tailored resume version for focus:
Tailored Resume:
{{{tailoredResumeText}}}
{{/if}}`,
});

const generateCoverLetterFlow = ai.defineFlow(
  {
    name: 'generateCoverLetterFlow',
    inputSchema: GenerateCoverLetterInputSchema,
    outputSchema: GenerateCoverLetterOutputSchema,
  },
  async (input: GenerateCoverLetterInput) => {
     if (!input.jobSpecDataUri && !input.jobSpecText) {
      throw new Error('Either jobSpecDataUri or jobSpecText must be provided for the job specification.');
    }
    const {output} = await generateCoverLetterPrompt(input);
    return output!;
  }
);
