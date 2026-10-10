-- R2 metadata only; preserves all existing videos and access policies.
begin;
alter table public.media_assets add column if not exists uploaded_by uuid references auth.users(id) on delete set null;
alter table public.media_assets add column if not exists original_filename text;
notify pgrst, 'reload schema';
commit;
