import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Brain, BookOpen, Bot, Clapperboard, Code, Lightbulb, Microscope, Search, Sprout } from 'lucide-react'
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import { api } from './lib/store'
import { supabase, demoMode, ownerEmail, DEMO_USER_ID } from './lib/supabase'

const RESOURCE_TYPES = [
  { value: 'notion', label: 'Notion' },
  { value: 'google_drive', label: 'Google Drive' },
  { value: 'github', label: 'GitHub' },
  { value: 'web', label: 'Web' },
]

const CARD_SORT_OPTIONS = [
  { value: 'newest', label: '最近添加' },
  { value: 'oldest', label: '最早添加' },
  { value: 'title-asc', label: '标题 A-Z' },
  { value: 'title-desc', label: '标题 Z-A' },
]

const TAG_COLORS = [
  { value: 'sage', label: '鼠尾草绿' },
  { value: 'terracotta', label: '陶土色' },
  { value: 'slate', label: '灰蓝色' },
  { value: 'neutral', label: '中性色' },
]

const STATUS_OPTIONS = [
  { value: 'active', label: '进行中' },
  { value: 'paused', label: '暂停' },
  { value: 'archived', label: '归档' },
]

const PROJECT_ICONS = [
  { value: 'brain', label: '大脑', tone: 'sage', Icon: Brain, legacy: '🧠' },
  { value: 'book-open', label: '书本', tone: 'slate', Icon: BookOpen, legacy: '📚' },
  { value: 'clapperboard', label: '场记板', tone: 'terracotta', Icon: Clapperboard, legacy: '🎬' },
  { value: 'bot', label: '机器人', tone: 'slate', Icon: Bot, legacy: '🤖' },
  { value: 'lightbulb', label: '灵感', tone: 'terracotta', Icon: Lightbulb, legacy: '💡' },
  { value: 'sprout', label: '幼苗', tone: 'sage', Icon: Sprout, legacy: '🌱' },
  { value: 'code', label: '代码', tone: 'slate', Icon: Code, legacy: '💻' },
  { value: 'microscope', label: '显微镜', tone: 'sage', Icon: Microscope, legacy: '🔬' },
]

function projectIconKey(value) {
  return PROJECT_ICONS.find((item) => item.value === value || item.legacy === value)?.value || 'sprout'
}

function ProjectIcon({ value }) {
  const option = PROJECT_ICONS.find((item) => item.value === projectIconKey(value)) || PROJECT_ICONS[5]
  const Icon = option.Icon
  return (
    <span className={`project-icon-badge tone-${option.tone}`} aria-hidden="true">
      <Icon size={18} strokeWidth={1.8} />
    </span>
  )
}

const AuthContext = createContext(null)

function useAuth() {
  return useContext(AuthContext)
}

