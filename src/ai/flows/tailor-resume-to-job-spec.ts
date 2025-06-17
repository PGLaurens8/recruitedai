// src/ai/flows/tailor-resume-to-job-spec.ts
'use server';

/**
 * @fileOverview Tailors a master resume to a specific job description, highlighting relevant skills and experience.
 *
 * - tailorResumeToJobSpec - A function that handles the resume tailoring process.
 * - TailorResumeToJobSpecInput - The input type for the tailorResumeToJobSpec function.
 * - TailorResumeToJobSpecOutput - The return type for the tailorResumeToJobSpec function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TailorResumeToJobSpecInputSchema = z.object({
  masterResumeDataUri: z
    .string()
    .describe(
      "The user's master resume, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  jobSpecDataUri: z
    .string()
    .describe(
      'The job specification, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' 
    ),
  jobSpecText: z.string().optional().describe('The text of the job specification, if available.'),
});
export type TailorResumeToJobSpecInput = z.infer<typeof TailorResumeToJobSpecInputSchema>;

const TailorResumeToJobSpecOutputSchema = z.object({
  tailoredResume: z.string().describe('The tailored resume.'),
  questions: z.array(z.string()).describe('Clarifying questions for the user to improve the match.'),
});
export type TailorResumeToJobSpecOutput = z.infer<typeof TailorResumeToJobSpecOutputSchema>;

export async function tailorResumeToJobSpec(input: TailorResumeToJobSpecInput): Promise<TailorResumeToJobSpecOutput> {
  return tailorResumeToJobSpecFlow(input);
}

const tailorResumeToJobSpecPrompt = ai.definePrompt({
  name: 'tailorResumeToJobSpecPrompt',
  input: {schema: TailorResumeToJobSpecInputSchema},
  output: {schema: TailorResumeToJobSpecOutputSchema},
  prompt: `You are an expert resume tailor. Your goal is to tailor a master resume to a specific job description.

You will receive the master resume and the job specification.

Based on these, you will:
1.  Create a new resume that highlights the skills and experience from the master resume that are most relevant to the job specification.
2.  Identify any gaps in the user's resume and formulate clarifying questions to ask the user in order to improve the match. Only ask questions if they are value adding.

Master Resume:
{{media url=masterResumeDataUri}}

Job Specification:
{{#if jobSpecText}}{{{jobSpecText}}}{{else}}{{media url=jobSpecDataUri}}{{/if}}`,
});

const tailorResumeToJobSpecFlow = ai.defineFlow(
  {
    name: 'tailorResumeToJobSpecFlow',
    inputSchema: TailorResumeToJobSpecInputSchema,
    outputSchema: TailorResumeToJobSpecOutputSchema,
  },
  async input => {
    const {output} = await tailorResumeToJobSpecPrompt(input);
    return output!;
  }
);
