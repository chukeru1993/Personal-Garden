import { supabase, demoMode, DEMO_USER_ID } from './supabase'

const DEMO_KEY = 'personal-garden-demo-v1'
const now = () => new Date().toISOString()
const uid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random()}`)

const ok = (data) => ({ data, error: null })
const fail = (message) => ({ data: null, error: { message } })

function seedDemo() {
  const ownerId = DEMO_USER_ID
  const projects = [
    { id: 'p-cognition', owner_id: ownerId, name: '认知与成长', description: '元认知、执行功能、学习机制', icon: '🌱', status: 'active', featured: true, sort_order: 1, created_at: '2026-11-01T09:00:00.000Z', updated_at: '2026-11-01T09:00:00.000Z' },
    { id: 'p-agent', owner_id: ownerId, name: 'AI Agent', description: 'Agent、Skills、模型机制', icon: '🤖', status: 'active', featured: true, sort_order: 2, created_at: '2026-11-02T09:00:00.000Z', updated_at: '2026-11-02T09:00:00.000Z' },
    { id: 'p-reading', owner_id: ownerId, name: '论文与阅读', description: '研究论文、书籍、阅读笔记', icon: '📚', status: 'active', featured: true, sort_order: 3, created_at: '2026-11-03T09:00:00.000Z', updated_at: '2026-11-03T09:00:00.000Z' },
    { id: 'p-video', owner_id: ownerId, name: '视频创作', description: '选题、脚本、设计、制作', icon: '🎬', status: 'active', featured: false, sort_order: 4, created_at: '2026-11-04T09:00:00.000Z', updated_at: '2026-11-04T09:00:00.000Z' },
  ]
  const tags = [
    { id: 't-cog', owner_id: ownerId, name: '认知科学', color: 'sage', sort_order: 1, created_at: now(), updated_at: now() },
    { id: 't-paper', owner_id: ownerId, name: '论文精读', color: 'slate', sort_order: 2, created_at: now(), updated_at: now() },
    { id: 't-agent', owner_id: ownerId, name: 'Agent', color: 'terracotta', sort_order: 3, created_at: now(), updated_at: now() },
    { id: 't-tech', owner_id: ownerId, name: '技术资源', color: 'slate', sort_order: 4, created_at: now(), updated_at: now() },
    { id: 't-creation', owner_id: ownerId, name: '创作', color: 'terracotta', sort_order: 5, created_at: now(), updated_at: now() },
    { id: 't-todo', owner_id: ownerId, name: '待整理', color: 'neutral', sort_order: 6, created_at: now(), updated_at: now() },
  ]
  const cards = [
    { id: 'c1', owner_id: ownerId, title: 'Metacognition and Cognitive Monitoring', url: 'https://www.notion.so/', resource_type: 'notion', description: '关于元认知知识、认知体验与认知监控的研究。', project_ids: ['p-cognition'], tags: ['t-cog', 't-paper'], sort_order: 1, created_at: '2026-11-25T08:20:00.000Z', updated_at: '2026-11-25T08:20:00.000Z' },
    { id: 'c2', owner_id: ownerId, title: 'Executive Functions: A Review', url: 'https://drive.google.com/', resource_type: 'google_drive', description: '执行功能相关研究文献。', project_ids: ['p-cognition'], tags: ['t-paper'], sort_order: 2, created_at: '2026-11-24T10:00:00.000Z', updated_at: '2026-11-24T10:00:00.000Z' },
    { id: 'c3', owner_id: ownerId, title: '关于知识积累与真正成长的思考', url: 'https://www.notion.so/', resource_type: 'notion', description: '为什么知识的数量并不一定等于认知能力的提升？', project_ids: ['p-cognition'], tags: ['t-cog'], sort_order: 3, created_at: '2026-11-22T12:00:00.000Z', updated_at: '2026-11-22T12:00:00.000Z' },
    { id: 'c4', owner_id: ownerId, title: 'Agent Skills 设计分析', url: 'https://www.notion.so/', resource_type: 'notion', description: 'Skills 作为 Agent 能力封装的设计笔记。', project_ids: ['p-agent'], tags: ['t-agent'], sort_order: 1, created_at: '2026-11-23T15:30:00.000Z', updated_at: '2026-11-23T15:30:00.000Z' },
    { id: 'c5', owner_id: ownerId, title: 'HyperFrames 官方项目', url: 'https://github.com/', resource_type: 'github', description: '视频生成与编排工具。', project_ids: ['p-video'], tags: ['t-tech', 't-creation'], sort_order: 1, created_at: '2026-11-21T09:10:00.000Z', updated_at: '2026-11-21T09:10:00.000Z' },
    { id: 'c6', owner_id: ownerId, title: '认知外包研究论文', url: 'https://drive.google.com/', resource_type: 'google_drive', description: '关于认知外包与工具依赖的研究。', project_ids: ['p-agent'], tags: ['t-paper', 't-agent'], sort_order: 2, created_at: '2026-11-20T16:00:00.000Z', updated_at: '2026-11-20T16:00:00.000Z' },
    { id: 'c7', owner_id: ownerId, title: 'Supabase Auth 官方文档', url: 'https://supabase.com/docs', resource_type: 'web', description: '邮箱魔法链接与 RLS 配置参考。', project_ids: ['p-agent'], tags: ['t-tech', 't-todo'], sort_order: 3, created_at: '2026-11-19T11:00:00.000Z', updated_at: '2026-11-19T11:00:00.000Z' },
    { id: 'c8', owner_id: ownerId, title: '文化传播相关论文', url: 'https://drive.google.com/', resource_type: 'google_drive', description: '文化传播与媒介研究。', project_ids: ['p-reading'], tags: ['t-paper'], sort_order: 1, created_at: '2026-11-18T14:20:00.000Z', updated_at: '2026-11-18T14:20:00.000Z' },
  ]
  return { projects, tags, cards }
}

function readDemo() {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    if (raw) {
      const db = JSON.parse(raw)
      let changed = false
      db.cards = (db.cards || []).map((card) => {
        if (Array.isArray(card.project_ids) && !Object.hasOwn(card, 'project_id')) return card
        const { project_id: legacyProjectId, ...rest } = card
        changed = true
        return {
          ...rest,
          project_ids: Array.isArray(card.project_ids)
            ? [...new Set(card.project_ids)]
            : legacyProjectId ? [legacyProjectId] : [],
        }
      })
      if (changed) localStorage.setItem(DEMO_KEY, JSON.stringify(db))
      return db
    }
  } catch {
    // ignore corrupted demo state
  }
  const seeded = seedDemo()
  localStorage.setItem(DEMO_KEY, JSON.stringify(seeded))
  return seeded
}

function writeDemo(db) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(db))
  return db
}

function sortByOrder(items) {
  return [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.created_at || '').localeCompare(String(b.created_at || '')))
}

function cleanProject(input, ownerId) {
  return {
    id: input.id || undefined,
    owner_id: ownerId,
    name: input.name,
    description: input.description || null,
    icon: input.icon || null,
    status: input.status || 'active',
    featured: Boolean(input.featured),
    sort_order: Number(input.sort_order ?? 0),
  }
}

function cleanTag(input, ownerId) {
  return {
    id: input.id || undefined,
    owner_id: ownerId,
    name: input.name,
    color: input.color || 'neutral',
    sort_order: Number(input.sort_order ?? 0),
  }
}

function cleanCard(input, ownerId) {
  return {
    id: input.id || undefined,
    owner_id: ownerId,
    title: input.title,
    url: input.url,
    resource_type: input.resource_type || 'web',
    description: input.description || null,
    sort_order: Number(input.sort_order ?? 0),
  }
}

function sortCards(cards) {
  return [...cards].sort((a, b) => (
    String(b.created_at || '').localeCompare(String(a.created_at || '')) ||
    Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)
  ))
}

export const api = {
  async listProjects(user) {
    const ownerId = user?.id || DEMO_USER_ID
    if (demoMode) return ok(sortByOrder(readDemo().projects.filter((p) => p.owner_id === ownerId)))
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', ownerId)
      .order('sort_order', { ascending: true })
    return error ? fail(error.message) : ok(data || [])
  },

  async listTags(user) {
    const ownerId = user?.id || DEMO_USER_ID
    if (demoMode) return ok(sortByOrder(readDemo().tags.filter((t) => t.owner_id === ownerId)))
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('owner_id', ownerId)
      .order('sort_order', { ascending: true })
    return error ? fail(error.message) : ok(data || [])
  },

  async listCards(user) {
    const ownerId = user?.id || DEMO_USER_ID
    if (demoMode) {
      const cards = readDemo().cards.filter((c) => c.owner_id === ownerId)
      return ok(sortCards(cards))
    }
    const { data, error } = await supabase
      .from('knowledge_cards')
      .select('*, knowledge_card_tags(tag_id), knowledge_card_projects(project_id)')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .order('sort_order', { ascending: true })
    if (error) return fail(error.message)
    const cards = (data || []).map((card) => ({
      ...card,
      tags: (card.knowledge_card_tags || []).map((row) => row.tag_id),
      project_ids: (card.knowledge_card_projects || []).map((row) => row.project_id),
    }))
    return ok(cards)
  },

  async saveProject(user, input) {
    const ownerId = user?.id || DEMO_USER_ID
    const record = cleanProject(input, ownerId)
    if (demoMode) {
      const db = readDemo()
      if (record.id) {
        db.projects = db.projects.map((p) => (p.id === record.id ? { ...p, ...record, updated_at: now() } : p))
      } else {
        const lastOrder = Math.max(0, ...db.projects.filter((project) => project.owner_id === ownerId).map((project) => Number(project.sort_order) || 0))
        db.projects.push({ ...record, sort_order: lastOrder + 1, id: uid(), created_at: now(), updated_at: now() })
      }
      return ok(writeDemo(db))
    }
    if (!record.id) {
      const { data: lastProject, error: orderError } = await supabase
        .from('projects')
        .select('sort_order')
        .eq('owner_id', ownerId)
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (orderError) return fail(orderError.message)
      record.sort_order = (Number(lastProject?.sort_order) || 0) + 1
    }
    const { data, error } = await supabase.from('projects').upsert(record).select().single()
    return error ? fail(error.message) : ok(data)
  },

  async saveTag(user, input) {
    const ownerId = user?.id || DEMO_USER_ID
    const record = cleanTag(input, ownerId)
    if (demoMode) {
      const db = readDemo()
      if (record.id) {
        db.tags = db.tags.map((t) => (t.id === record.id ? { ...t, ...record, updated_at: now() } : t))
      } else {
        db.tags.push({ ...record, id: uid(), created_at: now(), updated_at: now() })
      }
      return ok(writeDemo(db))
    }
    const { data, error } = await supabase.from('tags').upsert(record).select().single()
    return error ? fail(error.message) : ok(data)
  },

  async saveCard(user, input, tagIds = []) {
    const ownerId = user?.id || DEMO_USER_ID
    const record = cleanCard(input, ownerId)
    const projectIds = [...new Set(input.project_ids || [])]
    if (demoMode) {
      const db = readDemo()
      const ownedProjectIds = new Set(db.projects.filter((p) => p.owner_id === ownerId).map((p) => p.id))
      if (projectIds.some((id) => !ownedProjectIds.has(id))) return fail('项目不存在或无权访问')
      if (record.id) {
        db.cards = db.cards.map((c) => (c.id === record.id && c.owner_id === ownerId ? { ...c, ...record, tags: tagIds, project_ids: projectIds, updated_at: now() } : c))
      } else {
        db.cards.push({ ...record, id: uid(), tags: tagIds, project_ids: projectIds, created_at: now(), updated_at: now() })
      }
      return ok(writeDemo(db))
    }
    const { data: card, error } = await supabase.from('knowledge_cards').upsert(record).select().single()
    if (error) return fail(error.message)
    const { error: deleteError } = await supabase.from('knowledge_card_tags').delete().eq('card_id', card.id)
    if (deleteError) return fail(deleteError.message)
    if (tagIds.length) {
      const { error: insertError } = await supabase
        .from('knowledge_card_tags')
        .insert(tagIds.map((tagId) => ({ card_id: card.id, tag_id: tagId })))
      if (insertError) return fail(insertError.message)
    }
    const { error: projectDeleteError } = await supabase.from('knowledge_card_projects').delete().eq('card_id', card.id).eq('owner_id', ownerId)
    if (projectDeleteError) return fail(projectDeleteError.message)
    if (projectIds.length) {
      const { error: projectInsertError } = await supabase.from('knowledge_card_projects').insert(
        projectIds.map((projectId) => ({ card_id: card.id, project_id: projectId, owner_id: ownerId })),
      )
      if (projectInsertError) return fail(projectInsertError.message)
    }
    return ok({ ...card, tags: tagIds, project_ids: projectIds })
  },

  async attachCardsToProject(user, projectId, cardIds) {
    const ownerId = user?.id || DEMO_USER_ID
    const uniqueCardIds = [...new Set(cardIds || [])]
    if (!uniqueCardIds.length) return ok(true)
    if (demoMode) {
      const db = readDemo()
      if (!db.projects.some((p) => p.id === projectId && p.owner_id === ownerId)) return fail('项目不存在或无权访问')
      const cards = db.cards.filter((card) => uniqueCardIds.includes(card.id) && card.owner_id === ownerId)
      if (cards.length !== uniqueCardIds.length) return fail('部分卡片不存在或无权访问')
      db.cards = db.cards.map((card) => cards.some((item) => item.id === card.id)
        ? { ...card, project_ids: [...new Set([...(card.project_ids || []), projectId])] }
        : card)
      return ok(writeDemo(db))
    }
    const { error } = await supabase.from('knowledge_card_projects').upsert(
      uniqueCardIds.map((cardId) => ({ card_id: cardId, project_id: projectId, owner_id: ownerId })),
      { onConflict: 'card_id,project_id', ignoreDuplicates: true },
    )
    return error ? fail(error.message) : ok(true)
  },

  async detachCardFromProject(user, projectId, cardId) {
    const ownerId = user?.id || DEMO_USER_ID
    if (demoMode) {
      const db = readDemo()
      db.cards = db.cards.map((card) => card.owner_id === ownerId && card.id === cardId
        ? { ...card, project_ids: (card.project_ids || []).filter((id) => id !== projectId) }
        : card)
      return ok(writeDemo(db))
    }
    const { error } = await supabase.from('knowledge_card_projects').delete()
      .eq('card_id', cardId).eq('project_id', projectId).eq('owner_id', ownerId)
    return error ? fail(error.message) : ok(true)
  },

  async deleteProject(user, id) {
    if (demoMode) {
      const db = readDemo()
      db.projects = db.projects.filter((p) => p.id !== id)
      db.cards = db.cards.map((card) => ({ ...card, project_ids: (card.project_ids || []).filter((projectId) => projectId !== id) }))
      return ok(writeDemo(db))
    }
    const { error } = await supabase.from('projects').delete().eq('id', id).eq('owner_id', user.id)
    return error ? fail(error.message) : ok(true)
  },

  async deleteTag(user, id) {
    if (demoMode) {
      const db = readDemo()
      db.tags = db.tags.filter((t) => t.id !== id)
      db.cards = db.cards.map((c) => ({ ...c, tags: (c.tags || []).filter((t) => t !== id) }))
      return ok(writeDemo(db))
    }
    const { error } = await supabase.from('tags').delete().eq('id', id).eq('owner_id', user.id)
    return error ? fail(error.message) : ok(true)
  },

  async deleteCard(user, id) {
    if (demoMode) {
      const db = readDemo()
      db.cards = db.cards.filter((c) => c.id !== id)
      return ok(writeDemo(db))
    }
    const { error } = await supabase.from('knowledge_cards').delete().eq('id', id).eq('owner_id', user.id)
    return error ? fail(error.message) : ok(true)
  },

  async setFeatured(user, orderedIds, featuredIds) {
    const ownerId = user?.id || DEMO_USER_ID
    if (demoMode) {
      const db = readDemo()
      db.projects = db.projects.map((p) => {
        const index = orderedIds.indexOf(p.id)
        return {
          ...p,
          featured: featuredIds.includes(p.id),
          sort_order: index >= 0 ? index + 1 : p.sort_order,
          updated_at: now(),
        }
      })
      return ok(writeDemo(db))
    }
    const updates = orderedIds.map((id, index) => ({ id, owner_id: ownerId, featured: featuredIds.includes(id), sort_order: index + 1 }))
    for (const update of updates) {
      const { error } = await supabase.from('projects').update({ featured: update.featured, sort_order: update.sort_order }).eq('id', update.id).eq('owner_id', ownerId)
      if (error) return fail(error.message)
    }
    return ok(true)
  },

  async setTagOrder(user, orderedIds) {
    const ownerId = user?.id || DEMO_USER_ID
    if (demoMode) {
      const db = readDemo()
      db.tags = db.tags.map((t) => {
        const index = orderedIds.indexOf(t.id)
        return index >= 0 ? { ...t, sort_order: index + 1, updated_at: now() } : t
      })
      return ok(writeDemo(db))
    }
    for (let index = 0; index < orderedIds.length; index += 1) {
      const { error } = await supabase.from('tags').update({ sort_order: index + 1 }).eq('id', orderedIds[index]).eq('owner_id', ownerId)
      if (error) return fail(error.message)
    }
    return ok(true)
  },

  async seedSampleData(user) {
    if (demoMode || !user) return ok(true)
    const seed = seedDemo()
    const projectMap = {}
    const tagMap = {}

    for (const project of seed.projects) {
      const { id, ...payload } = project
      const { data, error } = await supabase.from('projects').insert({ ...payload, owner_id: user.id }).select().single()
      if (error) return fail(error.message)
      projectMap[project.id] = data.id
    }

    for (const tag of seed.tags) {
      const { id, ...payload } = tag
      const { data, error } = await supabase.from('tags').insert({ ...payload, owner_id: user.id }).select().single()
      if (error) return fail(error.message)
      tagMap[tag.id] = data.id
    }

    for (const card of seed.cards) {
      const { id, tags, project_ids, ...payload } = card
      const { data, error } = await supabase
        .from('knowledge_cards')
        .insert({ ...payload, owner_id: user.id })
        .select()
        .single()
      if (error) return fail(error.message)
      const linkRows = (tags || []).map((tagId) => ({ card_id: data.id, tag_id: tagMap[tagId] })).filter((row) => row.tag_id)
      if (linkRows.length) {
        const { error: linkError } = await supabase.from('knowledge_card_tags').insert(linkRows)
        if (linkError) return fail(linkError.message)
      }
      const projectRows = (project_ids || []).map((projectId) => ({ card_id: data.id, project_id: projectMap[projectId], owner_id: user.id })).filter((row) => row.project_id)
      if (projectRows.length) {
        const { error: projectLinkError } = await supabase.from('knowledge_card_projects').insert(projectRows)
        if (projectLinkError) return fail(projectLinkError.message)
      }
    }

    return ok(true)
  },
}
