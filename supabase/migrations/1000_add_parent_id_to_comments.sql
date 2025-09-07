-- Add parent_id to milestone_comments for threaded replies
alter table public.milestone_comments
  add column if not exists parent_id uuid references public.milestone_comments(id) on delete cascade;

create index if not exists idx_milestone_comments_parent_id
  on public.milestone_comments (parent_id);


