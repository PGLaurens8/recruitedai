
'use server';
/**
 * @fileOverview Generates interview questions based on a job specification.
 *
 * - generateInterviewQuestions - A function that handles the question generation.
 * - GenerateInterviewQuestionsInput - The input type for the function.
 * - GenerateInterviewQuestionsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const GenerateInterviewQuestionsInputSchema = z.object({
  jobSpecText: z.string().describe('The full text of the job specification.'),
});
export type GenerateInterviewQuestionsInput = z.infer<typeof GenerateInterviewQuestionsInputSchema>;

export const GenerateInterviewQuestionsOutputSchema = z.object({
  questions: z.array(z.string()).describe('A list of 5 diverse and relevant interview questions based on the job spec. Include behavioral, technical, and situational questions if applicable.'),
});
export type GenerateInterviewQuestionsOutput = z.infer<typeof GenerateInterviewQuestionsOutputSchema>;

export async function generateInterviewQuestions(input: GenerateInterviewQuestionsInput): Promise<GenerateInterviewQuestionsOutput> {
  return generateInterviewQuestionsFlow(input);
}

const generateInterviewQuestionsPrompt = ai.definePrompt({
  name: 'generateInterviewQuestionsPrompt',
  input: {schema: GenerateInterviewQuestionsInputSchema},
  output: {schema: GenerateInterviewQuestionsOutputSchema},
  prompt: `You are an expert hiring manager creating an interview plan. Based on the job specification provided below, generate a list of exactly 5 relevant and insightful interview questions. The questions should cover a range of topics, including technical skills, behavioral competencies, and problem-solving abilities mentioned in the spec.

Job Specification:
---
{{{jobSpecText}}}
---`,
});

const generateInterviewQuestionsFlow = ai.defineFlow(
  {
    name: 'generateInterviewQuestionsFlow',
    inputSchema: GenerateInterviewQuestionsInputSchema,
    outputSchema: GenerateInterviewQuestionsOutputSchema,
  },
  async (input) => {
    const {output} = await generateInterviewQuestionsPrompt(input);
    // Ensure we always return exactly 5 questions, truncating or padding if necessary.
    const questions = output?.questions || [];
    if (questions.length > 5) {
        questions.length = 5;
    }
    while (questions.length < 5) {
        questions.push("Tell me about a time you had to learn a new technology quickly.");
    }
    return { questions };
  }
);
