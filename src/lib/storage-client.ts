'use client';

import { postJson } from '@/lib/api-client';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  getResumeSignedUrl,
  uploadToResumeSignedUrl,
} from '@/lib/storage';

// Structural client type accepted by the storage helpers below.
type StorageCapableClient = Parameters<typeof uploadToResumeSignedUrl>[0];

/**
 * Uploads a resume directly to Supabase Storage from the browser:
 *   1. ask the server for a one-time signed upload ticket (it validates type/
 *      size and derives the owner-scoped path from the authenticated user),
 *   2. PUT the bytes straight to Storage — never through the serverless
 *      function, so Vercel's ~4.5MB request-body limit does not apply,
 *   3. mint a short-lived read URL the AI route can fetch.
 *
 * Returns the storage path and a signed read URL.
 */
export async function uploadResumeDirect(file: File): Promise<{ path: string; url: string }> {
  const { path, token } = await postJson<{ path: string; token: string }>('/api/upload/resume', {
    fileName: file.name,
    contentType: file.type || 'application/octet-stream',
    size: file.size,
  });

  const supabase = createSupabaseBrowserClient() as unknown as StorageCapableClient;

  await uploadToResumeSignedUrl(supabase, path, token, file);
  const url = await getResumeSignedUrl(path, supabase);

  return { path, url };
}
