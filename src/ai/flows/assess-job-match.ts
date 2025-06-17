
'use server';
/**
 * @fileOverview Assesses how well a master resume matches a specific job description.
 *
 * - assessJobMatch - A function that handles the job match assessment process.
 * - AssessJobMatchInput - The input type for the assessJobMatch function.
 * - AssessJobMatchOutput - The return type for the assessJobMatch function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AssessJobMatchInputSchema = z.object({
  masterResumeDataUri: z
    .string()
    .describe(
      "The user's master resume, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  jobSpecDataUri: z
    .string()
    .optional()
    .describe(
      'The job specification file (e.g., PDF, DOCX), as a data URI. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
  jobSpecText: z.string().optional().describe('The text of the job specification, if a file is not provided.'),
});
export type AssessJobMatchInput = z.infer<typeof AssessJobMatchInputSchema>;

const AssessJobMatchOutputSchema = z.object({
  matchScore: z.number().min(0).max(100).describe('A percentage (0-100) indicating how well the resume matches the job specification.'),
  summary: z.string().describe("A brief (1-2 sentences) overall assessment of the candidate's fit for the role."),
  strengths: z.array(z.string()).describe('Specific skills, experiences, or qualifications from the resume that are highly relevant to the job specification.'),
  areasForImprovement: z.array(z.string()).describe('Actionable suggestions for how the candidate could improve their resume to better align with this specific job.'),
});
export type AssessJobMatchOutput = z.infer<typeof AssessJobMatchOutputSchema>;

export async function assessJobMatch(input: AssessJobMatchInput): Promise<AssessJobMatchOutput> {
  return assessJobMatchFlow(input);
}

const assessJobMatchPrompt = ai.definePrompt({
  name: 'assessJobMatchPrompt',
  input: {schema: AssessJobMatchInputSchema},
  output: {schema: AssessJobMatchOutputSchema},
  prompt: `You are an expert career advisor. Analyze the provided Master Resume against the Job Specification.
Provide the following output:
1.  matchScore: A percentage (0-100) indicating how well the resume matches the job specification.
2.  summary: A brief (1-2 sentences) overall assessment of the candidate's fit for the role.
3.  strengths: A list of specific skills, experiences, or qualifications from the resume that are highly relevant to the job specification.
4.  areasForImprovement: A list of actionable suggestions for how the candidate could improve their resume or highlight different aspects to better align with this specific job. Focus on missing keywords, skills to emphasize, or experiences that could be detailed further.

Master Resume:
{{media url=masterResumeDataUri}}

Job Specification:
{{#if jobSpecText}}{{{jobSpecText}}}{{else}}{{media url=jobSpecDataUri}}{{/if}}`,
});

const assessJobMatchFlow = ai.defineFlow(
  {
    name: 'assessJobMatchFlow',
    inputSchema: AssessJobMatchInputSchema,
    outputSchema: AssessJobMatchOutputSchema,
  },
  async (input: AssessJobMatchInput) => {
    if (!input.jobSpecDataUri && !input.jobSpecText) {
      throw new Error('Either jobSpecDataUri or jobSpecText must be provided.');
    }
    const {output} = await assessJobMatchPrompt(input);
    return output!;
  }
);
