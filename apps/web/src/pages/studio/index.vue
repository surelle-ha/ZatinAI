<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { useSessionStore } from '~/stores/session'
import { useWorkspaceStore } from '~/stores/workspace'
import { useModelStore } from '~/stores/models'

const md = new MarkdownIt({ html: false, linkify: true, typographer: true, breaks: true })
const sessionStore = useSessionStore()
const workspaceStore = useWorkspaceStore()
const modelStore = useModelStore()
const config = useRuntimeConfig()

// ─── Types ────────────────────────────────────────────────────────────────────

interface MessagePart {
  type: 'text' | 'thinking' | 'system-notice'
  text: string
}
interface Message {
  id: string
  role: 'user' | 'assistant' | 'system-notice'
  parts: MessagePart[]
  createdAt: number
}
interface ChatSession {
  id: number | string
  title: string
  messages: Message[]
  createdAt: number
  pendingForm: PendingForm | null   // currently shown form
  pendingForms: PendingForm[]         // queue of all forms from last response
  pendingAnswers: string[]            // collected answers while stepping through queue
}
interface ScriptFile {
  id: number | string
  name: string
  content: string
  sortOrder: number
  isBootstrap: boolean
  immutable?: boolean   // if true: shown locked in UI, included in system prompt, not editable
}
interface Agent {
  id: number
  name: string
  model: string
  isEnabled: boolean
  files: ScriptFile[]
  sessions: ChatSession[]
  activeSessionId: number | string | null
}

// ─── Available Models ─────────────────────────────────────────────────────────

// ─── internal.md — immutable system-level instruction file ───────────────────
// Always prepended to every agent's system prompt.
// Teaches the model how to emit interactive HTML forms instead of asking questions in plain text.
// The frontend parses <@@@START@@@>...<@@@END@@@> blocks, renders them above the input bar,
// and auto-sends the user's selection as a message.

const INTERNAL_FILE = reactive<ScriptFile>({
  id: '__internal__',
  name: 'internal.md',
  content: `# Internal System Instructions

These rules are mandatory and override all other instructions.

## Interactive Forms

Whenever you need to ask the user a question that involves a choice, selection, or structured input, you MUST render an HTML form instead of asking in plain text.

### Wrapping rules
- Wrap the HTML block with EXACTLY these delimiters on their own lines:
<@@@START@@@>
...your HTML here...
<@@@END@@@>
- Do NOT put anything else on the delimiter lines.
- Do NOT use <script> tags inside the form.
- Use only inline styles — no external CSS or JS.
- You may write text before or after the delimiters as normal.

### Form rules
- The <form> element must have a descriptive data-question attribute.
- For yes/no or choices: use <button type="submit" value="..."> buttons.
- For free text: use <input type="text" name="answer"> with a submit button.
- For single-select: use <input type="radio"> inputs with a submit button.
- Keep the design clean and minimal with inline styles.

### Button style rules
- Choice/yes-no buttons: style="padding:5px 14px;border-radius:8px;border:1px solid var(--color-primary-400);background:var(--color-primary-50);color:var(--color-primary-700);cursor:pointer;font-size:13px;font-weight:500"
- Submit button: style="padding:5px 14px;border-radius:8px;border:none;background:var(--color-primary-500);color:#fff;cursor:pointer;font-size:13px;font-weight:500"
- Text input: style="padding:5px 12px;border-radius:8px;border:1px solid var(--color-primary-200);font-size:13px;flex:1;min-width:0;outline:none"

### Examples

Yes/No:
<@@@START@@@>
<form data-question="Would you like me to continue?" style="display:flex;gap:8px;padding:2px 0">
  <button type="submit" value="Yes" style="padding:5px 14px;border-radius:8px;border:1px solid var(--color-primary-400);background:var(--color-primary-50);color:var(--color-primary-700);cursor:pointer;font-size:13px;font-weight:500">Yes</button>
  <button type="submit" value="No" style="padding:5px 14px;border-radius:8px;border:1px solid var(--color-primary-400);background:var(--color-primary-50);color:var(--color-primary-700);cursor:pointer;font-size:13px;font-weight:500">No</button>
</form>
<@@@END@@@>

Multiple choice:
<@@@START@@@>
<form data-question="Which tone do you prefer?" style="display:flex;gap:8px;flex-wrap:wrap;padding:2px 0">
  <button type="submit" value="Formal" style="padding:5px 14px;border-radius:8px;border:1px solid var(--color-primary-400);background:var(--color-primary-50);color:var(--color-primary-700);cursor:pointer;font-size:13px;font-weight:500">Formal</button>
  <button type="submit" value="Casual" style="padding:5px 14px;border-radius:8px;border:1px solid var(--color-primary-400);background:var(--color-primary-50);color:var(--color-primary-700);cursor:pointer;font-size:13px;font-weight:500">Casual</button>
  <button type="submit" value="Technical" style="padding:5px 14px;border-radius:8px;border:1px solid var(--color-primary-400);background:var(--color-primary-50);color:var(--color-primary-700);cursor:pointer;font-size:13px;font-weight:500">Technical</button>
</form>
<@@@END@@@>

Text input:
<@@@START@@@>
<form data-question="What is your project name?" style="display:flex;gap:8px;align-items:center;padding:2px 0">
  <input type="text" name="answer" placeholder="Type here..." style="padding:5px 12px;border-radius:8px;border:1px solid var(--color-primary-200);font-size:13px;flex:1;min-width:0;outline:none" />
  <button type="submit" style="padding:5px 14px;border-radius:8px;border:none;background:var(--color-primary-500);color:#fff;cursor:pointer;font-size:13px;font-weight:500;white-space:nowrap">Submit</button>
</form>
<@@@END@@@>`,
  sortOrder: -1,
  isBootstrap: false,
  immutable: false,
})

// ─── API helpers ──────────────────────────────────────────────────────────────

