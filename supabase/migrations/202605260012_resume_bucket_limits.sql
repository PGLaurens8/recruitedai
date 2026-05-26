-- Enforce resume upload constraints at the storage layer.
-- With direct-to-storage signed uploads, the file no longer passes through an
-- API route, so the size/type checks in /api/upload/resume are advisory only.
-- Setting these on the bucket makes Supabase reject oversized or wrong-type
-- uploads regardless of what the client claims.

update storage.buckets
set
  file_size_limit = 10485760, -- 10MB, in step with the API + parse-cv ceilings
  allowed_mime_types = array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
where id = 'resumes';
