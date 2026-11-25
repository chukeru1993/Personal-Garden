-- A card is a single reusable resource that can be organized into many projects.
-- Stop rather than silently discarding any legacy cross-owner project links.
do $$
declare
  invalid_links bigint;
  invalid_tag_links bigint;
begin
  select count(*)
    into invalid_links
    from public.knowledge_cards kc
    join public.projects p on p.id = kc.project_id
   where kc.project_id is not null
     and kc.owner_id <> p.owner_id;

  if invalid_links > 0 then
    raise exception 'Cannot migrate % card-project links because the card and project owners differ', invalid_links;
  end if;

  select count(*)
    into invalid_tag_links
    from public.knowledge_card_tags kct
    join public.knowledge_cards kc on kc.id = kct.card_id
    join public.tags t on t.id = kct.tag_id
   where kc.owner_id <> t.owner_id;

  if invalid_tag_links > 0 then
    raise exception 'Cannot migrate while % card-tag links cross owner boundaries', invalid_tag_links;
  end if;
end;
$$;

-- Composite unique keys let foreign keys enforce that both sides of an edge
-- belong to the same owner, not merely that each referenced id exists.
alter table public.knowledge_cards
  add constraint knowledge_cards_id_owner_unique unique (id, owner_id);

alter table public.projects
  add constraint projects_id_owner_unique unique (id, owner_id);

create table public.knowledge_card_projects (
  owner_id   uuid not null references auth.users(id) on delete cascade,
  card_id    uuid not null,
  project_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (card_id, project_id),
  constraint knowledge_card_projects_card_owner_fk
    foreign key (card_id, owner_id)
    references public.knowledge_cards(id, owner_id) on delete cascade,
  constraint knowledge_card_projects_project_owner_fk
    foreign key (project_id, owner_id)
    references public.projects(id, owner_id) on delete cascade
);

-- Preserve every valid legacy assignment before removing the single-project column.
insert into public.knowledge_card_projects (owner_id, card_id, project_id)
select kc.owner_id, kc.id, kc.project_id
  from public.knowledge_cards kc
 where kc.project_id is not null
on conflict (card_id, project_id) do nothing;

create index knowledge_card_projects_owner_project_idx
  on public.knowledge_card_projects (owner_id, project_id, card_id);

drop index if exists public.knowledge_cards_owner_project_idx;
alter table public.knowledge_cards drop column project_id;

grant select, insert, update, delete on public.knowledge_card_projects to authenticated;
revoke all on public.knowledge_card_projects from anon;

alter table public.knowledge_card_projects enable row level security;

-- Keep card-tag links inside the same owner's data boundary as well.
drop policy if exists owner_full_access_card_tags on public.knowledge_card_tags;
create policy owner_full_access_card_tags
  on public.knowledge_card_tags
  for all to authenticated
  using (
    exists (
      select 1 from public.knowledge_cards kc
       where kc.id = card_id and kc.owner_id = (select auth.uid())
    )
    and exists (
      select 1 from public.tags t
       where t.id = tag_id and t.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.knowledge_cards kc
       where kc.id = card_id and kc.owner_id = (select auth.uid())
    )
    and exists (
      select 1 from public.tags t
       where t.id = tag_id and t.owner_id = (select auth.uid())
    )
  );

create policy owner_full_access_card_projects
  on public.knowledge_card_projects
  for all to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.knowledge_cards kc
       where kc.id = card_id and kc.owner_id = (select auth.uid())
    )
    and exists (
      select 1 from public.projects p
       where p.id = project_id and p.owner_id = (select auth.uid())
    )
  )
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.knowledge_cards kc
       where kc.id = card_id and kc.owner_id = (select auth.uid())
    )
    and exists (
      select 1 from public.projects p
       where p.id = project_id and p.owner_id = (select auth.uid())
    )
  );
