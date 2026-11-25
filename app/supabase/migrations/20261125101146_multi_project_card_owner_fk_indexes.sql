-- Cover the composite ownership foreign keys for efficient deletes and updates.
create index knowledge_card_projects_card_owner_idx
  on public.knowledge_card_projects (card_id, owner_id);

create index knowledge_card_projects_project_owner_idx
  on public.knowledge_card_projects (project_id, owner_id);
