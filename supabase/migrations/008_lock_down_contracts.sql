-- IMPORTANT: run each of these four statements as its own separate query.
-- Bundling storage.buckets/storage.objects changes with table changes in
-- one batch caused a silent rollback in testing -- each piece below was
-- confirmed working only once run in isolation.

-- ---- Query 1 ----
alter table contracts add column if not exists pdf_path text;

-- ---- Query 2 ----
update storage.buckets set public = false where id = 'contracts';

-- ---- Query 3 ----
drop policy if exists "anyone can read contracts files" on storage.objects;

-- ---- Query 4 ----
create policy "download own contracts or as sitter"
  on storage.objects for select
  using (
    bucket_id = 'contracts' and (
      is_sitter() or
      exists (
        select 1 from contracts c
        join bookings b on b.id = c.booking_id
        where c.pdf_path = storage.objects.name and b.client_id = auth.uid()
      )
    )
  );
