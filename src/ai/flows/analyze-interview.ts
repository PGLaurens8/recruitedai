'use server';
/**
 * @fileOverview Analyzes an interview transcript to extract structured Q&A data.
 *
 * - analyzeInterview - A function that handles the transcript analysis.
 * - AnalyzeInterviewInput - The input type for the function.
 * - AnalyzeInterviewOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeInterviewInputSchema = z.object({
  transcript: z.string().describe('The full text transcript of the interview.'),
  questions: z
    .array(z.string())
    .optional()
    .describe('Optional list of recruitment questions to extract from the transcript.'),
});
export type AnalyzeInterviewInput = z.infer<typeof AnalyzeInterviewInputSchema>;

const AnalyzeInterviewPromptInputSchema = z.object({
  transcript: z.string().describe('The full text transcript of the interview.'),
  questionsList: z
    .string()
    .optional()
    .describe('Preformatted numbered question list provided by the user.'),
});

const QuestionAnswerSchema = z.object({
  question: z.string().describe('The recruitment question asked.'),
  answer: z.string().describe("The candidate's response to that specific question."),
});

const AnalyzeInterviewOutputSchema = z.object({
  interviewerName: z.string().optional().describe('The name of the interviewer, if identifiable.'),
  candidateName: z.string().optional().describe('The name of the candidate, if identifiable.'),
  overallAssessment: z.string().describe("A summary of the candidate's performance across the interview."),
  questionsAnswers: z
    .array(QuestionAnswerSchema)
    .describe('A list of responses to the requested recruitment questions.'),
});
export type AnalyzeInterviewOutput = z.infer<typeof AnalyzeInterviewOutputSchema>;

export async function analyzeInterview(input: AnalyzeInterviewInput): Promise<AnalyzeInterviewOutput> {
  return analyzeInterviewFlow(input);
}

const analyzeInterviewPrompt = ai.definePrompt({
  name: 'analyzeInterviewPrompt',
  input: { schema: AnalyzeInterviewPromptInputSchema },
  output: { schema: AnalyzeInterviewOutputSchema },
  prompt: [
    "You are an AI Interview Analyst. Analyze the provided transcript between an 'Interviewer' and a 'Candidate'.",
    '',
    '{{#if questionsList}}',
    'Your goal is to extract answers to the following questions in the same order:',
    '{{{questionsList}}}',
    '{{else}}',
    'Your goal is to extract answers to the following 11 recruitment questions:',
    '1. Brief professional background summary?',
    '2. What are your primary technical/core skills?',
    '3. What is your greatest professional achievement?',
    '4. How do you handle workplace conflict?',
    '5. Why are you leaving your current role?',
    '6. What are your career aspirations for the next 2 years?',
    '7. What is your leadership/teamwork style?',
    '8. How do you stay updated with industry trends?',
    '9. What is your expected notice period?',
    '10. What are your salary expectations?',
    '11. What environment do you work best in?',
    '{{/if}}',
    '',
    'If a question was not explicitly asked, infer the answer from other parts of the conversation if possible, or mark as "Not discussed".',
    '',
    'Transcript:',
    '---',
    '{{{transcript}}}',
    '---',
  ].join('\n'),
});

const analyzeInterviewFlow = ai.defineFlow(
  {
    name: 'analyzeInterviewFlow',
    inputSchema: AnalyzeInterviewInputSchema,
    outputSchema: AnalyzeInterviewOutputSchema,
  },
  async (input) => {
    const questionsList = input.questions?.length
      ? input.questions.map((question, index) => `${index + 1}. ${question}`).join('\n')
      : undefined;

    const { output } = await analyzeInterviewPrompt({
      transcript: input.transcript,
      questionsList,
    });

    return output!;
  }
);
