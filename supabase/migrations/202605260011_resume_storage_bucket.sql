-- Resume file storage.
-- Replaces Base64 Data URIs in API request bodies with files stored in Supabase Storage.
-- Files live under resumes/{userId}/... so ownership can be derived from the path.

-- Private bucket for resume uploads.
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false)
on conflict (id) do nothing;

-- Authenticated users may upload only into their own user-id prefixed folder.
drop policy if exists "Users upload own resumes" on storage.objects;
create policy "Users upload own resumes" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Users may read files stored under their own user-id prefixed folder.
drop policy if exists "Users read own resumes" on storage.objects;
create policy "Users read own resumes" on storage.objects
for select to authenticated
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Company members may read files owned by any user that belongs to their company.
drop policy if exists "Company members read resumes" on storage.objects;
create policy "Company members read resumes" on storage.objects
for select to authenticated
using (
  bucket_id = 'resumes'
  and exists (
    select 1
    from public.profiles p
    where p.id::text = (storage.foldername(name))[1]
      and p.company_id = public.auth_company_id()
  )
);