function apiHeaders(withBody = false): Record<string, string> {
  const headers: Record<string, string> = {}
  if (withBody) headers['Content-Type'] = 'application/json'
  if (sessionStore.accessToken)
    headers['Authorization'] = `Bearer ${sessionStore.accessToken}`
  if (workspaceStore.activeWorkspaceId)
    headers['x-workspace-id'] = String(workspaceStore.activeWorkspaceId)
  return headers
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = config.public.apiBase as string
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: { ...apiHeaders(!!options.body), ...(options.headers as Record<string, string> ?? {}) },
  })
  if (res.status === 401) {
    const refreshed = await sessionStore.refresh()
    if (!refreshed) { navigateTo('/auth/sign-in'); throw new Error('Unauthorized') }
    const retry = await fetch(`${base}${path}`, {
      ...options,
      headers: { ...apiHeaders(!!options.body), ...(options.headers as Record<string, string> ?? {}) },
    })
    if (!retry.ok) throw new Error(`API error ${retry.status}`)
    if (retry.status === 204) return undefined as T
    return retry.json()
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message ?? `API error ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// ─── Agent API ────────────────────────────────────────────────────────────────

const apiFetchAgents = () => apiFetch<Agent[]>('/api/v1/agents')
const apiCreateAgent = (payload: { name: string; model: string }) =>
  apiFetch<Agent>('/api/v1/agents', { method: 'POST', body: JSON.stringify(payload) })
const apiUpdateAgent = (id: number, payload: Partial<{ name: string; model: string; isEnabled: boolean }>) =>
  apiFetch<Agent>(`/api/v1/agents/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
const apiDeleteAgent = (id: number) =>
  apiFetch<void>(`/api/v1/agents/${id}`, { method: 'DELETE' })

// ─── ScriptFile API ───────────────────────────────────────────────────────────

const apiFetchFiles = (agentId: number) =>
  apiFetch<ScriptFile[]>(`/api/v1/agents/${agentId}/files`)
const apiCreateFile = (agentId: number, payload: { name: string; content: string; sortOrder: number; isBootstrap: boolean }) =>
  apiFetch<ScriptFile>(`/api/v1/agents/${agentId}/files`, { method: 'POST', body: JSON.stringify(payload) })
const apiUpdateFile = (agentId: number, fileId: number, payload: Partial<{ name: string; content: string; sortOrder: number; isBootstrap: boolean }>) =>
  apiFetch<ScriptFile>(`/api/v1/agents/${agentId}/files/${fileId}`, { method: 'PATCH', body: JSON.stringify(payload) })
const apiDeleteFile = (agentId: number, fileId: number) =>
  apiFetch<void>(`/api/v1/agents/${agentId}/files/${fileId}`, { method: 'DELETE' })
const apiReorderFiles = (agentId: number, files: { id: number; sortOrder: number }[]) =>
  apiFetch<ScriptFile[]>(`/api/v1/agents/${agentId}/files/reorder`, { method: 'PUT', body: JSON.stringify({ files }) })

// ─── Loading state ────────────────────────────────────────────────────────────

const agentsLoading = ref(true)
const agentsError = ref<string | null>(null)

// ─── Agent helpers ────────────────────────────────────────────────────────────

function makeLocalSession(): ChatSession {
  return { id: crypto.randomUUID(), title: 'New Chat', messages: [], createdAt: Date.now(), pendingForm: null, pendingForms: [], pendingAnswers: [] }
}

function hydrateAgent(raw: Agent): Agent {
  const session = makeLocalSession()
  return {
    ...raw,
    // Filter out internal.md — it is managed client-side only, never persisted
    files: (raw.files ?? []).filter(f => f.name !== 'internal.md'),
    sessions: [session],
    activeSessionId: session.id,
  }
}

// ─── Agents state ─────────────────────────────────────────────────────────────

const agents = ref<Agent[]>([])
const activeAgentId = ref<number | null>(null)
const activeAgent = computed(() => agents.value.find(a => a.id === activeAgentId.value) ?? null)

async function loadAgents() {
  agentsLoading.value = true
  agentsError.value = null
  try {
    const raw = await apiFetchAgents()
    agents.value = raw.map(hydrateAgent)
    if (agents.value.length) activeAgentId.value = agents.value[0].id

    // Check if marketplace queued an agent for auto-import
    const pending = sessionStorage.getItem('marketplace:import')
    if (pending) {
      sessionStorage.removeItem('marketplace:import')
      try {
        await importAgentFromExport(JSON.parse(pending))
      } catch (e) {
        console.error('Auto-import from marketplace failed', e)
      }
    }
  } catch (e: any) {
    agentsError.value = e.message
  } finally {
    agentsLoading.value = false
  }
}

/**
 * Shared import logic used by both the file-picker import and marketplace auto-import.
 */
async function importAgentFromExport(parsed: any) {
  if (parsed.version !== 1 || !parsed.agent?.name || !Array.isArray(parsed.agent.files)) {
    throw new Error('Invalid agent export file')
  }

  const { name, model, files } = parsed.agent

  // Ensure unique name
  const existingNames = agents.value.map(a => a.name)
  let importName = name
  if (existingNames.includes(importName)) {
    let i = 2
    while (existingNames.includes(`${name} (${i})`)) i++
    importName = `${name} (${i})`
  }

  const created = await apiCreateAgent({ name: importName, model })
  const hydrated = hydrateAgent(created)

  const seeded: any[] = created.files ?? []
  const importedFiles: ScriptFile[] = []

  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    if (i < seeded.length) {
      const updated = await apiUpdateFile(created.id, seeded[i].id, {
        name: f.name, content: f.content, sortOrder: f.sortOrder, isBootstrap: f.isBootstrap,
      })
      importedFiles.push(updated)
    } else {
      const extra = await apiCreateFile(created.id, {
        name: f.name, content: f.content, sortOrder: f.sortOrder, isBootstrap: f.isBootstrap,
      })
      importedFiles.push(extra)
    }
  }

  for (let i = files.length; i < seeded.length; i++) {
    await apiDeleteFile(created.id, seeded[i].id).catch(() => {})
  }

  hydrated.files = importedFiles
  agents.value.push(hydrated)
  switchAgent(created.id)
}

function switchAgent(id: number) {
  activeAgentId.value = id
  dirtyFiles.value.clear()
  if (activeAgent.value) appliedSnapshot.value = buildSystemPrompt()
}

// ─── Agent CRUD ───────────────────────────────────────────────────────────────

const showAgentModal = ref(false)
const editingAgent = ref<Agent | null>(null)
const agentForm = ref({ name: '', model: modelStore.defaultModel })
const agentSaving = ref(false)

function openNewAgent() {
  editingAgent.value = null
  agentForm.value = { name: '', model: modelStore.defaultModel }
  showAgentModal.value = true
}

function openEditAgent(agent: Agent) {
  editingAgent.value = agent
  agentForm.value = { name: agent.name, model: agent.model }
  showAgentModal.value = true
}

async function saveAgentForm() {
  if (!agentForm.value.name.trim() || agentSaving.value) return
  agentSaving.value = true
  try {
    if (editingAgent.value) {
      const updated = await apiUpdateAgent(editingAgent.value.id, {
        name: agentForm.value.name,
        model: agentForm.value.model,
      })
      const local = agents.value.find(a => a.id === updated.id)
      if (local) { local.name = updated.name; local.model = updated.model }
    } else {
      const created = await apiCreateAgent({ name: agentForm.value.name, model: agentForm.value.model })
      agents.value.push(hydrateAgent(created))
      switchAgent(created.id)
    }
    showAgentModal.value = false
  } catch (e: any) {
    console.error('Failed to save agent', e)
  } finally {
    agentSaving.value = false
  }
}

