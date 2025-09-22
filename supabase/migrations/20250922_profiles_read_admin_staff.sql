-- Allow admin/staff to read profiles so provider embed works

alter table if exists public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='profiles' and policyname='profiles_read_admin_staff'
  ) then
    create policy profiles_read_admin_staff
      on public.profiles
      for select
      to authenticated
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role in ('admin','staff')
        )
      );
  end if;
end $$;


