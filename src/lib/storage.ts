import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export const RESUME_BUCKET = 'resumes';
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

// Structural type covering the storage surface we use. Both the browser
// (client.ts) and server (server.ts) Supabase clients satisfy this, so an
// authenticated server route can pass its own client while client-side callers
// fall back to the browser client.
type StorageCapableClient = {
  storage: {
    from(bucket: string): {
      createSignedUrl(
        path: string,
        expiresIn: number
      ): Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
      createSignedUploadUrl(
        path: string
      ): Promise<{
        data: { signedUrl: string; token: string; path: string } | null;
        error: { message: string } | null;
      }>;
      uploadToSignedUrl(
        path: string,
        token: string,
        body: File,
        options?: { contentType?: string }
      ): Promise<{ data: { path: string } | null; error: { message: string } | null }>;
    };
  };
};

function sanitizeFileName(fileName: string): string {
  const cleaned = fileName.trim().replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned.length > 0 ? cleaned : 'resume';
}

export function buildResumeStoragePath(userId: string, fileName: string): string {
  if (!userId) {
    throw new Error('A user ID is required to build a resume storage path.');
  }
  return `${userId}/${Date.now()}-${sanitizeFileName(fileName)}`;
}

async function createSignedUrl(client: StorageCapableClient, path: string): Promise<string> {
  const { data, error } = await client.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(
      `Failed to create a signed URL for "${path}": ${error?.message ?? 'no URL returned'}`
    );
  }

  return data.signedUrl;
}

/**
 * Mints a one-time signed upload URL so the browser can PUT the file directly
 * to Supabase Storage, bypassing the serverless function body limit entirely.
 * The returned token authorizes a single upload to `path`.
 */
export async function createResumeUploadTicket(
  client: StorageCapableClient,
  path: string
): Promise<{ path: string; token: string }> {
  const { data, error } = await client.storage.from(RESUME_BUCKET).createSignedUploadUrl(path);

  if (error || !data?.token) {
    throw new Error(
      `Failed to create a signed upload URL for "${path}": ${error?.message ?? 'no token returned'}`
    );
  }

  return { path: data.path ?? path, token: data.token };
}

/** Uploads a file to a previously-minted signed upload URL (browser-side). */
export async function uploadToResumeSignedUrl(
  client: StorageCapableClient,
  path: string,
  token: string,
  file: File
): Promise<void> {
  const { error } = await client.storage
    .from(RESUME_BUCKET)
    .uploadToSignedUrl(path, token, file, { contentType: file.type || 'application/octet-stream' });

  if (error) {
    throw new Error(`Failed to upload "${file.name}" to storage: ${error.message}`);
  }
}

/** Generates a fresh signed URL for an already-stored resume file. */
export async function getResumeSignedUrl(
  path: string,
  client: StorageCapableClient = createSupabaseBrowserClient() as unknown as StorageCapableClient
): Promise<string> {
  if (!path) {
    throw new Error('A storage path is required to generate a signed URL.');
  }

  return createSignedUrl(client, path);
}
