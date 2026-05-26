
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
      "The user's master resume, provided either as a Base64 data URI ('data:<mimetype>;base64,<encoded_data>') or as an https:// URL to the stored file. Both formats are handled natively."
    ),
  jobSpecDataUri: z
    .string()
    .optional()
    .describe(
      'The job specification file (e.g., PDF, DOCX), as a data URI. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
  jobSpecText: z.string().optional().describe('The text of the job specification, if a file is not provided.'),
  skillsFirstMode: z
    .boolean()
    .optional()
    .describe('When true, weight demonstrated skills and real-world experience more heavily than formal education credentials. Defaults to false when omitted.'),
});
export type AssessJobMatchInput = z.infer<typeof AssessJobMatchInputSchema>;

const AssessJobMatchOutputSchema = z.object({
  matchScore: z.number().min(0).max(100).describe('A percentage (0-100) indicating how well the resume matches the job specification.'),
  summary: z.string().describe("A brief (1-2 sentences) overall assessment of the candidate's fit for the role."),
  strengths: z.array(z.string()).describe('Specific skills, experiences, or qualifications from the resume that are highly relevant to the job specification.'),
  areasForImprovement: z.array(z.string()).describe('Actionable suggestions for how the candidate could improve their resume to better align with this specific job.'),
  matchedSkills: z.array(z.string()).describe('Skills from the CV that match the job spec.'),
  missingSkills: z.array(z.string()).describe('Skills mentioned in the job spec that are not found in the CV.'),
  experienceAlignment: z.string().describe('One sentence on how well their years/level of experience matches the role.'),
  educationNote: z.string().describe('In skills-first mode, note if education is present but explain it was weighted lightly; in normal mode, assess education fit normally.'),
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
{{#if skillsFirstMode}}
IMPORTANT - SKILLS-FIRST MODE IS ENABLED: Weight demonstrated skills and real-world experience much more heavily than formal education credentials. Do not penalize a candidate for lacking specific degrees or certifications if they demonstrate the required skills through hands-on experience. Education should only be a minor factor in the matchScore.
{{/if}}
Provide the following output:
1.  matchScore: A percentage (0-100) indicating how well the resume matches the job specification.
2.  summary: A brief (1-2 sentences) overall assessment of the candidate's fit for the role.
3.  strengths: A list of specific skills, experiences, or qualifications from the resume that are highly relevant to the job specification.
4.  areasForImprovement: A list of actionable suggestions for how the candidate could improve their resume or highlight different aspects to better align with this specific job. Focus on missing keywords, skills to emphasize, or experiences that could be detailed further.
5.  matchedSkills: A list of skills from the CV that match the job spec.
6.  missingSkills: A list of skills mentioned in the job spec that are not found in the CV.
7.  experienceAlignment: One sentence on how well their years/level of experience matches the role.
8.  educationNote: {{#if skillsFirstMode}}Note whether education is present, but explain that it was weighted lightly because skills-first mode is enabled.{{else}}Assess how well the candidate's education fits the role.{{/if}}

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
