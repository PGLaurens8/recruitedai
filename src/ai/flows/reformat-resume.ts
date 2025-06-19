
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

const ContactInfoSchema = z.object({
  email: z.string().optional().describe("The email address from the resume."),
  phone: z.string().optional().describe("The phone number from the resume."),
  linkedin: z.string().optional().describe("The LinkedIn profile URL from the resume."),
  location: z.string().optional().describe("The location or address from the resume (e.g., City, State)."),
});

const ReformatResumeOutputSchema = z.object({
  reformattedResume: z
    .string()
    .describe('The main body of the resume (summary, experience, education, etc.) in a modern, professional, human-readable text format. This should NOT be a JSON string and MUST EXCLUDE contact information and skills lists that are extracted into separate fields.'),
  fullName: z.string().optional().describe("The full name of the resume holder, extracted from the resume content."),
  currentJobTitle: z.string().optional().describe("The current or most recent job title of the resume holder, extracted from the resume content."),
  contactInfo: ContactInfoSchema.optional().describe("Structured contact information extracted from the resume."),
  skills: z.array(z.string()).optional().describe("A list of key skills extracted from the resume."),
  missingInformation: z
    .array(z.string())
    .describe('An array of strings indicating missing information in the resume (excluding contact/skills already covered).'),
  questions: z
    .array(z.string())
    .describe('An array of questions to prompt the user to complete the resume (excluding contact/skills already covered).'),
});
export type ReformatResumeOutput = z.infer<typeof ReformatResumeOutputSchema>;

export async function reformatResume(input: ReformatResumeInput): Promise<ReformatResumeOutput> {
  return reformatResumeFlow(input);
}

const reformatResumePrompt = ai.definePrompt({
  name: 'reformatResumePrompt',
  input: {schema: ReformatResumeInputSchema},
  output: {schema: ReformatResumeOutputSchema},
  prompt: `You are an AI resume expert. You will reformat the provided resume into a modern, professional template and extract specific information.

Output Instructions:
1.  'reformattedResume': This field MUST be a human-readable text version of the main resume body (e.g., summary, work experience, education, projects). It should be well-formatted with appropriate sections, line breaks, and spacing, suitable for direct display.
    IMPORTANT: The 'reformattedResume' field MUST NOT include the contact details (email, phone, LinkedIn, location) or the list of skills IF you are able to extract them into the 'contactInfo' and 'skills' fields below. These will be displayed separately. If you cannot extract them, they can remain in 'reformattedResume'.
    DO NOT output a JSON string or any code-like structure for the 'reformattedResume' field itself.

2.  'fullName': Extract the full name of the resume holder. If not found, leave blank.
3.  'currentJobTitle': Extract the current or most recent job title. If not found, leave blank.
4.  'contactInfo': Extract the following from the resume:
    *   'email': The primary email address.
    *   'phone': The primary phone number.
    *   'linkedin': The full LinkedIn profile URL (if present).
    *   'location': The city and state, or general address (e.g., "San Francisco, CA").
5.  'skills': Extract a list of key skills.
6.  'missingInformation': Identify any critical information missing from the main resume body (e.g., unclear job responsibilities, missing dates for experience). Do not list missing contact info or skills if they are meant to be extracted.
7.  'questions': Formulate questions to prompt the user to improve the main resume body or fill in the missing information identified.

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