function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  const applySession = useCallback((next) => {
    if (!next) {
      setSession(null)
      return
    }
    if (ownerEmail && next.user?.email && next.user.email.toLowerCase() !== ownerEmail.toLowerCase()) {
      supabase?.auth.signOut()
      setNotice('该邮箱不在站点白名单内')
      setSession(null)
      return
    }
    setSession(next)
  }, [])

  useEffect(() => {
    if (demoMode) {
      applySession({ user: { id: DEMO_USER_ID, email: ownerEmail || 'demo@local' } })
      setLoading(false)
      return undefined
    }
    supabase.auth.getSession().then(({ data }) => {
      applySession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      applySession(next)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [applySession])

  const signOut = async () => {
    if (demoMode) {
      setSession(null)
      return
    }
    await supabase.auth.signOut()
  }

  const signInWithPassword = async (email, password) => {
    if (!supabase) return { error: { message: 'Supabase 未配置' } }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user || null, loading, notice, setNotice, signOut, signInWithPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

const DataContext = createContext(null)

function DataProvider({ children }) {
  const { user } = useAuth()
  const [state, setState] = useState({ projects: [], cards: [], tags: [], loading: true, error: null })
  const loadedForRef = useRef(null)
  const inFlightRef = useRef(null)

  const reload = useCallback(async (allowSeed = true) => {
    if (!user) return
    if (inFlightRef.current) return inFlightRef.current

    const load = async (seedAllowed) => {
      const [projects, tags, cards] = await Promise.all([
        api.listProjects(user),
        api.listTags(user),
        api.listCards(user),
      ])
      const error = projects.error || tags.error || cards.error
      setState({
        projects: projects.data || [],
        tags: tags.data || [],
        cards: cards.data || [],
        loading: false,
        error: error?.message || null,
      })
      if (!error && seedAllowed && !demoMode && !projects.data.length && !tags.data.length && !cards.data.length) {
        const seedKey = `personal-garden-seeded-${user.id}`
        if (!localStorage.getItem(seedKey)) {
          localStorage.setItem(seedKey, '1')
          const seeded = await api.seedSampleData(user)
          if (!seeded.error) await load(false)
        }
      }
    }

    const task = load(allowSeed).finally(() => {
      inFlightRef.current = null
    })
    inFlightRef.current = task
    return task
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    if (loadedForRef.current !== user.id) {
      loadedForRef.current = user.id
      reload()
    }
  }, [user?.id, reload])

  return <DataContext.Provider value={{ ...state, reload }}>{children}</DataContext.Provider>
}

function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used inside DataProvider')
  return context
}

async function mutate(action, reload) {
  const result = await action()
  if (result.error) {
    showToast(result.error.message, 'error')
    return false
  }
  await reload()
  return true
}

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

function resourceLabel(value) {
  return RESOURCE_TYPES.find((item) => item.value === value)?.label || value || 'Web'
}

function Modal({ title, onClose, children }) {
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const dialog = dialogRef.current
    const previousFocus = document.activeElement
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusables = () => [...(dialog?.querySelectorAll(focusableSelector) || [])]
      .filter((element) => element.getClientRects().length > 0)

    const first = focusables().find((element) => element.hasAttribute('autofocus')) || focusables()[0]
    ;(first || dialog)?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const items = focusables()
      if (!items.length) {
        event.preventDefault()
        dialog?.focus()
        return
      }

      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (!dialog?.contains(document.activeElement)) {
        event.preventDefault()
        ;(event.shiftKey ? lastItem : firstItem).focus()
      } else if (event.shiftKey && (document.activeElement === firstItem || document.activeElement === dialog)) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    const keepFocusInside = (event) => {
      if (dialog && !dialog.contains(event.target)) (first || dialog).focus()
    }

    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('focusin', keepFocusInside, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('focusin', keepFocusInside, true)
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [])

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="关闭">×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

function Select({ value, onChange, options, label, className = '' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const selected = options.find((item) => item.value === value)

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className={`select ${className}`.trim()}>
      <button
        type="button"
        className="select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{selected?.label || '请选择'}</span>
        <span className="select-caret" aria-hidden="true" />
      </button>
      {open && (
        <div className="select-menu" role="listbox" aria-label={label}>
          {options.map((item) => (
            <button
              key={item.value}
              type="button"
              role="option"
              aria-selected={item.value === value}
              className={`select-option ${item.value === value ? 'selected' : ''}`.trim()}
              onClick={() => {
                onChange(item.value)
                setOpen(false)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

let toastSink = () => {}
let confirmSink = async () => false

export function showToast(message, kind = 'info') {
  toastSink(message, kind)
}

export function askConfirm(message) {
  return confirmSink(message)
}

function ToastProvider({ children }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    toastSink = (message, kind = 'info') => {
      const id = `${Date.now()}-${Math.random()}`
      setItems((prev) => [...prev, { id, message, kind }])
      window.setTimeout(() => setItems((prev) => prev.filter((item) => item.id !== id)), 4200)
    }
    return () => {
      toastSink = () => {}
    }
  }, [])

  return (
    <>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`toast toast-${item.kind}`}>
            <span>{item.message}</span>
            <button type="button" onClick={() => setItems((prev) => prev.filter((entry) => entry.id !== item.id))} aria-label="关闭提示">×</button>
          </div>
        ))}
      </div>
    </>
  )
}

function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null)

  useEffect(() => {
    confirmSink = (message) => new Promise((resolve) => setRequest({ message, resolve }))
    return () => {
      confirmSink = async () => false
    }
  }, [])

  const answer = (value) => {
    request?.resolve(value)
    setRequest(null)
  }

  return (
    <>
      {children}
      {request && (
        <Modal title="请确认" onClose={() => answer(false)}>
          <p className="confirm-message">{request.message}</p>
          <div className="form-actions">
            <button type="button" className="button secondary" onClick={() => answer(false)}>取消</button>
            <button type="button" className="button danger" onClick={() => answer(true)}>确认</button>
          </div>
        </Modal>
      )}
    </>
  )
}

function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <svg width="68" height="52" viewBox="0 0 68 52" fill="none" aria-hidden="true">
        <path d="M8 42c14-3 25-3 52 0" stroke="#E5DED2" strokeWidth="2" strokeLinecap="round" />
        <path d="M34 41V20" stroke="#A5B196" strokeWidth="2" strokeLinecap="round" />
        <path d="M34 27c-9 0-13-5-13-12 8 0 13 4 13 12Z" fill="#EDF1E7" stroke="#A5B196" strokeWidth="1.6" />
        <path d="M34 22c0-8 5-12 12-12 0 7-4 12-12 12Z" fill="#F4E9E1" stroke="#BD9179" strokeWidth="1.6" />
      </svg>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}

function Goto({ to, className = '', children, ...rest }) {
  const navigate = useNavigate()
  return (
    <button type="button" className={className} onClick={() => navigate(to)} {...rest}>
      {children}
    </button>
  )
}

function NavButton({ to, end = false, className = '', children }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const active = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)
  return (
    <button
      type="button"
      className={`${className} ${active ? 'active' : ''}`.trim()}
      aria-current={active ? 'page' : undefined}
      onClick={() => navigate(to)}
    >
      {children}
    </button>
  )
}

function ProjectCard({ project, cardCount, onEdit, onDelete }) {
  return (
    <article className="project-card">
      <Goto className="project-card-link" to={`/projects/${project.id}`}>
        <div className="project-card-top">
          <ProjectIcon value={project.icon} />
          {project.featured && <span className="soft-badge">首页展示</span>}
        </div>
        <h3>{project.name}</h3>
        <p>{project.description || '还没有写项目说明。'}</p>
      </Goto>
      <div className="project-card-footer">
        <span className="muted">{cardCount} 张知识卡片</span>
        <span className="row-actions" onClick={(event) => event.stopPropagation()}>
          {onEdit && <button className="text-button" onClick={onEdit}>编辑</button>}
          {onDelete && <button className="text-button danger" onClick={onDelete}>删除</button>}
        </span>
      </div>
    </article>
  )
}

function CardRow({ card, projectsById, tagsById, onEdit, onDelete, onDetach, onRowClick }) {
  const tags = (card.tags || []).map((id) => tagsById[id]).filter(Boolean)
  const linkedProjects = (card.project_ids || []).map((id) => projectsById[id]).filter(Boolean)
  const onRowKeyDown = (event) => {
    if (!onRowClick || event.target !== event.currentTarget || !['Enter', ' '].includes(event.key)) return
    event.preventDefault()
    onRowClick()
  }
  return (
    <div
      className={`card-row ${onRowClick ? 'card-row-editable' : ''}`}
      onClick={onRowClick ? (event) => {
        if (!event.target.closest('a, button, input, select, textarea')) onRowClick()
      } : undefined}
      onKeyDown={onRowKeyDown}
      role={onRowClick ? 'group' : undefined}
      tabIndex={onRowClick ? 0 : undefined}
      aria-label={onRowClick ? `${card.title}，点击此行编辑卡片` : undefined}
    >
      <div className="card-row-main">
        <a className="card-title" href={card.url} target="_blank" rel="noopener noreferrer" aria-label={`${card.title}（在新标签页打开）`}>
          {card.title}<span className="external-arrow"> ↗</span>
        </a>
        <div className="card-meta">
          <span className={`type-chip type-${card.resource_type}`}>{resourceLabel(card.resource_type)}</span>
          {linkedProjects.length > 0 && <span>· {linkedProjects.map((project) => project.name).join('、')}</span>}
          <span>· {formatDate(card.created_at)}</span>
        </div>
        {card.description && <p className="card-description">{card.description}</p>}
        {tags.length > 0 && (
          <div className="tag-list">
            {tags.slice(0, 2).map((tag) => (
              <span key={tag.id} className={`tag-chip tag-${tag.color}`}>{tag.name}</span>
            ))}
            {tags.length > 2 && <span className="tag-chip tag-neutral">+{tags.length - 2}</span>}
          </div>
        )}
      </div>
      {(onDelete || onDetach || (onEdit && !onRowClick)) && (
        <div className="row-actions card-actions">
          {onEdit && !onRowClick && <button className="text-button" onClick={onEdit}>编辑</button>}
          {onDelete && <button className="text-button danger" onClick={onDelete}>删除</button>}
          {onDetach && <button className="text-button danger" onClick={onDetach}>从项目移除</button>}
        </div>
      )}
    </div>
  )
}

function ProjectForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    icon: 'sprout',
    status: 'active',
    featured: false,
    ...initial,
  })
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!form.name.trim()) {
          showToast('请填写项目名称', 'error')
          return
        }
        onSubmit({
          ...form,
          name: form.name.trim(),
        })
      }}
    >
      <label className="field">
        <span>项目名称 <em>*</em></span>
        <input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="例如：认知与成长" autoFocus />
      </label>
      <label className="field">
        <span>一句话描述</span>
        <textarea value={form.description || ''} onChange={(event) => update('description', event.target.value)} rows="3" placeholder="这个主题在探索什么？" />
      </label>
      <div className="field-grid">
        <div className="field">
          <span>图标</span>
          <div className="project-icon-choices" role="group" aria-label="选择项目图标">
            {PROJECT_ICONS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`project-icon-choice ${projectIconKey(form.icon) === item.value ? 'selected' : ''}`}
                aria-label={item.label}
                aria-pressed={projectIconKey(form.icon) === item.value}
                title={item.label}
                onClick={() => update('icon', item.value)}
              >
                <ProjectIcon value={item.value} />
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>状态</span>
          <Select value={form.status} onChange={(value) => update('status', value)} options={STATUS_OPTIONS} label="项目状态" />
        </div>
      </div>
      <label className="checkbox-field">
        <input type="checkbox" checked={Boolean(form.featured)} onChange={(event) => update('featured', event.target.checked)} />
        <span>在首页展示</span>
      </label>
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={onCancel}>取消</button>
        <button type="submit" className="button primary">保存项目</button>
      </div>
    </form>
  )
}

