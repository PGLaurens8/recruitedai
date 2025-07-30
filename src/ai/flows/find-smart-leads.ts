
'use server';
/**
 * @fileOverview Finds potential leads (decision-makers) at companies based on various criteria.
 *
 * - findSmartLeads - A function that handles the lead generation process.
 * - FindSmartLeadsInput - The input type for the function.
 * - FindSmartLeadsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FindSmartLeadsInputSchema = z.object({
  industry: z.string().optional().describe("The industry to target (e.g., 'Fintech', 'Healthcare Tech')."),
  companySize: z.string().optional().describe("The approximate size of the company (e.g., '1-50 employees', '51-200 employees')."),
  location: z.string().optional().describe("The city or region where the company is located (e.g., 'San Francisco Bay Area')."),
  targetRole: z.string().optional().describe("The job title or role of the person to find (e.g., 'VP of Engineering', 'Head of Talent Acquisition')."),
  companyName: z.string().optional().describe("The name of the company to target.")
});
export type FindSmartLeadsInput = z.infer<typeof FindSmartLeadsInputSchema>;

const LeadSchema = z.object({
    fullName: z.string().describe("The full name of the contact person."),
    title: z.string().describe("The job title of the contact person."),
    email: z.string().describe("A generated, realistic-looking email address for the contact. Use common corporate email patterns (e.g., 'j.doe@company.com')."),
    linkedinUrl: z.string().url().describe("A generated, realistic-looking LinkedIn profile URL for the contact."),
    companyName: z.string().describe("The name of the company where the contact works."),
    industry: z.string().describe("The industry of the company."),
    companySize: z.string().describe("The size of the company in employee count (e.g., '51-200 employees')."),
});
export type Lead = z.infer<typeof LeadSchema>;

const FindSmartLeadsOutputSchema = z.object({
  leads: z.array(LeadSchema).describe('A list of 5 to 10 potential leads matching the search criteria.'),
});
export type FindSmartLeadsOutput = z.infer<typeof FindSmartLeadsOutputSchema>;

export async function findSmartLeads(input: FindSmartLeadsInput): Promise<FindSmartLeadsOutput> {
  return findSmartLeadsFlow(input);
}

const findSmartLeadsPrompt = ai.definePrompt({
  name: 'findSmartLeadsPrompt',
  input: {schema: FindSmartLeadsInputSchema},
  output: {schema: FindSmartLeadsOutputSchema},
  prompt: `You are an expert AI Sourcing Specialist with access to a vast, simulated B2B database like Apollo.io, Seamless.AI, and LinkedIn Sales Navigator.
Your task is to generate a list of 5-10 highly relevant potential leads (decision-makers, hiring managers, etc.) based on the user's search criteria.

The user is looking for contacts that match the following profile:
- Industry: {{#if industry}}'{{{industry}}}'{{else}}Any{{/if}}
- Company Name: {{#if companyName}}'{{{companyName}}}'{{else}}Any{{/if}}
- Company Size: {{#if companySize}}'{{{companySize}}}'{{else}}Any{{/if}}
- Location: {{#if location}}'{{{location}}}'{{else}}Any{{/if}}
- Target Role/Title: {{#if targetRole}}'{{{targetRole}}}'{{else}}Any key decision-maker{{/if}}

For each lead you generate, you must provide:
1.  'fullName': A realistic-sounding full name.
2.  'title': Their job title.
3.  'email': A plausible corporate email address.
4.  'linkedinUrl': A valid-looking LinkedIn profile URL. For example: https://www.linkedin.com/in/jane-doe-12345
5.  'companyName': The name of the company. It should be a real or at least a realistic-sounding company name that fits the industry.
6.  'industry': The company's industry.
7.  'companySize': The company's size range.

Do not invent fictional data points beyond what is required. The results should be plausible and actionable for a recruiter.
Generate a diverse list of leads from different companies if possible, unless a specific company name is provided.
`,
});

const findSmartLeadsFlow = ai.defineFlow(
  {
    name: 'findSmartLeadsFlow',
    inputSchema: FindSmartLeadsInputSchema,
    outputSchema: FindSmartLeadsOutputSchema,
  },
  async (input) => {
    if (!input.industry && !input.companySize && !input.location && !input.targetRole && !input.companyName) {
        throw new Error('At least one search criterion must be provided to find smart leads.');
    }
    const {output} = await findSmartLeadsPrompt(input);
    return output!;
  }
);
