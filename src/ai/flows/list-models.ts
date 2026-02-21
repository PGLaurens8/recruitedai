'use server';
/**
 * @fileOverview Utility to list available Google AI models for the current API key.
 */

import { z } from 'zod';

const ModelInfoSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  displayName: z.string(),
  description: z.string(),
  supportedGenerationMethods: z.array(z.string()),
});

export type ModelInfo = z.infer<typeof ModelInfoSchema>;

/**
 * Fetches available models directly from the Google AI API.
 * This helps identify exact model identifiers available for the current API key.
 */
export async function listAvailableModels(): Promise<ModelInfo[]> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GENAI_API_KEY is not set in environment variables.');
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.models || [];
  } catch (error: any) {
    console.error('Error listing models:', error);
    throw error;
  }
}
