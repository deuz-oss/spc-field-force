-- Phase: sync visit photos/docs to Supabase Storage (public bucket).
-- Run this once in the Supabase SQL editor, same as 0001_init.sql.

insert into storage.buckets (id, name, public)
values ('visit-media', 'visit-media', true)
on conflict (id) do nothing;

-- storage.objects already has RLS enabled by default on Supabase-managed
-- projects (and is owned by a system role, so ALTER TABLE ... ENABLE ROW
-- LEVEL SECURITY on it fails with "must be owner of table objects" if you
-- try to run it yourself) — only the policies below are ours to add.

-- Path convention: {visit_id}/{random}.{ext} — first path segment is used to
-- join back to visits for RLS, mirroring visits_select/visits_write_own from
-- 0001_init.sql. The bucket is public, so normal reads go through Storage's
-- public URL endpoint (bypassing this SELECT policy) — it's defense-in-depth
-- for direct table/API access, e.g. if the bucket is ever flipped private.

create policy visit_media_insert on storage.objects for insert
with check (
  bucket_id = 'visit-media'
  and exists (
    select 1 from public.visits v
    where v.id = (storage.foldername(name))[1] and v.agent_id = auth.uid()
  )
);

create policy visit_media_select on storage.objects for select
using (
  bucket_id = 'visit-media'
  and exists (
    select 1 from public.visits v
    where v.id = (storage.foldername(name))[1]
    and (
      public.current_role() in ('super_admin','admin','client')
      or (public.current_role() = 'team_lead'
          and v.agent_id in (select id from public.profiles where team_id = public.current_team_id()))
      or v.agent_id = auth.uid()
    )
  )
);

create policy visit_media_delete on storage.objects for delete
using (
  bucket_id = 'visit-media'
  and exists (
    select 1 from public.visits v
    where v.id = (storage.foldername(name))[1] and v.agent_id = auth.uid()
  )
);
