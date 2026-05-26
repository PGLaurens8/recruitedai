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
      upload(
        path: string,
        body: File,
        options?: { contentType?: string; upsert?: boolean }
      ): Promise<{ data: { path: string } | null; error: { message: string } | null }>;
      createSignedUrl(
        path: string,
        expiresIn: number
      ): Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
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
 * Uploads a resume to resumes/{userId}/{timestamp}-{filename} and returns a
 * signed URL valid for one hour. Pass an authenticated server client when
 * calling from a server route; defaults to the browser client otherwise.
 */
export async function uploadResumeFile(
  file: File,
  userId: string,
  client: StorageCapableClient = createSupabaseBrowserClient() as unknown as StorageCapableClient
): Promise<string> {
  return (await uploadResume(file, userId, client)).url;
}

/**
 * Same as uploadResumeFile but also returns the storage path, which the upload
 * API route needs so it can hand both back to the client.
 */
export async function uploadResume(
  file: File,
  userId: string,
  client: StorageCapableClient = createSupabaseBrowserClient() as unknown as StorageCapableClient
): Promise<{ path: string; url: string }> {
  if (!file) {
    throw new Error('No file was provided to upload.');
  }

  const path = buildResumeStoragePath(userId, file.name);

  const { error } = await client.storage.from(RESUME_BUCKET).upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload resume "${file.name}": ${error.message}`);
  }

  const url = await createSignedUrl(client, path);
  return { path, url };
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
