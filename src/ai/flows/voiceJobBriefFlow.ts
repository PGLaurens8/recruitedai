'use server';
/**
 * @fileOverview Parses a spoken job brief transcript into structured job fields.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const VoiceJobBriefInputSchema = z.object({
  transcript: z
    .string()
    .min(1)
    .describe('Text transcript captured from the recruiter speaking a job brief.'),
});
export type VoiceJobBriefInput = z.infer<typeof VoiceJobBriefInputSchema>;

const VoiceJobBriefOutputSchema = z.object({
  title: z.string().optional().describe('The job title parsed from the brief.'),
  location: z.string().optional().describe('Location mentioned in the brief.'),
  salary_min: z.string().optional().describe('Minimum salary value inferred.'),
  salary_max: z.string().optional().describe('Maximum salary value inferred.'),
  description: z.string().optional().describe('Brief summary of the role responsibilities or differentiators.'),
  company: z.string().optional().describe('Company name if mentioned.'),
});
export type VoiceJobBriefOutput = z.infer<typeof VoiceJobBriefOutputSchema>;

const voiceJobBriefPrompt = ai.definePrompt({
  name: 'voiceJobBriefPrompt',
  input: { schema: VoiceJobBriefInputSchema },
  output: { schema: VoiceJobBriefOutputSchema },
  prompt: `You are a recruitment assistant. The user will speak a job brief.
Extract the details and respond ONLY with a JSON object matching this schema:
{ title, location, salary_min, salary_max, description, company }.
Do not include any other text. If a value is missing, return an empty string for that field.
Transcript: {{transcript}}`,
});

const voiceJobBriefFlow = ai.defineFlow(
  {
    name: 'voiceJobBriefFlow',
    inputSchema: VoiceJobBriefInputSchema,
    outputSchema: VoiceJobBriefOutputSchema,
  },
  async (input: VoiceJobBriefInput) => {
    const { output } = await voiceJobBriefPrompt(input);
    return output!;
  }
);

export async function parseVoiceJobBrief(input: VoiceJobBriefInput): Promise<VoiceJobBriefOutput> {
  return voiceJobBriefFlow(input);
}