async function deleteActiveAgent() {
  if (!editingAgent.value || agents.value.length === 1) return
  agentSaving.value = true
  const targetId = editingAgent.value.id
  try {
    await apiDeleteAgent(targetId)
    const remainingAgents = agents.value.filter(a => a.id !== targetId)
    agents.value = remainingAgents
    // Only switch active agent if we deleted the currently active one
    if (activeAgentId.value === targetId) {
      activeAgentId.value = remainingAgents[0].id
      dirtyFiles.value.clear()
      pendingForm.value = null
      appliedSnapshot.value = buildSystemPrompt()
    }
    showAgentModal.value = false
  } catch (e: any) {
    console.error('Failed to delete agent', e)
  } finally {
    agentSaving.value = false
  }
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

const activeSession = computed(() => {
  if (!activeAgent.value) return null
  return activeAgent.value.sessions.find(s => s.id === activeAgent.value!.activeSessionId) ?? null
})

const messages = computed({
  get: () => activeSession.value?.messages ?? [],
  set: val => { if (activeSession.value) activeSession.value.messages = val },
})

function createSession() {
  if (!activeAgent.value) return
  const s = makeLocalSession()
  activeAgent.value.sessions.unshift(s)
  activeAgent.value.activeSessionId = s.id
}

function deleteSession(agentId: number, sessionId: string | number) {
  const agent = agents.value.find(a => a.id === agentId)
  if (!agent) return
  if (agent.sessions.length === 1) {
    const s = makeLocalSession()
    agent.sessions = [s]
    agent.activeSessionId = s.id
    return
  }
  const idx = agent.sessions.findIndex(s => s.id === sessionId)
  agent.sessions.splice(idx, 1)
  if (agent.activeSessionId === sessionId) {
    agent.activeSessionId = agent.sessions[0].id
  }
}

function updateSessionTitle(text: string) {
  if (!activeSession.value) return
  if (activeSession.value.messages.filter(m => m.role === 'user').length === 0)
    activeSession.value.title = text.slice(0, 30) + (text.length > 30 ? '…' : '')
}

function formatTime(ts: number) {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ─── Script files ─────────────────────────────────────────────────────────────

// User-editable files only (excludes immutable internal.md)
const editableFiles = computed(() => activeAgent.value?.files ?? [])

const activeFileId = ref<string | number | null>(null)
const dirtyFiles = ref<Set<string | number>>(new Set())

watch(activeAgentId, () => {
  activeFileId.value = editableFiles.value[0]?.id ?? null
  dirtyFiles.value.clear()
  if (activeAgent.value) appliedSnapshot.value = buildSystemPrompt()
})

const activeFile = computed(() => {
  if (activeFileId.value === '__internal__') return INTERNAL_FILE
  return editableFiles.value.find(f => f.id === activeFileId.value) ?? editableFiles.value[0] ?? null
})

watch(
  () => activeAgent.value?.files.map(f => f.content),
  (n, o) => activeAgent.value?.files.forEach((f, i) => { if (n?.[i] !== o?.[i]) dirtyFiles.value.add(f.id) }),
  { deep: true }
)

const editingFileId = ref<string | number | null>(null)
const editingFileName = ref('')

function startRenaming(file: ScriptFile) {
  editingFileId.value = file.id
  editingFileName.value = file.name
}

async function commitRename() {
  if (!editingFileId.value || !activeAgent.value) return
  const file = activeAgent.value.files.find(f => f.id === editingFileId.value)
  const prevName = file?.name
  editingFileId.value = null

  if (!file || !editingFileName.value.trim()) return
  let n = editingFileName.value.trim()
  if (!n.endsWith('.md')) n += '.md'
  if (n === prevName) return

  // Optimistic
  file.name = n
  syncBootstrapFileList()

  try {
    await apiUpdateFile(activeAgent.value.id, file.id as number, { name: n })
  } catch (e: any) {
    // Rollback
    file.name = prevName!
    syncBootstrapFileList()
    console.error('Failed to rename file', e)
  }
}

async function addFile() {
  if (!activeAgent.value) return
  const names = activeAgent.value.files.map(f => f.name)
  let name = 'untitled.md'; let i = 1
  while (names.includes(name)) name = `untitled-${i++}.md`

  // Optimistic local insert with a temp id
  const tempId = crypto.randomUUID()
  const optimistic: ScriptFile = { id: tempId as any, name, content: `# ${name.replace('.md', '')}\n\n`, sortOrder: activeAgent.value.files.length, isBootstrap: false }
  activeAgent.value.files.push(optimistic)
  activeFileId.value = tempId as any
  nextTick(() => startRenaming(optimistic))

  try {
    const created = await apiCreateFile(activeAgent.value.id, {
      name: optimistic.name,
      content: optimistic.content,
      sortOrder: optimistic.sortOrder,
      isBootstrap: false,
    })
    // Replace temp entry with real server record
    const idx = activeAgent.value.files.findIndex(f => f.id === (tempId as any))
    if (idx !== -1) activeAgent.value.files.splice(idx, 1, created)
    activeFileId.value = created.id
    syncBootstrapFileList()
  } catch (e: any) {
    // Rollback optimistic insert
    activeAgent.value.files = activeAgent.value.files.filter(f => f.id !== (tempId as any))
    activeFileId.value = activeAgent.value.files[0]?.id ?? null
    console.error('Failed to create file', e)
  }
}

async function deleteFile(id: string | number) {
  if (id === '__internal__' || !activeAgent.value || editableFiles.value.length <= 1) return

  // Optimistic removal
  const agent = activeAgent.value
  const idx = agent.files.findIndex(f => f.id === id)
  const removed = agent.files[idx]
  agent.files.splice(idx, 1)
  if (activeFileId.value === id) activeFileId.value = editableFiles.value[0]?.id ?? null
  dirtyFiles.value.delete(id)
  syncBootstrapFileList()

  try {
    await apiDeleteFile(agent.id, id as number)
  } catch (e: any) {
    // Rollback
    agent.files.splice(idx, 0, removed)
    console.error('Failed to delete file', e)
  }
}

function syncBootstrapFileList() {
  if (!activeAgent.value) return
  const boot = activeAgent.value.files.find(f => f.isBootstrap || f.name === 'bootstrap.md')
  if (!boot) return
  const siblings = activeAgent.value.files.filter(f => f.id !== boot.id).map(f => f.name)
  const fileList = siblings.map(f => `- \`${f}\``).join('\n')
  boot.content = boot.content.replace(
    /(Before responding.*?:\n\n)([\s\S]*?)(\n\nEach file)/,
    `$1${fileList}$3`
  )
  dirtyFiles.value.add(boot.id)
}

// System prompt: INTERNAL_FILE always first, then bootstrap, then rest
function buildSystemPrompt(): string {
  if (!activeAgent.value) return ''
  const userFiles = [...activeAgent.value.files].sort((a, b) => {
    if (a.isBootstrap) return -1
    if (b.isBootstrap) return 1
    return a.sortOrder - b.sortOrder
  })
  return [INTERNAL_FILE, ...userFiles]
    .filter(f => f.content.trim())
    .map(f => `=== ${f.name} ===\n${f.content.trim()}`)
    .join('\n\n')
}

const appliedSnapshot = ref('')
const hasUnapplied = computed(() => !!activeAgent.value && (dirtyFiles.value.size > 0 || buildSystemPrompt() !== appliedSnapshot.value))

async function applyScript() {
  if (!activeAgent.value) return
  const agent = activeAgent.value
  const prev = appliedSnapshot.value
  appliedSnapshot.value = buildSystemPrompt()

  // Save all dirty files to the API in parallel
  const dirtyIds = [...dirtyFiles.value]
  dirtyFiles.value.clear()

  const saves = dirtyIds
    .map(id => agent.files.find(f => f.id === id))
    .filter(Boolean)
    .map(f => apiUpdateFile(agent.id, f!.id as number, { content: f!.content, name: f!.name, sortOrder: f!.sortOrder }))

  try {
    await Promise.all(saves)
  } catch (e: any) {
    console.error('Failed to save some files', e)
    // Re-mark as dirty so user can retry
    dirtyIds.forEach(id => dirtyFiles.value.add(id))
    appliedSnapshot.value = prev
    return
  }

  if (prev !== appliedSnapshot.value && messages.value.length > 0) {
    messages.value.push({
      id: crypto.randomUUID(),
      role: 'system-notice',
      parts: [{ type: 'system-notice', text: `Agent "${agent.name}" instructions updated` }],
      createdAt: Date.now(),
    })
  }
}

// ─── Interactive form parsing ─────────────────────────────────────────────────

const FORM_START = '<@@@START@@@>'
const FORM_END = '<@@@END@@@>'

interface PendingForm {
  html: string
  question: string
}

// pendingForm lives on the active session — survives agent/session switching
const pendingForm = computed<PendingForm | null>({
  get: () => activeSession.value?.pendingForm ?? null,
  set: (val) => { if (activeSession.value) activeSession.value.pendingForm = val },
})

/**
 * Extract ALL form blocks from a raw text string.
 * Returns array of { html, question } for every complete <@@@START@@@>...<@@@END@@@> block.
 */
function extractFormBlocks(raw: string): PendingForm[] {
  const results: PendingForm[] = []
  let search = raw
  while (true) {
    const start = search.indexOf(FORM_START)
    if (start === -1) break
    const end = search.indexOf(FORM_END, start)
    if (end === -1) break  // incomplete block — stop (still streaming)
    const html = search.slice(start + FORM_START.length, end).trim()
    const questionMatch = html.match(/data-question="([^"]*)"/)
    results.push({ html, question: questionMatch?.[1] ?? 'Please select an option' })
    search = search.slice(end + FORM_END.length)
  }
  return results
}

/**
 * After streaming completes, scan the last assistant message for ALL form blocks
 * and queue them on the session. The first unanswered one is shown at a time.
 */
function detectPendingForm() {
  const lastAssistant = [...messages.value].reverse().find(m => m.role === 'assistant')
  if (!lastAssistant) { pendingForm.value = null; return }
  const textPart = lastAssistant.parts.find(p => p.type === 'text')
  if (!textPart?.text) { pendingForm.value = null; return }

  const blocks = extractFormBlocks(textPart.text)
  if (!blocks.length) { pendingForm.value = null; return }

  // Store all blocks on the session; show the first one
  if (activeSession.value) {
    activeSession.value.pendingForms = blocks
    activeSession.value.pendingForm = blocks[0]
  }
}

/**
 * Strip ALL complete <@@@START@@@>...<@@@END@@@> blocks from text before rendering.
 * During streaming, hide from the first START to end-of-string if END not yet received.
 */
function stripFormBlock(raw: string): string {
  // Find first START
  const firstStart = raw.indexOf(FORM_START)
  if (firstStart === -1) return raw

  let result = raw.slice(0, firstStart).trim()
  let search = raw.slice(firstStart)

  while (true) {
    const start = search.indexOf(FORM_START)
    if (start === -1) break
    const end = search.indexOf(FORM_END, start)
    if (end === -1) {
      // Incomplete block — hide rest (still streaming)
      break
    }
    // Skip this block, collect text after it
    const after = search.slice(end + FORM_END.length)
    // Check if more text (non-form) follows before the next block
    const nextStart = after.indexOf(FORM_START)
    const textAfter = nextStart === -1 ? after.trim() : after.slice(0, nextStart).trim()
    if (textAfter) result = result ? result + '\n\n' + textAfter : textAfter
    search = after
  }

  return result
}

/**
 * Handle form submission — read the selected/entered value and send it as a user message.
 */
function handleFormSubmit(event: Event) {
  event.preventDefault()
  event.stopPropagation()

  const form = event.target as HTMLFormElement
  const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null

  let answer = ''
  if (submitter?.value) {
    // Button-based (choices, yes/no)
    answer = submitter.value
  } else {
    // Input/textarea based
    const data = new FormData(form)
    const values: string[] = []
    data.forEach(v => { if (v) values.push(v.toString()) })
    answer = values.join(', ')
  }

  if (!answer.trim()) return

  const session = activeSession.value
  if (!session) return

  const forms = session.pendingForms ?? []
  const currentIdx = forms.findIndex(f => f.html === (session.pendingForm?.html ?? ''))
  const next = forms[currentIdx + 1] ?? null

  // Collect this answer
  session.pendingAnswers = [...(session.pendingAnswers ?? []), answer]

  if (next) {
    // More questions remain — just advance the card, don't send yet
    session.pendingForm = next
  } else {
    // All questions answered — send all answers as one message
    const allAnswers = session.pendingAnswers
    session.pendingForm = null
    session.pendingForms = []
    session.pendingAnswers = []
    const combined = allAnswers.length === 1
      ? allAnswers[0]
      : allAnswers.map((a, i) => `Q${i + 1}: ${a}`).join('\n')
    input.value = combined
    sendMessage()
  }
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

const input = ref('')
const status = ref<'idle' | 'submitted' | 'streaming' | 'ready'>('ready')
const buildingForm = ref(false)  // true from when START token seen until pendingForm is set
const expandedThinking = ref<Set<string>>(new Set())
const expandedTimestamps = ref<Set<string>>(new Set())

function toggleTimestamp(id: string) {
  expandedTimestamps.value.has(id) ? expandedTimestamps.value.delete(id) : expandedTimestamps.value.add(id)
}

function formatMessageTime(ts: number | undefined): string {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
}
const messagesEndRef = ref<HTMLDivElement | null>(null)
const scriptPanelOpen = ref(true)
const sessionPanelOpen = ref(true)

function toggleThinking(id: string) {
  expandedThinking.value.has(id) ? expandedThinking.value.delete(id) : expandedThinking.value.add(id)
}
function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
  nextTick(() => messagesEndRef.value?.scrollIntoView({ behavior, block: 'end' }))
}

watch(messages, () => scrollToBottom(), { deep: true })
watch([activeAgentId, () => activeAgent.value?.activeSessionId], () => {
  nextTick(() => scrollToBottom('instant'))
  // Don't clear pendingForm here — it lives on the session and restores automatically
})

watch(
  () => workspaceStore.activeWorkspaceId,
  async (id) => {
    if (id !== null) {
      await Promise.all([loadAgents(), modelStore.fetchModels()])
      scrollToBottom('instant')
    }
  },
  { immediate: true, once: true }
)

async function sendMessage() {
  const text = input.value.trim()
  if (!text || status.value === 'streaming' || !activeAgent.value) return

  if (activeSession.value) {
    activeSession.value.pendingForm = null
    activeSession.value.pendingAnswers = []
  }
  updateSessionTitle(text)
  messages.value.push({ id: crypto.randomUUID(), role: 'user', parts: [{ type: 'text', text }], createdAt: Date.now() })
  input.value = ''
  status.value = 'submitted'
  scrollToBottom()

  const assistantId = crypto.randomUUID()
  messages.value.push({ id: assistantId, role: 'assistant', parts: [{ type: 'thinking', text: '' }, { type: 'text', text: '' }], createdAt: Date.now() })

  try {
    const history = messages.value
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(0, -1)
      .map(m => ({ role: m.role, content: m.parts.filter(p => p.type === 'text').map(p => p.text).join('') }))

    const allMessages = appliedSnapshot.value.trim()
      ? [{ role: 'system', content: appliedSnapshot.value }, ...history]
      : history

    // Resolve host and auth token from model store config
    const modelConfig = modelStore.models.find(m => m.value === activeAgent.value.model)
    const host = modelConfig?.hostUrl?.replace(/\/$/, '') ?? 'http://localhost:11434'
    const inferenceHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
    if (modelConfig?.platform === 'third-party' && modelConfig?.apiToken) {
      inferenceHeaders['Authorization'] = `Bearer ${modelConfig.apiToken}`
    }

    const response = await fetch(`${host}/api/chat`, {
      method: 'POST',
      headers: inferenceHeaders,
      body: JSON.stringify({ model: activeAgent.value.model, stream: true, messages: allMessages }),
    })

    if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`)
    if (!response.body) throw new Error('No response body')

    status.value = 'streaming'
    expandedThinking.value.add(assistantId)

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n').filter(Boolean)) {
        try {
          const json = JSON.parse(line)
          const msg = messages.value.find(m => m.id === assistantId)
          if (!msg) continue
          if (json.message?.thinking) { const p = msg.parts.find(p => p.type === 'thinking'); if (p) p.text += json.message.thinking }
          if (json.message?.content) {
            const p = msg.parts.find(p => p.type === 'text')
            if (p) {
              p.text += json.message.content
              // Track when form block starts building so we can show indicator until it renders
              if (p.text.includes(FORM_START)) buildingForm.value = true
            }
          }
        } catch {}
      }
    }

    expandedThinking.value.delete(assistantId)
    detectPendingForm()   // sets pendingForm on the session
    // Wait for Vue to flush pendingForm into the DOM before hiding the building indicator
    // so there is zero gap between the loader and the form card appearing
    await nextTick()
    buildingForm.value = false
  } catch (err) {
    buildingForm.value = false
    const p = messages.value[messages.value.length - 1]?.parts.find(p => p.type === 'text')
    if (p) p.text = `**Error:** Could not reach Ollama. Make sure the model is running.`
    console.error(err)
  } finally {
    status.value = 'ready'
    scrollToBottom()
  }
}

function handleSubmit(event: Event) {
  const inputEl = (event.target as HTMLFormElement)?.querySelector('input, textarea') as HTMLInputElement | null
  if (inputEl?.value) input.value = inputEl.value
  sendMessage()
}

// ─── Markdown rendering ───────────────────────────────────────────────────────

function renderMarkdown(raw: string): string {
  return md.render(stripFormBlock(raw))
}

/**
 * Returns true if the rendered output has visible text content.
 * Used to decide whether to show the streaming indicator vs the prose div.
 * Handles the case where text is non-empty but entirely consumed by a form block.
 */
function visibleText(raw: string): boolean {
  return !!renderMarkdown(raw).replace(/<[^>]*>/g, '').trim()
}

// ─── Import / Export ──────────────────────────────────────────────────────────

interface AgentExport {
  version: 1
  exportedAt: string
  agent: {
    name: string
    model: string
    files: { name: string; content: string; sortOrder: number; isBootstrap: boolean }[]
  }
}

function exportAgent(agent: Agent) {
  const payload: AgentExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    agent: {
      name: agent.name,
      model: agent.model,
      files: agent.files.map(f => ({
        name: f.name,
        content: f.content,
        sortOrder: f.sortOrder,
        isBootstrap: f.isBootstrap,
      })),
    },
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${agent.name.toLowerCase().replace(/\s+/g, '-')}-agent.json`
  a.click()
  URL.revokeObjectURL(url)
}

const importError = ref<string | null>(null)
const importing = ref(false)
const importInputRef = ref<HTMLInputElement | null>(null)

function triggerImport() {
  importError.value = null
  importInputRef.value?.click()
}

async function handleImportFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
    // Reset input so same file can be re-imported
    ;(event.target as HTMLInputElement).value = ''

  importing.value = true
  importError.value = null

  try {
    const text = await file.text()
    const parsed: AgentExport = JSON.parse(text)
    await importAgentFromExport(parsed)
  } catch (e: any) {
    importError.value = e.message ?? 'Import failed'
    console.error('Import failed', e)
  } finally {
    importing.value = false
  }
}

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES = [
  { label: 'Concise', content: '# Concise\n\nBe very concise. Answer in 1-3 sentences max.' },
  { label: 'Socratic', content: '# Socratic\n\nUse the Socratic method. Guide through questions.' },
  { label: 'ELI5', content: '# ELI5\n\nExplain as if to a 5-year-old. Simple words only.' },
  { label: 'Expert', content: '# Expert\n\nBe highly technical. Assume advanced domain knowledge.' },
]

const vFocus = { mounted: (el: HTMLElement) => nextTick(() => el.focus()) }
</script>

<template>
  <UDashboardPanel id="chat-panel">
    <template #header>
      <UDashboardNavbar title="Agent Studio">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #trailing>
          <div class="flex items-center gap-1">
            <UButton icon="i-lucide-square-pen" variant="ghost" color="neutral" size="sm" title="New chat" @click="createSession" />
            <UButton :icon="sessionPanelOpen ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left-open'" variant="ghost" color="neutral" size="sm" @click="sessionPanelOpen = !sessionPanelOpen" />
            <UButton :icon="scriptPanelOpen ? 'i-lucide-panel-right-close' : 'i-lucide-panel-right-open'" variant="ghost" color="neutral" size="sm" @click="scriptPanelOpen = !scriptPanelOpen" />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex h-full min-h-0">

        <!-- ═══ LEFT PANEL ═══ -->
        <Transition enter-active-class="transition-all duration-250 ease-out" enter-from-class="opacity-0 -translate-x-2" enter-to-class="opacity-100 translate-x-0" leave-active-class="transition-all duration-200 ease-in" leave-from-class="opacity-100 translate-x-0" leave-to-class="opacity-0 -translate-x-2">
          <div v-if="sessionPanelOpen" class="w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full min-h-0 overflow-hidden">
            <div class="shrink-0 border-b border-gray-200 dark:border-gray-800">
              <div class="flex items-center justify-between px-4 py-3">
                <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Agents</span>
                <div class="flex items-center gap-1">
                  <UButton icon="i-lucide-upload" size="xs" variant="ghost" color="neutral" title="Import agent" :loading="importing" @click="triggerImport" />
                  <UButton icon="i-lucide-plus" size="xs" variant="ghost" color="primary" @click="openNewAgent" />
                </div>
              </div>
              <div v-if="agentsLoading" class="px-4 pb-4 flex items-center gap-2 text-xs text-gray-400">
                <UIcon name="i-lucide-loader" class="w-3.5 h-3.5 animate-spin" /> Loading agents...
              </div>
              <div v-else-if="agentsError" class="px-4 pb-3">
                <p class="text-xs text-red-500">{{ agentsError }}</p>
                <UButton size="xs" variant="ghost" color="primary" label="Retry" class="mt-1" @click="loadAgents" />
              </div>
              <div v-else class="pb-2 space-y-0.5 px-2">
                <button
                  v-for="agent in agents" :key="agent.id"
                  class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left group transition-colors"
                  :class="agent.id === activeAgentId ? 'bg-primary/10 dark:bg-primary/15 text-primary' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
                  @click="switchAgent(agent.id)"
                >
                  <div class="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" :class="agent.id === activeAgentId ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'">
                    {{ agent.name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium truncate leading-tight">{{ agent.name }}</p>
                    <p class="text-[11px] opacity-50 font-mono truncate leading-tight mt-0.5">{{ agent.model.split(':')[0] }}</p>
                  </div>
                  <span class="text-[10px] opacity-40 shrink-0 font-medium">{{ agent.sessions.length }}</span>
                  <UButton icon="i-lucide-download" size="xs" variant="ghost" color="neutral" class="opacity-0 group-hover:opacity-70 hover:!opacity-100 shrink-0" title="Export agent" @click.stop="exportAgent(agent)" />
                  <UButton icon="i-lucide-ellipsis" size="xs" variant="ghost" color="neutral" class="opacity-0 group-hover:opacity-70 hover:!opacity-100 shrink-0 -mr-1" @click.stop="openEditAgent(agent)" />
                </button>
                <p v-if="!agents.length" class="text-xs text-gray-400 dark:text-gray-600 px-3 py-2">No agents yet</p>
              </div>
            </div>

            <div class="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div class="flex items-center justify-between px-4 py-3 shrink-0">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0">Sessions</span>
                  <span v-if="activeAgent" class="text-[11px] text-gray-400 dark:text-gray-500 truncate font-medium">— {{ activeAgent.name }}</span>
                </div>
                <UButton icon="i-lucide-plus" size="xs" variant="ghost" color="neutral" :disabled="!activeAgent" @click="createSession" />
              </div>
              <div class="flex-1 overflow-y-auto pb-2 space-y-0.5 px-2">
                <template v-if="activeAgent">
                  <button
                    v-for="session in activeAgent.sessions" :key="session.id"
                    class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left group transition-colors"
                    :class="session.id === activeAgent.activeSessionId ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
                    @click="activeAgent.activeSessionId = session.id"
                  >
                    <UIcon name="i-lucide-message-circle" class="w-3.5 h-3.5 shrink-0" :class="session.id === activeAgent.activeSessionId ? 'text-primary opacity-80' : 'opacity-40'" />
                    <div class="flex-1 min-w-0">
                      <p class="text-xs font-medium truncate leading-tight">{{ session.title }}</p>
                      <p class="text-[10px] opacity-40 mt-0.5 leading-tight">{{ formatTime(session.createdAt) }}</p>
                    </div>
                    <UButton icon="i-lucide-trash-2" size="xs" variant="ghost" color="error" class="opacity-0 group-hover:opacity-60 hover:!opacity-100 shrink-0 -mr-1" @click.stop="deleteSession(activeAgent.id, session.id)" />
                  </button>
                </template>
              </div>
            </div>
          </div>
        </Transition>

        <!-- ═══ CHAT AREA ═══ -->
        <div class="flex flex-col flex-1 min-w-0 h-full min-h-0 px-4 py-4 gap-3">

          <!-- Messages -->
          <div class="flex flex-col gap-3 flex-1 overflow-y-auto scroll-smooth px-1 min-h-0">
            <div v-if="agentsLoading" class="flex-1 flex items-center justify-center">
              <UIcon name="i-lucide-loader" class="w-6 h-6 animate-spin text-gray-400" />
            </div>
            <div v-else-if="!activeAgent" class="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-600 select-none">
              <UIcon name="i-lucide-bot" class="w-10 h-10 opacity-30" />
              <p class="text-sm">No agents yet — create one to start</p>
            </div>
            <div v-else-if="messages.length === 0" class="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-600 select-none">
              <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span class="text-xl font-bold text-primary">{{ activeAgent.name.charAt(0) }}</span>
              </div>
              <p class="text-sm font-semibold text-gray-600 dark:text-gray-400">{{ activeAgent.name }}</p>
              <p class="text-xs opacity-50 font-mono">{{ activeAgent.model }}</p>
            </div>

            <template v-for="msg in messages" :key="msg.id">
              <div v-if="msg.role === 'system-notice'" class="flex items-center gap-2 py-1">
                <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                <span class="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 whitespace-nowrap">
                  <UIcon name="i-lucide-refresh-cw" class="w-2.5 h-2.5" />{{ msg.parts[0].text }}
                </span>
                <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>

              <div v-else class="flex gap-3" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
                <div class="flex flex-col gap-1 max-w-[82%]" :class="msg.role === 'user' ? 'items-end' : 'items-start'" @click="toggleTimestamp(msg.id)">
                  <template v-if="msg.role === 'assistant'">
                    <div v-for="part in msg.parts.filter(p => p.type === 'thinking')" :key="'th-' + msg.id" class="w-full">
                      <button v-if="part.text" class="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" @click="toggleThinking(msg.id)">
                        <UIcon name="i-lucide-brain" class="w-3.5 h-3.5" :class="{ 'animate-pulse': status === 'streaming' && expandedThinking.has(msg.id) }" />
                        <span>{{ expandedThinking.has(msg.id) ? 'Hide' : 'Show' }} thinking</span>
                        <UIcon :name="expandedThinking.has(msg.id) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" class="w-3 h-3" />
                      </button>
                      <div v-else-if="status === 'streaming'" class="flex items-center gap-1.5 text-xs text-gray-400 animate-pulse">
                        <UIcon name="i-lucide-brain" class="w-3.5 h-3.5" /><span>Thinking...</span>
                      </div>
                      <div v-if="expandedThinking.has(msg.id) && part.text" class="mt-1.5 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">{{ part.text }}</div>
                    </div>
                  </template>

                  <div
                    v-for="part in msg.parts.filter(p => p.type === 'text')" :key="'tx-' + msg.id"
                    class="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                    :class="msg.role === 'user' ? 'bg-primary text-white rounded-br-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'"
                  >
                    <span v-if="msg.role === 'user'" class="whitespace-pre-wrap">{{ part.text }}</span>
                    <template v-else>
                      <template v-if="visibleText(part.text)">
                        <div
                          class="prose prose-sm dark:prose-invert max-w-none
                            prose-p:my-1.5 prose-p:leading-relaxed prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
                            prose-h1:text-base prose-h2:text-sm prose-h3:text-sm prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5
                            prose-code:bg-gray-800 prose-code:text-emerald-400 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                            prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700 dark:prose-pre:bg-gray-950 dark:prose-pre:border-gray-700 prose-pre:text-gray-100 prose-pre:rounded-xl prose-pre:p-4 prose-pre:overflow-x-auto prose-pre:text-[11px] prose-pre:leading-relaxed prose-pre:my-3 prose-pre:shadow-lg
                            [&_pre_code]:bg-transparent [&_pre_code]:text-gray-100 [&_pre_code]:p-0 [&_pre_code]:text-[11px]
                            prose-blockquote:border-l-2 prose-blockquote:border-primary/50 prose-blockquote:pl-3 prose-blockquote:italic prose-blockquote:text-gray-500 prose-blockquote:my-2
                            prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:font-semibold
                            prose-hr:border-gray-200 dark:prose-hr:border-gray-700 prose-hr:my-3
                            prose-table:text-xs prose-th:bg-gray-200 dark:prose-th:bg-gray-700 prose-th:px-3 prose-th:py-1.5 prose-td:px-3 prose-td:py-1.5"
                          v-html="renderMarkdown(part.text)"
                        />
                      </template>
                      <!-- Submitted (waiting for first token) -->
                      <span v-else-if="status === 'submitted'" class="inline-flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 animate-pulse">
                        <UIcon name="i-lucide-loader" class="w-3.5 h-3.5 animate-spin" />
                        <span>Thinking…</span>
                      </span>
                      <!-- Streaming but text hidden behind form block -->
                      <span v-else-if="status === 'streaming' && !visibleText(part.text)" class="inline-flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                        <span class="inline-flex gap-1 items-center">
                          <span class="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:0ms]" />
                          <span class="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:150ms]" />
                          <span class="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:300ms]" />
                        </span>
                        <span v-if="part.text.includes('<@@@START@@@>')" class="animate-pulse">Preparing question…</span>
                      </span>
                    </template>
                  </div>
                  <!-- Timestamp — visible when message is clicked -->
                  <Transition enter-active-class="transition-all duration-150 ease-out" enter-from-class="opacity-0 -translate-y-1" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition-all duration-100 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
                    <span v-if="expandedTimestamps.has(msg.id) && msg.createdAt" class="text-[10px] text-gray-400 dark:text-gray-500 px-1 select-none">
                      {{ formatMessageTime(msg.createdAt) }}
                    </span>
                  </Transition>
                </div>
              </div>
            </template>
            <div ref="messagesEndRef" class="h-1 shrink-0" />
          </div>

          <!-- ── Interactive form area ── -->
          <!-- Building indicator: shown while streaming and a form block is being constructed -->
          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-1"
          >
            <div
              v-if="buildingForm && !pendingForm"
              class="shrink-0 rounded-xl border border-dashed border-primary/30 bg-primary/5 dark:bg-primary/10 px-4 py-3 flex items-center gap-2.5"
            >
              <span class="inline-flex gap-1 items-center shrink-0">
                <span class="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:0ms]" />
                <span class="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:150ms]" />
                <span class="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
              <span class="text-xs text-primary/60 animate-pulse">Building question…</span>
            </div>
          </Transition>

          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-1"
          >
            <div v-if="pendingForm" class="shrink-0 rounded-xl border border-primary/25 bg-primary/5 dark:bg-primary/10 px-4 py-3">
              <div class="flex items-center justify-between mb-2.5 select-none">
                <p class="text-xs font-medium text-primary/70 flex items-center gap-1.5">
                  <UIcon name="i-lucide-list-checks" class="w-3.5 h-3.5" />
                  {{ pendingForm.question }}
                </p>
                <!-- Queue indicator: "Question 1 of 3" when multiple forms -->
                <span
                  v-if="activeSession?.pendingForms?.length > 1"
                  class="text-[10px] text-primary/50 font-medium tabular-nums shrink-0 ml-3"
                >
                  {{ (activeSession.pendingForms.findIndex(f => f.html === pendingForm!.html) + 1) }} / {{ activeSession.pendingForms.length }}
                </span>
              </div>
              <!-- v-html is intentional: the AI returns trusted inline-styled HTML form markup -->
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div v-html="pendingForm.html" @submit.prevent="handleFormSubmit" />
            </div>
          </Transition>

          <!-- Input bar -->
          <UChatPrompt
            v-model="input"
            variant="soft"
            :placeholder="activeAgent ? `Message ${activeAgent.name}...` : 'Select an agent to start'"
            :disabled="status === 'streaming' || !activeAgent"
            @submit="handleSubmit"
          />
        </div>

        <!-- ═══ RIGHT PANEL — Script Editor ═══ -->
        <Transition enter-active-class="transition-all duration-250 ease-out" enter-from-class="opacity-0 translate-x-4" enter-to-class="opacity-100 translate-x-0" leave-active-class="transition-all duration-200 ease-in" leave-from-class="opacity-100 translate-x-0" leave-to-class="opacity-0 translate-x-4">
          <div v-if="scriptPanelOpen && activeAgent" class="w-80 xl:w-96 shrink-0 border-l border-gray-200 dark:border-gray-800 flex flex-col h-full min-h-0 overflow-hidden">

            <!-- Agent header -->
            <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white shrink-0">{{ activeAgent.name.charAt(0) }}</div>
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate leading-tight">{{ activeAgent.name }}</p>
                    <p class="text-[11px] text-gray-400 font-mono leading-tight">{{ activeAgent.model.split(':')[0] }}</p>
                  </div>
                </div>
                <UButton icon="i-lucide-pencil" size="xs" variant="ghost" color="neutral" @click="openEditAgent(activeAgent)" />
              </div>
            </div>

            <!-- File tabs — internal.md always shown first as locked -->
            <div class="flex items-center border-b border-gray-200 dark:border-gray-800 shrink-0 overflow-x-auto">
              <div class="flex items-center min-w-0 flex-1">

                <!-- internal.md tab — selectable and editable like any other file -->
                <button
                  class="group relative flex items-center gap-1.5 px-3 py-2.5 text-xs border-r border-gray-200 dark:border-gray-800 shrink-0 transition-colors"
                  :class="activeFileId === '__internal__' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
                  @click="activeFileId = '__internal__'"
                >
                  <span v-if="activeFileId === '__internal__'" class="absolute top-0 left-0 right-0 h-0.5 bg-primary" />
                  <UIcon name="i-lucide-shield" class="w-3 h-3 shrink-0 text-primary/60" />
                  <span class="font-mono">internal.md</span>
                </button>

                <!-- Editable file tabs -->
                <button
                  v-for="file in editableFiles" :key="file.id"
                  class="group relative flex items-center gap-1.5 px-3 py-2.5 text-xs border-r border-gray-200 dark:border-gray-800 shrink-0 transition-colors"
                  :class="file.id === activeFileId ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
                  @click="activeFileId = file.id" @dblclick="startRenaming(file)"
                >
                  <span v-if="file.id === activeFileId" class="absolute top-0 left-0 right-0 h-0.5 bg-primary" />
                  <UIcon name="i-lucide-file-text" class="w-3 h-3 shrink-0" :class="file.isBootstrap ? 'text-primary' : 'opacity-50'" />
                  <input v-if="editingFileId === file.id" v-model="editingFileName" v-focus class="bg-transparent outline-none w-20 font-mono text-xs" @blur="commitRename" @keydown.enter="commitRename" @keydown.escape="editingFileId = null" @click.stop />
                  <span v-else class="max-w-[72px] truncate font-mono">{{ file.name }}</span>
                  <span v-if="dirtyFiles.has(file.id)" class="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span v-else-if="file.isBootstrap" class="text-[9px] text-primary/70 font-bold shrink-0">⚡</span>
                  <button v-if="editableFiles.length > 1" class="opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity shrink-0" @click.stop="deleteFile(file.id)">
                    <UIcon name="i-lucide-x" class="w-2.5 h-2.5" />
                  </button>
                </button>
              </div>
              <button class="px-2.5 py-2 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0" @click="addFile">
                <UIcon name="i-lucide-plus" class="w-3.5 h-3.5" />
              </button>
            </div>

            <!-- Apply toolbar -->
            <div class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-800 shrink-0">
              <span class="text-xs flex items-center gap-1.5">
                <template v-if="!hasUnapplied">
                  <UIcon name="i-lucide-check-circle" class="w-3.5 h-3.5 text-primary" /><span class="text-primary font-medium">Applied</span>
                </template>
                <template v-else>
                  <UIcon name="i-lucide-alert-circle" class="w-3.5 h-3.5 text-amber-500" /><span class="text-amber-500">Unapplied changes</span>
                </template>
              </span>
              <UButton size="xs" color="primary" variant="soft" :icon="hasUnapplied ? 'i-lucide-play' : 'i-lucide-check'" :label="hasUnapplied ? 'Apply All' : 'Applied'" :disabled="!hasUnapplied" @click="applyScript" />
            </div>

            <!-- Editor -->
            <div class="flex-1 min-h-0 relative bg-white dark:bg-gray-950">
              <textarea v-if="activeFile" v-model="activeFile.content" spellcheck="false" class="w-full h-full resize-none bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-100 font-mono text-xs leading-relaxed p-4 focus:outline-none border-0 placeholder-gray-300 dark:placeholder-gray-600 selection:bg-primary/30" placeholder="# Write instructions here..." />
              <div class="absolute bottom-2 right-3 text-gray-400 dark:text-gray-600 text-[10px] font-mono pointer-events-none select-none">{{ activeFile?.content.split('\n').length ?? 0 }}L</div>
            </div>

            <!-- Templates -->
            <div class="border-t border-gray-200 dark:border-gray-800 px-3 py-2.5 shrink-0">
              <p class="text-[10px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500 mb-2">Templates</p>
              <div class="flex flex-wrap gap-1.5">
                <button v-for="tpl in TEMPLATES" :key="tpl.label" class="px-2 py-0.5 text-[11px] rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-primary/10 hover:text-primary transition-colors font-medium" @click="activeFile && (activeFile.content = tpl.content); activeFileId && dirtyFiles.add(activeFileId)">
                  {{ tpl.label }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </template>
  </UDashboardPanel>

  <!-- Agent Modal -->
  <UModal v-model:open="showAgentModal" :title="editingAgent ? `Edit — ${editingAgent.name}` : 'New Agent'" :ui="{ width: 'sm:max-w-md' }">
    <template #body>
      <div class="space-y-4 py-1">
        <UFormField label="Agent Name">
          <UInput v-model="agentForm.name" placeholder="e.g. Customer Support" class="w-full" autofocus />
        </UFormField>
        <UFormField label="Model">
          <USelect v-model="agentForm.model" :items="modelStore.modelOptions" value-key="value" class="w-full" />
          <template #hint>
            <span class="text-[11px] text-gray-400">Manage models at <a href="/studio/models" class="text-primary underline">Studio → Models</a></span>
          </template>
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-between w-full">
        <UButton v-if="editingAgent && agents.length > 1" color="error" variant="ghost" label="Delete Agent" icon="i-lucide-trash-2" :loading="agentSaving" @click="deleteActiveAgent" />
        <div class="flex gap-2 ml-auto">
          <UButton color="neutral" variant="ghost" label="Cancel" @click="showAgentModal = false" />
          <UButton color="primary" label="Save" icon="i-lucide-check" :loading="agentSaving" :disabled="!agentForm.name.trim()" @click="saveAgentForm" />
        </div>
      </div>
    </template>
  </UModal>

  <!-- Hidden file input for import -->
  <input
    ref="importInputRef"
    type="file"
    accept=".json,application/json"
    class="hidden"
    @change="handleImportFile"
  />

  <!-- Import error notification -->
  <Transition enter-active-class="transition-all duration-200 ease-out" enter-from-class="opacity-0 translate-y-2" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition-all duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
    <div v-if="importError" class="fixed bottom-4 right-4 z-50 flex items-center gap-2.5 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-xl shadow-lg max-w-sm">
      <UIcon name="i-lucide-alert-circle" class="w-4 h-4 shrink-0" />
      <span>{{ importError }}</span>
      <button class="ml-auto opacity-60 hover:opacity-100" @click="importError = null">
        <UIcon name="i-lucide-x" class="w-3.5 h-3.5" />
      </button>
    </div>
  </Transition>
</template>
