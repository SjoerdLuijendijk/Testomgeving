-- Team members may delete stoves. Photos rows follow through "on delete cascade" (the app removes
-- the storage objects first). Stoves with invoices cannot be deleted: invoices are permanent and
-- their foreign key has no cascade, so the delete fails with a foreign key violation.
grant delete on public.stoves to authenticated;

create policy "stoves delete" on public.stoves for delete to authenticated
  using ((select public.is_team_member()));
