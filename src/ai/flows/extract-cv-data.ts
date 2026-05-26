'use server';
/**
 * @fileOverview Extracts structured candidate data from a resume file.
 *
 * - extractCVData - A function that handles the CV data extraction process.
 * - ExtractCVDataInput - The input type for the function.
 * - ExtractCVDataOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractCVDataInputSchema = z.object({
  resumeDataUri: z
    .string()
    .describe(
      "The resume file (PDF or Word), provided either as a Base64 data URI ('data:<mimetype>;base64,<encoded_data>') or as an https:// URL to the stored file. Both formats are handled natively."
    ),
});
export type ExtractCVDataInput = z.infer<typeof ExtractCVDataInputSchema>;

const ExtractCVDataOutputSchema = z.object({
  name: z.string().describe("The full name of the candidate."),
  role: z.string().describe("The candidate's primary job title or extracted role."),
  noticePeriod: z.string().describe("The candidate's notice period."),
  salary: z.string().describe("The candidate's desired or current salary as mentioned."),
  pcSpecs: z.string().describe("Specific PC or system specifications if mentioned (e.g., for remote IT roles)."),
  summary: z.string().describe("A concise, 3-sentence summary of the candidate's profile."),
  skills: z.array(z.string()).describe("All technical and professional skills mentioned in the resume."),
  yearsOfExperience: z.number().describe("Total estimated years of professional experience."),
  education: z
    .array(
      z.object({
        degree: z.string().describe("The degree, qualification, or program name."),
        institution: z.string().describe("The school, university, or institution name."),
        year: z.string().optional().describe("The year of completion or attendance, if available."),
      })
    )
    .describe("All education entries found in the resume."),
  certifications: z.array(z.string()).describe("All certifications and courses mentioned."),
  hasDegreeLevelEducation: z.boolean().describe("True if the candidate holds a bachelor degree or higher."),
});
export type ExtractCVDataOutput = z.infer<typeof ExtractCVDataOutputSchema>;

export async function extractCVData(input: ExtractCVDataInput): Promise<ExtractCVDataOutput> {
  return extractCVDataFlow(input);
}

const extractCVDataPrompt = ai.definePrompt({
  name: 'extractCVDataPrompt',
  input: {schema: ExtractCVDataInputSchema},
  output: {schema: ExtractCVDataOutputSchema},
  prompt: `You are an expert recruitment AI. Your task is to analyze the provided resume and extract specific details into a structured format.

Extract the following:
1. Name: Full name.
2. Role: Current job title or primary area of expertise.
3. Notice Period: Any mention of availability or notice period.
4. Salary: Any mention of salary expectations or current salary.
5. PC Specs: Any technical hardware details or equipment mentioned (common in remote work specs).
6. Summary: A professional 3-sentence summary highlighting their top strengths.
7. Skills: All technical and professional skills mentioned.
8. Years of Experience: Total estimated years of professional experience as a number (estimate from the work history if not stated explicitly).
9. Education: All education entries, each with degree, institution, and year (if available).
10. Certifications: All certifications and courses mentioned.
11. Has Degree-Level Education: true if the candidate holds a bachelor degree or higher, otherwise false.

Resume Content:
{{media url=resumeDataUri}}`,
});

const extractCVDataFlow = ai.defineFlow(
  {
    name: 'extractCVDataFlow',
    inputSchema: ExtractCVDataInputSchema,
    outputSchema: ExtractCVDataOutputSchema,
  },
  async (input) => {
    const {output} = await extractCVDataPrompt(input);
    return output!;
  }
);
