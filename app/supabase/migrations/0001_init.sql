-- Personal Garden · initial schema
-- 目标：Supabase hosted PostgreSQL。只开放 authenticated 角色，anon 无任何表权限。

-- 枚举类型
create type resource_type as enum ('notion', 'google_drive', 'github', 'web');
create type project_status as enum ('active', 'paused', 'archived');
create type tag_color as enum ('sage', 'terracotta', 'slate', 'neutral');

-- 项目：featured 控制是否在首页「正在探索」展示，sort_order 同时用于首页排序
create table projects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  icon        text,
  status      project_status not null default 'active',
  featured    boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 知识卡片：只是外部资料的索引入口，不存正文
create table knowledge_cards (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  url           text not null check (url ~ '^https?://'),
  resource_type resource_type not null default 'web',
  description   text,
  project_id    uuid references projects(id) on delete set null,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 可维护的标签类别
create table tags (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  color      tag_color not null default 'neutral',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

-- 卡片与标签的多对多关联
create table knowledge_card_tags (
  card_id uuid not null references knowledge_cards(id) on delete cascade,
  tag_id  uuid not null references tags(id) on delete cascade,
  primary key (card_id, tag_id)
);

-- 索引
create index knowledge_cards_owner_created_idx on knowledge_cards (owner_id, created_at desc);
create index knowledge_cards_owner_project_idx on knowledge_cards (owner_id, project_id);
create index projects_featured_order_idx on projects (owner_id, sort_order) where featured;
create index tags_owner_order_idx on tags (owner_id, sort_order);
create index knowledge_card_tags_tag_idx on knowledge_card_tags (tag_id);

-- updated_at 触发器
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_set_updated_at before update on projects
  for each row execute function set_updated_at();
create trigger cards_set_updated_at before update on knowledge_cards
  for each row execute function set_updated_at();
create trigger tags_set_updated_at before update on tags
  for each row execute function set_updated_at();

-- 权限：只给 authenticated；anon 全部撤销，由 RLS 做最终隔离
grant usage on schema public to authenticated;
grant select, insert, update, delete on projects to authenticated;
grant select, insert, update, delete on knowledge_cards to authenticated;
grant select, insert, update, delete on tags to authenticated;
grant select, insert, update, delete on knowledge_card_tags to authenticated;
revoke all on projects from anon;
revoke all on knowledge_cards from anon;
revoke all on tags from anon;
revoke all on knowledge_card_tags from anon;

-- RLS
alter table projects enable row level security;
alter table knowledge_cards enable row level security;
alter table tags enable row level security;
alter table knowledge_card_tags enable row level security;

create policy "owner_full_access_projects" on projects
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owner_full_access_cards" on knowledge_cards
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owner_full_access_tags" on tags
  for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- 关联表没有 owner_id，借卡片归属判断所有权
create policy "owner_full_access_card_tags" on knowledge_card_tags
  for all to authenticated
  using (exists (
    select 1 from knowledge_cards kc
    where kc.id = card_id and kc.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from knowledge_cards kc
    where kc.id = card_id and kc.owner_id = auth.uid()
  ));