function CardForm({ initial, projects, tags, onSubmit, onCancel, onDelete }) {
  const [form, setForm] = useState({
    title: '',
    url: '',
    resource_type: 'notion',
    description: '',
    project_ids: [],
    sort_order: 0,
    ...initial,
  })
  const [selectedTags, setSelectedTags] = useState(initial?.tags || [])
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const toggleTag = (id) => setSelectedTags((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  const toggleProject = (id) => setForm((prev) => ({
    ...prev,
    project_ids: (prev.project_ids || []).includes(id)
      ? prev.project_ids.filter((item) => item !== id)
      : [...(prev.project_ids || []), id],
  }))

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!form.title.trim()) {
          showToast('请填写标题', 'error')
          return
        }
        if (!/^https?:\/\/.+/.test(form.url || '')) {
          showToast('请填写有效的 http(s) 链接', 'error')
          return
        }
        onSubmit(
          { ...form, title: form.title.trim(), url: form.url.trim(), project_ids: form.project_ids || [] },
          selectedTags,
        )
      }}
    >
      <label className="field">
        <span>标题 <em>*</em></span>
        <input value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="资料标题" autoFocus />
      </label>
      <label className="field">
        <span>外部链接 <em>*</em></span>
        <input value={form.url} onChange={(event) => update('url', event.target.value)} placeholder="https://..." />
      </label>
      <div className="field-grid">
        <div className="field">
          <span>资源类型</span>
          <Select value={form.resource_type} onChange={(value) => update('resource_type', value)} options={RESOURCE_TYPES} label="资源类型" />
        </div>
        <div className="field">
          <span>所属项目（可多选）</span>
          {projects.length ? (
            <div className="project-picker">
              {projects.map((project) => (
                <label key={project.id} className="checkbox-field">
                  <input type="checkbox" checked={(form.project_ids || []).includes(project.id)} onChange={() => toggleProject(project.id)} />
                  <span className="card-project-label"><ProjectIcon value={project.icon} /> {project.name}</span>
                </label>
              ))}
            </div>
          ) : <p className="muted small">暂时没有项目。</p>}
        </div>
      </div>
      <label className="field">
        <span>一句话描述</span>
        <textarea value={form.description || ''} onChange={(event) => update('description', event.target.value)} rows="2" placeholder="选填" />
      </label>
      <div className="field">
        <span>标签类别（可多选）</span>
        {tags.length === 0 ? (
          <p className="muted small">还没有标签类别，可以先到 Library → 标签管理创建。</p>
        ) : (
          <div className="tag-picker">
            {tags.map((tag) => (
              <button
                type="button"
                key={tag.id}
                className={`tag-option tag-${tag.color} ${selectedTags.includes(tag.id) ? 'selected' : ''}`}
                onClick={() => toggleTag(tag.id)}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="form-actions">
        {onDelete && <button type="button" className="text-button danger modal-delete-action" onClick={onDelete}>删除卡片</button>}
        <button type="button" className="button secondary" onClick={onCancel}>取消</button>
        <button type="submit" className="button primary">保存卡片</button>
      </div>
    </form>
  )
}

function TagForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    color: 'neutral',
    sort_order: 0,
    ...initial,
  })
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!form.name.trim()) {
          showToast('请填写标签名称', 'error')
          return
        }
        onSubmit({ ...form, name: form.name.trim(), sort_order: Number(form.sort_order || 0) })
      }}
    >
      <label className="field">
        <span>标签名称 <em>*</em></span>
        <input value={form.name} onChange={(event) => update('name', event.target.value)} autoFocus />
      </label>
      <label className="field">
        <span>颜色</span>
        <div className="color-options" role="group" aria-label="选择标签颜色">
          {TAG_COLORS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`color-swatch color-swatch-${item.value} ${form.color === item.value ? 'selected' : ''}`}
              aria-label={item.label}
              aria-pressed={form.color === item.value}
              title={item.label}
              onClick={() => update('color', item.value)}
            />
          ))}
        </div>
        <span className="muted small">{TAG_COLORS.find((item) => item.value === form.color)?.label || '中性色'}</span>
      </label>
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={onCancel}>取消</button>
        <button type="submit" className="button primary">保存标签</button>
      </div>
    </form>
  )
}

