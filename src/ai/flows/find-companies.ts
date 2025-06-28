
'use server';
/**
 * @fileOverview Finds companies that are likely hiring for roles matching a candidate's profile.
 *
 * - findCompanies - A function that handles the company finding process.
 * - FindCompaniesInput - The input type for the findCompanies function.
 * - FindCompaniesOutput - The return type for the findCompanies function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FindCompaniesInputSchema = z.object({
  resumeDataUri: z
    .string()
    .optional()
    .describe(
      "The candidate's resume file (e.g., PDF, DOCX), as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  keySkills: z
    .string()
    .optional()
    .describe(
      'A comma-separated list of key skills for the candidate, to be used if a resume is not provided or to supplement it.'
    ),
});
export type FindCompaniesInput = z.infer<typeof FindCompaniesInputSchema>;

const CompanySchema = z.object({
    companyName: z.string().describe("The name of the company."),
    reasonForMatch: z.string().describe("A brief (1-2 sentences) explanation of why this company is a good match for the candidate's profile."),
    website: z.string().url().describe("The company's career page or main website URL."),
    sampleJobTitle: z.string().describe("An example of a relevant job title the company might be hiring for."),
});

const FindCompaniesOutputSchema = z.object({
  companies: z.array(CompanySchema).describe('A list of 5 to 10 companies that are a good potential match for the candidate.'),
});
export type FindCompaniesOutput = z.infer<typeof FindCompaniesOutputSchema>;

export async function findCompanies(input: FindCompaniesInput): Promise<FindCompaniesOutput> {
  return findCompaniesFlow(input);
}

const findCompaniesPrompt = ai.definePrompt({
  name: 'findCompaniesPrompt',
  input: {schema: FindCompaniesInputSchema},
  output: {schema: FindCompaniesOutputSchema},
  prompt: `You are an AI recruitment expert and sourcing specialist. Your task is to identify potential employers for a candidate based on their resume and/or key skills.

You will receive either a resume, a list of key skills, or both.
Analyze the provided information to understand the candidate's experience level, domain, and core competencies.

Then, act as if you have searched major job boards (like LinkedIn, Indeed, etc.) and professional networks. Generate a list of 5-7 companies that are actively hiring for roles that would be a strong fit for this candidate.

For each company, provide:
1.  'companyName': The name of the company.
2.  'reasonForMatch': A concise, 1-2 sentence explanation of why this company is a good match. For example, "They are a fast-growing fintech company and frequently hire for Senior Backend Engineers, which aligns with the candidate's experience at a major bank."
3.  'website': The company's primary website or careers page URL.
4.  'sampleJobTitle': A realistic example of a job title the candidate could apply for at that company.

Do not invent fictional companies. Use your training data to identify real companies that operate in the relevant sectors.

Candidate Resume:
{{#if resumeDataUri}}{{media url=resumeDataUri}}{{else}}No resume provided.{{/if}}

Key Skills:
{{#if keySkills}}{{{keySkills}}}{{else}}No additional key skills provided.{{/if}}`,
});

const findCompaniesFlow = ai.defineFlow(
  {
    name: 'findCompaniesFlow',
    inputSchema: FindCompaniesInputSchema,
    outputSchema: FindCompaniesOutputSchema,
  },
  async (input: FindCompaniesInput) => {
    if (!input.resumeDataUri && !input.keySkills) {
      throw new Error('Either a resume or key skills must be provided.');
    }
    const {output} = await findCompaniesPrompt(input);
    return output!;
  }
);
