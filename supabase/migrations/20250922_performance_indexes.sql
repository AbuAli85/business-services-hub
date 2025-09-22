-- Performance indexes for services and profiles filtering/search

create index if not exists idx_services_approval_status on public.services(approval_status);
create index if not exists idx_services_featured on public.services(featured);
create index if not exists idx_services_created_at on public.services(created_at);

create extension if not exists pg_trgm;

create index if not exists idx_profiles_full_name_trgm on public.profiles using gin (full_name gin_trgm_ops);
create index if not exists idx_profiles_email_trgm on public.profiles using gin (email gin_trgm_ops);

create index if not exists idx_services_title_trgm on public.services using gin (title gin_trgm_ops);
create index if not exists idx_services_category_trgm on public.services using gin (category gin_trgm_ops);


