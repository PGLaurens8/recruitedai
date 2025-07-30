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
import {getWebsiteContent} from '@/ai/tools/web-browser';

const FindSmartLeadsInputSchema = z.object({
  industry: z.string().optional().describe("The industry to target (e.g., 'Fintech', 'Healthcare Tech')."),
  companySize: z.string().optional().describe("The approximate size of the company (e.g., '1-50 employees', '51-200 employees')."),
  location: z.string().optional().describe("The city or region where the company is located (e.g., 'Johannesburg', 'Cape Town')."),
  targetRole: z.string().optional().describe("The job title or role of the person to find (e.g., 'VP of Engineering', 'Head of Talent Acquisition')."),
  companyName: z.string().optional().describe("The name of the company to target."),
  companyWebsite: z.string().optional().describe("A URL to the company's website (e.g., 'https://www.example.com'). The AI will use this as a primary source if provided.")
});
export type FindSmartLeadsInput = z.infer<typeof FindSmartLeadsInputSchema>;

const LeadSchema = z.object({
    fullName: z.string().describe("The full name of the contact person. Should be a name commonly found in South Africa if the location suggests it."),
    title: z.string().describe("The job title of the contact person."),
    email: z.string().describe("A generated, realistic-looking email address for the contact. Use common corporate email patterns (e.g., 'j.doe@company.co.za')."),
    companyName: z.string().describe("The name of the company where the contact works."),
    industry: z.string().describe("The industry of the company."),
    companySize: z.string().describe("The size of the company in employee count (e.g., '51-200 employees')."),
});
export type Lead = z.infer<typeof LeadSchema>;

const CompanyInsightSchema = z.object({
    companyName: z.string().describe("The name of the company the insight pertains to."),
    insight: z.string().describe("A brief, actionable insight about the company's recent activities (e.g., recent funding, new product launch, hiring surge) that would be relevant for a recruiter or salesperson. Should be 1-2 sentences."),
});

const FindSmartLeadsOutputSchema = z.object({
  leads: z.array(LeadSchema).describe('A list of 5 to 10 potential leads matching the search criteria.'),
  insights: z.array(CompanyInsightSchema).optional().describe("A list of recent, significant company updates or news for any of the companies in the lead list. Only include insights if there is notable activity in the last 6 months."),
});
export type FindSmartLeadsOutput = z.infer<typeof FindSmartLeadsOutputSchema>;

export async function findSmartLeads(input: FindSmartLeadsInput): Promise<FindSmartLeadsOutput> {
  return findSmartLeadsFlow(input);
}

const findSmartLeadsPrompt = ai.definePrompt({
  name: 'findSmartLeadsPrompt',
  input: {schema: FindSmartLeadsInputSchema},
  output: {schema: FindSmartLeadsOutputSchema},
  tools: [getWebsiteContent],
  prompt: `You are an expert AI Sourcing Specialist with deep knowledge of the South African business landscape. You have access to a vast, simulated B2B database and a web browser tool.
Your task is to generate a list of 5-10 highly relevant potential leads (decision-makers, hiring managers, etc.) based on the user's search criteria.

- If a 'companyWebsite' URL is provided, YOU MUST use the 'getWebsiteContent' tool to fetch the content of that website. This website content is the PRIMARY SOURCE OF TRUTH. Your generated leads must be based on the names and roles you find on that website.
- If no website is provided, you will act as if you have searched major job boards (like LinkedIn, Indeed, etc.) and professional networks to generate a list of plausible leads.
- Prioritize South African companies and personnel if the search criteria (e.g., location like 'Johannesburg', 'Cape Town', or a '.co.za' company) suggest it.

The user is looking for contacts that match the following profile:
- Industry: {{#if industry}}'{{{industry}}}'{{else}}Any{{/if}}
- Company Name: {{#if companyName}}'{{{companyName}}}'{{else}}Any{{/if}}
- Company Website: {{#if companyWebsite}}'{{{companyWebsite}}}'{{else}}Not provided{{/if}}
- Company Size: {{#if companySize}}'{{{companySize}}}'{{else}}Any{{/if}}
- Location: {{#if location}}'{{{location}}}'{{else}}Any (with a focus on South Africa){{/if}}
- Target Role/Title: {{#if targetRole}}'{{{targetRole}}}'{{else}}Any key decision-maker{{/if}}

For each lead you generate, you must provide:
1.  'fullName': A realistic-sounding full name, appropriate for the South African context. If using a website, this must be a name from the website.
2.  'title': Their job title. If using a website, this must be their title from the website.
3.  'email': A plausible corporate email address. Use '.co.za' domains where appropriate for South African companies.
4.  'companyName': The name of the company. It should be a real company that fits the industry and location.
5.  'industry': The company's industry.
6.  'companySize': The company's size range.

Additionally, for any company in the list that has had significant public news or updates in the last 6 months (e.g., new funding round, major product launch, leadership changes, hiring surge), provide a concise 'insight' summary. This should be a separate list.

The results should be plausible and actionable for a recruiter targeting the South African market.
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
    if (!input.industry && !input.companySize && !input.location && !input.targetRole && !input.companyName && !input.companyWebsite) {
        throw new Error('At least one search criterion must be provided to find smart leads.');
    }
    const {output} = await findSmartLeadsPrompt(input);
    return output!;
  }
);