function AppShell() {
  const { user, signOut, notice, setNotice } = useAuth()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark"><Sprout size={18} strokeWidth={1.8} aria-hidden="true" /></span>
          <div>
            <strong>Personal Garden</strong>
            <small>YOUR KNOWLEDGE SPACE</small>
          </div>
        </div>
        <nav className="side-nav">
          <NavButton to="/" end><span>01</span> Dashboard</NavButton>
          <NavButton to="/projects"><span>02</span> Projects</NavButton>
          <NavButton to="/library"><span>03</span> Library</NavButton>
        </nav>
        <div className="sidebar-foot">
          <div className="user-line">{user?.email || '本地演示'}</div>
          {demoMode && <span className="soft-badge">演示模式</span>}
          <button className="text-button" onClick={signOut}>退出登录</button>
        </div>
      </aside>
      <main className="main-area">
        <div className="mobile-nav">
          <nav aria-label="主导航">
            <NavButton to="/" end>首页</NavButton>
            <NavButton to="/projects">项目</NavButton>
            <NavButton to="/library">知识库</NavButton>
          </nav>
          <button className="text-button" onClick={signOut}>退出登录</button>
        </div>
        {notice && (
          <div className="notice-bar">
            <span>{notice}</span>
            <button onClick={() => setNotice('')} aria-label="关闭提示">×</button>
          </div>
        )}
        <div className="content"><Outlet /></div>
      </main>
    </div>
  )
}

