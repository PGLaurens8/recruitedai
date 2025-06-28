
'use server';
/**
 * @fileOverview Analyzes a single interview response against a given question.
 *
 * - analyzeInterviewResponse - A function that handles the analysis.
 * - AnalyzeInterviewResponseInput - The input type for the function.
 * - AnalyzeInterviewResponseOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const AnalyzeInterviewResponseInputSchema = z.object({
  question: z.string().describe('The interview question that was asked.'),
  answer: z.string().describe("The candidate's transcribed answer to the question."),
});
export type AnalyzeInterviewResponseInput = z.infer<typeof AnalyzeInterviewResponseInputSchema>;

export const AnalyzeInterviewResponseOutputSchema = z.object({
  feedback: z.string().describe("Concise, constructive feedback (2-3 sentences) on the answer's quality, relevance, and clarity. Frame it as an interview coach would."),
  score: z.number().min(1).max(10).describe('A score from 1 to 10 for the answer, where 1 is poor and 10 is excellent.'),
});
export type AnalyzeInterviewResponseOutput = z.infer<typeof AnalyzeInterviewResponseOutputSchema>;

export async function analyzeInterviewResponse(input: AnalyzeInterviewResponseInput): Promise<AnalyzeInterviewResponseOutput> {
  return analyzeInterviewResponseFlow(input);
}

const analyzeInterviewResponsePrompt = ai.definePrompt({
  name: 'analyzeInterviewResponsePrompt',
  input: {schema: AnalyzeInterviewResponseInputSchema},
  output: {schema: AnalyzeInterviewResponseOutputSchema},
  prompt: `You are an expert interview coach providing feedback on a mock interview answer.

The interview question was:
"{{{question}}}"

The candidate's answer was:
"{{{answer}}}"

Your task is to:
1.  Provide 'feedback': Write 2-3 sentences of concise, constructive feedback. Focus on the answer's structure, clarity, and relevance to the question. Start with a positive reinforcement if possible, then offer a specific suggestion for improvement.
2.  Provide a 'score': Rate the answer on a scale of 1 to 10 based on its overall effectiveness.

Do not be overly harsh or complimentary. Aim for balanced, helpful, and actionable advice.`,
});

const analyzeInterviewResponseFlow = ai.defineFlow(
  {
    name: 'analyzeInterviewResponseFlow',
    inputSchema: AnalyzeInterviewResponseInputSchema,
    outputSchema: AnalyzeInterviewResponseOutputSchema,
  },
  async (input) => {
    const {output} = await analyzeInterviewResponsePrompt(input);
    return output!;
  }
);