function Dashboard() {
  const { user } = useAuth()
  const { projects, cards, tags, loading, error, reload } = useData()
  const [editing, setEditing] = useState(false)
  const [ordered, setOrdered] = useState([])
  const [selected, setSelected] = useState([])
  const tagsById = useMemo(() => Object.fromEntries(tags.map((tag) => [tag.id, tag])), [tags])
  const projectsById = useMemo(() => Object.fromEntries(projects.map((project) => [project.id, project])), [projects])

  const featured = useMemo(
    () => projects.filter((project) => project.featured).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    [projects],
  )

  const startEdit = () => {
    setOrdered(projects.map((project) => project.id))
    setSelected(projects.filter((project) => project.featured).map((project) => project.id))
    setEditing(true)
  }

  const move = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= ordered.length) return
    setOrdered((prev) => {
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const saveFeatured = async () => {
    const changed = await mutate(() => api.setFeatured(user, ordered, selected), reload)
    if (changed) setEditing(false)
  }

  if (loading) return <div className="loading">正在整理你的花园…</div>
  if (error) return <div className="error-box">{error}</div>

  return (
    <div className="page dashboard">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">PERSONAL GARDEN · YOUR PERSONAL KNOWLEDGE SPACE</p>
          <h1>探索，从一个问题开始。</h1>
          <p className="hero-sub">管理正在关注的主题，重新找到曾经留下的知识与资料。</p>
          <div className="hero-links">
            <Goto className="button primary" to="/projects">进入 Projects</Goto>
            <Goto className="button secondary" to="/library">搜索 Library</Goto>
          </div>
        </div>
        <svg className="hero-doodle" width="132" height="112" viewBox="0 0 132 112" fill="none" aria-hidden="true">
          <path d="M12 98c26-5 61-5 108 0" stroke="#E5DED2" strokeWidth="2" strokeLinecap="round" />
          <path d="M66 97V46" stroke="#A5B196" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M66 63c-17 0-24-9-24-23 15 0 24 8 24 23Z" fill="#EDF1E7" stroke="#A5B196" strokeWidth="1.8" />
          <path d="M66 54c0-16 10-23 23-23 0 14-8 23-23 23Z" fill="#F4E9E1" stroke="#BD9179" strokeWidth="1.8" />
          <circle cx="34" cy="34" r="2" fill="#BD9179" />
          <circle cx="104" cy="73" r="2" fill="#91A4AE" />
        </svg>
      </header>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">CURRENT EXPLORATIONS</p>
            <h2>正在探索</h2>
          </div>
          {!editing && <button className="text-button" onClick={startEdit}>编辑主题</button>}
        </div>
        {editing ? (
          <div className="featured-editor">
            <p className="muted small">勾选需要在首页展示的主题，用箭头调整顺序。</p>
            {ordered.map((id, index) => {
              const project = projectsById[id]
              if (!project) return null
              return (
                <div key={id} className="featured-editor-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={selected.includes(id)}
                      onChange={() => setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))}
                    />
                    <span className="featured-project-label"><ProjectIcon value={project.icon} /> {project.name}</span>
                  </label>
                  <span className="row-actions">
                    <button className="icon-button" onClick={() => move(index, -1)} aria-label="上移">↑</button>
                    <button className="icon-button" onClick={() => move(index, 1)} aria-label="下移">↓</button>
                  </span>
                </div>
              )
            })}
            <div className="form-actions">
              <button className="button secondary" onClick={() => setEditing(false)}>取消</button>
              <button className="button primary" onClick={saveFeatured}>保存主题</button>
            </div>
          </div>
        ) : featured.length ? (
          <div className="project-grid">
            {featured.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                cardCount={cards.filter((card) => (card.project_ids || []).includes(project.id)).length}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="还没有选择探索主题" description="到 Projects 勾选几个项目，它们就会出现在这里。" action={<Goto className="button secondary" to="/projects">去选择</Goto>} />
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <p className="eyebrow">RECENTLY INDEXED</p>
            <h2>最近添加</h2>
          </div>
          <Goto className="text-button" to="/library">查看全部</Goto>
        </div>
        {cards.length ? (
          <div className="card-list">
            {cards.slice(0, 6).map((card) => (
              <CardRow key={card.id} card={card} projectsById={projectsById} tagsById={tagsById} />
            ))}
          </div>
        ) : (
          <EmptyState title="还没有知识卡片" description="在 Notion 或 Drive 整理好资料后，回来登记一条索引入口。" />
        )}
      </section>
    </div>
  )
}

function ProjectsPage() {
  const { user } = useAuth()
  const { projects, cards, loading, error, reload } = useData()
  const [modal, setModal] = useState(null)

  const openNew = () => setModal({ mode: 'new' })
  const openEdit = (project) => setModal({ mode: 'edit', project })

  const remove = async (project) => {
    if (!(await askConfirm(`删除项目「${project.name}」？关联会解除，卡片会保留在知识库和其他项目中。`))) return
    await mutate(() => api.deleteProject(user, project.id), reload)
  }

  if (loading) return <div className="loading">加载中…</div>
  if (error) return <div className="error-box">{error}</div>

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">02 / PROJECTS</p>
          <h1>项目</h1>
          <p className="page-sub">主题空间，不是任务文件夹。按你当下关心的方向自由组织。</p>
        </div>
        <button className="button primary" onClick={openNew}>＋ 新建项目</button>
      </div>
      {projects.length ? (
        <div className="project-grid">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              cardCount={cards.filter((card) => (card.project_ids || []).includes(project.id)).length}
              onEdit={() => openEdit(project)}
              onDelete={() => remove(project)}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="还没有项目" description="创建一个主题空间，开始组织你的知识卡片。" action={<button className="button primary" onClick={openNew}>新建项目</button>} />
      )}
      {modal && (
        <Modal title={modal.mode === 'new' ? '新建项目' : '编辑项目'} onClose={() => setModal(null)}>
          <ProjectForm
            initial={modal.project}
            onCancel={() => setModal(null)}
            onSubmit={async (form) => {
              const changed = await mutate(() => api.saveProject(user, form), reload)
              if (changed) setModal(null)
            }}
          />
        </Modal>
      )}
    </div>
  )
}

function ProjectDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { projects, cards, tags, loading, error, reload } = useData()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [cardModal, setCardModal] = useState(null)
  const [query, setQuery] = useState('')
  const [selectedCardIds, setSelectedCardIds] = useState([])
  const project = projects.find((item) => item.id === id)
  const tagsById = useMemo(() => Object.fromEntries(tags.map((tag) => [tag.id, tag])), [tags])
  const projectsById = useMemo(() => Object.fromEntries(projects.map((item) => [item.id, item])), [projects])
  const projectCards = cards.filter((card) => (card.project_ids || []).includes(id))
  const availableCards = cards.filter((card) => !(card.project_ids || []).includes(id)
    && (!query || card.title.toLowerCase().includes(query.toLowerCase())))

  const attachSelected = async () => {
    const changed = await mutate(() => api.attachCardsToProject(user, id, selectedCardIds), reload)
    if (changed) {
      setPickerOpen(false)
      setSelectedCardIds([])
      setQuery('')
    }
  }

  const detach = async (card) => {
    if (!(await askConfirm(`从「${project.name}」移除「${card.title}」？卡片会保留在知识库和其他项目中。`))) return
    await mutate(() => api.detachCardFromProject(user, id, card.id), reload)
  }

  if (loading) return <div className="loading">加载中…</div>
  if (error) return <div className="error-box">{error}</div>
  if (!project) return <EmptyState title="项目不存在" description="它可能已经被删除。" action={<Goto className="button secondary" to="/projects">返回 Projects</Goto>} />

  return (
    <div className="page">
      <div className="breadcrumb"><Goto className="breadcrumb-link" to="/projects">PROJECTS</Goto> / {project.name}</div>
      <div className="page-head detail-head">
        <div>
          <h1 className="project-detail-title"><ProjectIcon value={project.icon} /> {project.name}</h1>
          <p className="eyebrow">PERSONAL RESEARCH PROJECT</p>
          <p className="page-sub">{project.description || '还没有写项目说明。'}</p>
        </div>
        <button className="button primary" onClick={() => setPickerOpen(true)}>＋ 从知识库添加卡片</button>
      </div>
      <section className="section">
        <div className="section-head">
          <h2>知识卡片</h2>
          <span className="muted">{projectCards.length} 条资料</span>
        </div>
        {projectCards.length ? (
          <div className="card-list">
            {projectCards.map((card) => (
              <CardRow
                key={card.id}
                card={card}
                projectsById={projectsById}
                tagsById={tagsById}
                onEdit={() => setCardModal(card)}
                onDetach={() => detach(card)}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="这个项目还没有卡片" description="从已有知识卡片中检索并添加到这个项目。" action={<button className="button secondary" onClick={() => setPickerOpen(true)}>检索已有卡片</button>} />
        )}
      </section>
      {pickerOpen && (
        <Modal title="从知识库添加卡片" onClose={() => { setPickerOpen(false); setSelectedCardIds([]); setQuery('') }}>
          <div className="field">
            <label htmlFor="project-card-search">搜索已有卡片</label>
            <input id="project-card-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="按标题搜索…" autoFocus />
          </div>
          {availableCards.length ? (
            <div className="picker-results">
              {availableCards.map((card) => (
                <label key={card.id} className="picker-result">
                  <input type="checkbox" checked={selectedCardIds.includes(card.id)} onChange={() => setSelectedCardIds((prev) => prev.includes(card.id) ? prev.filter((item) => item !== card.id) : [...prev, card.id])} />
                  <span><strong>{card.title}</strong><small>{resourceLabel(card.resource_type)} · {(card.project_ids || []).map((projectId) => projectsById[projectId]?.name).filter(Boolean).join('、') || '未关联项目'}</small></span>
                </label>
              ))}
            </div>
          ) : (
            <EmptyState title={cards.length ? '没有找到可添加的卡片' : '知识库还是空的'} description={cards.length ? '换个关键词试试，或先在 Library 创建卡片。' : '先在 Library 添加资料索引，再回来关联到项目。'} />
          )}
          <div className="form-actions">
            <button className="button secondary" onClick={() => { setPickerOpen(false); setSelectedCardIds([]); setQuery('') }}>取消</button>
            <button className="button primary" onClick={attachSelected} disabled={!selectedCardIds.length}>添加所选（{selectedCardIds.length}）</button>
          </div>
        </Modal>
      )}
      {cardModal && (
        <Modal title="编辑知识卡片" onClose={() => setCardModal(null)}>
          <CardForm
            initial={cardModal}
            projects={projects}
            tags={tags}
            onCancel={() => setCardModal(null)}
            onSubmit={async (form, tagIds) => {
              const changed = await mutate(() => api.saveCard(user, form, tagIds), reload)
              if (changed) setCardModal(null)
            }}
          />
        </Modal>
      )}
    </div>
  )
}

function LibraryPage() {
  const { user } = useAuth()
  const { projects, cards, tags, loading, error, reload } = useData()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [projectId, setProjectId] = useState('')
  const [tagId, setTagId] = useState('')
  const [sortOrder, setSortOrder] = useState('newest')
  const [cardModal, setCardModal] = useState(null)
  const tagsById = useMemo(() => Object.fromEntries(tags.map((tag) => [tag.id, tag])), [tags])
  const projectsById = useMemo(() => Object.fromEntries(projects.map((project) => [project.id, project])), [projects])

  const filtered = cards.filter((card) => {
    const searchText = [card.title, card.description, ...(card.tags || []).map((id) => tagsById[id]?.name || '')]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase()
    if (query.trim() && !searchText.includes(query.trim().toLocaleLowerCase())) return false
    if (type && card.resource_type !== type) return false
    if (projectId && !(card.project_ids || []).includes(projectId)) return false
    if (tagId && !(card.tags || []).includes(tagId)) return false
    return true
  })

  const sortedCards = [...filtered].sort((left, right) => {
    const titleOrder = left.title.localeCompare(right.title, 'zh-Hans-CN', { sensitivity: 'base', numeric: true })
    if (sortOrder === 'title-asc') return titleOrder
    if (sortOrder === 'title-desc') return -titleOrder
    const leftTime = Date.parse(left.created_at || '') || 0
    const rightTime = Date.parse(right.created_at || '') || 0
    return sortOrder === 'oldest' ? leftTime - rightTime : rightTime - leftTime
  })
  const hasFilters = Boolean(query.trim() || type || projectId || tagId)

  const clearFilters = () => {
    setQuery('')
    setType('')
    setProjectId('')
    setTagId('')
  }

  const remove = async (card) => {
    if (!(await askConfirm(`删除卡片「${card.title}」？`))) return
    const changed = await mutate(() => api.deleteCard(user, card.id), reload)
    if (changed) setCardModal(null)
  }

  if (loading) return <div className="loading">加载中…</div>
  if (error) return <div className="error-box">{error}</div>

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">03 / LIBRARY</p>
          <h1>知识库</h1>
          <p className="page-sub">忘记资料放在哪个项目时，从这里把它找回来。</p>
        </div>
        <div className="head-actions">
          <Goto className="button secondary" to="/library/tags">管理标签</Goto>
          <button className="button primary" onClick={() => setCardModal({ mode: 'new' })}>＋ 添加卡片</button>
        </div>
      </div>

      <label className="library-search" htmlFor="library-search-input">
        <Search size={18} strokeWidth={1.8} aria-hidden="true" />
        <input id="library-search-input" className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、描述或标签…" aria-label="搜索标题、描述或标签" />
      </label>

      <div className="filter-bar">
        <Select value={type} onChange={setType} options={[{ value: '', label: '全部类型' }, ...RESOURCE_TYPES]} label="按资源类型筛选" />
        <Select value={projectId} onChange={setProjectId} options={[{ value: '', label: '全部项目' }, ...projects.map((project) => ({ value: project.id, label: project.name }))]} label="按项目筛选" />
        <Select value={tagId} onChange={setTagId} options={[{ value: '', label: '全部标签' }, ...tags.map((tag) => ({ value: tag.id, label: tag.name }))]} label="按标签筛选" />
        <Select value={sortOrder} onChange={setSortOrder} options={CARD_SORT_OPTIONS} label="排序方式" />
        {hasFilters && <button className="text-button" onClick={clearFilters}>清除筛选</button>}
      </div>

      <div className="library-results-count" aria-live="polite">
        {hasFilters ? `找到 ${sortedCards.length} 条 · 共 ${cards.length} 条资源` : `共 ${cards.length} 条资源`}
      </div>

      {sortedCards.length ? (
        <div className="card-list library-list">
          {sortedCards.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              projectsById={projectsById}
              tagsById={tagsById}
              onRowClick={() => setCardModal({ mode: 'edit', card })}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={cards.length ? '没有匹配的资料' : '还没有知识卡片'}
          description={cards.length ? '试试清除筛选条件。' : '在 Notion 或 Drive 整理好资料后，回来登记一条索引入口。'}
          action={cards.length ? <button className="button secondary" onClick={clearFilters}>清除筛选</button> : null}
        />
      )}

      {cardModal && (
        <Modal title={cardModal.mode === 'new' ? '添加知识卡片' : '编辑知识卡片'} onClose={() => setCardModal(null)}>
          <CardForm
            initial={cardModal.card}
            projects={projects}
            tags={tags}
            onCancel={() => setCardModal(null)}
            onSubmit={async (form, tagIds) => {
              const changed = await mutate(() => api.saveCard(user, form, tagIds), reload)
              if (changed) setCardModal(null)
            }}
            onDelete={cardModal.mode === 'edit' ? () => remove(cardModal.card) : undefined}
          />
        </Modal>
      )}
    </div>
  )
}

function TagManagePage() {
  const { user } = useAuth()
  const { tags, loading, error, reload } = useData()
  const [modal, setModal] = useState(null)

  const move = async (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= tags.length) return
    const ordered = tags.map((tag) => tag.id)
    ;[ordered[index], ordered[target]] = [ordered[target], ordered[index]]
    await mutate(() => api.setTagOrder(user, ordered), reload)
  }

  const remove = async (tag) => {
    if (!(await askConfirm(`删除标签「${tag.name}」？关联卡片会保留，仅移除该标签。`))) return
    await mutate(() => api.deleteTag(user, tag.id), reload)
  }

  if (loading) return <div className="loading">加载中…</div>
  if (error) return <div className="error-box">{error}</div>

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <p className="eyebrow">LIBRARY / TAGS</p>
          <h1>标签管理</h1>
          <p className="page-sub">标签是可维护的类别；卡片里只做选择，不在这里写正文。</p>
        </div>
        <button className="button primary" onClick={() => setModal({ mode: 'new' })}>＋ 新建标签</button>
      </div>
      {tags.length ? (
        <div className="tag-table">
          {tags.map((tag, index) => (
            <div key={tag.id} className="tag-table-row">
              <span className={`tag-chip tag-${tag.color}`}>{tag.name}</span>
              <span className="muted small">{TAG_COLORS.find((item) => item.value === tag.color)?.label || tag.color}</span>
              <span className="row-actions">
                <button className="icon-button" onClick={() => move(index, -1)} aria-label="上移">↑</button>
                <button className="icon-button" onClick={() => move(index, 1)} aria-label="下移">↓</button>
                <button className="text-button" onClick={() => setModal({ mode: 'edit', tag })}>编辑</button>
                <button className="text-button danger" onClick={() => remove(tag)}>删除</button>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="还没有标签类别" description="先建几个类别，维护卡片时就可以直接选择了。" action={<button className="button primary" onClick={() => setModal({ mode: 'new' })}>新建标签</button>} />
      )}
      <div className="back-link"><Goto to="/library">← 返回 Library</Goto></div>
      {modal && (
        <Modal title={modal.mode === 'new' ? '新建标签' : '编辑标签'} onClose={() => setModal(null)}>
          <TagForm
            initial={modal.tag}
            onCancel={() => setModal(null)}
            onSubmit={async (form) => {
              const changed = await mutate(() => api.saveTag(user, form), reload)
              if (changed) setModal(null)
            }}
          />
        </Modal>
      )}
    </div>
  )
}

function LoginPage() {
  const { user, signInWithPassword, notice, setNotice } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  if (demoMode || user) return <Navigate to="/" replace />

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setNotice('')
    const { error } = await signInWithPassword(email.trim(), password.trim())
    setBusy(false)
    if (error) setNotice(error.message)
    else {
      setPassword('')
      setEmail('')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <p className="eyebrow">PERSONAL GARDEN</p>
        <h1>欢迎回来</h1>
        <p className="page-sub">输入账号与密码。个人站点不开放注册。</p>
        <form onSubmit={submit}>
          <label className="field">
            <span>邮箱</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus autoComplete="username" placeholder="you@example.com" />
          </label>
          <label className="field">
            <span>密码</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
          </label>
          {notice && <p className="form-error">{notice}</p>}
          <button className="button primary full" disabled={busy || !email.trim()}>{busy ? '登录中…' : '登录'}</button>
        </form>
      </div>
    </div>
  )
}

function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">加载中…</div>
  if (!user) return <Navigate to="/login" replace />
  return (
    <DataProvider>
      <AppShell />
    </DataProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/projects/:id" element={<ProjectDetailPage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/library/tags" element={<TagManagePage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
