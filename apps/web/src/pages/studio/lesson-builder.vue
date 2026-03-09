<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '~/stores/session'
import { useWorkspaceStore } from '~/stores/workspace'

const router = useRouter()

const sessionStore = useSessionStore()
const workspaceStore = useWorkspaceStore()
const config = useRuntimeConfig()

// ─── Types ────────────────────────────────────────────────────────────────────

type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'

interface LessonFile {
  id: number
  suiteId: number
  title: string
  content: string
  sortOrder: number
  estimatedMinutes: number
  createdAt: string
  updatedAt: string
}

interface LessonSuite {
  id: number
  workspaceId: number
  title: string
  description: string
  subject: string
  level: DifficultyLevel
  coverEmoji: string
  assignedAgentId: number | null
  isPublished: boolean
  files: LessonFile[]
  createdAt: string
  updatedAt: string
}

interface Agent {
  id: number
  name: string
  model: string
  isEnabled: boolean
}

// ─── API ──────────────────────────────────────────────────────────────────────

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

// ─── Lesson API ───────────────────────────────────────────────────────────────

const apiListSuites = () => apiFetch<LessonSuite[]>('/api/v1/lessons')
const apiCreateSuite = (p: object) => apiFetch<LessonSuite>('/api/v1/lessons', { method: 'POST', body: JSON.stringify(p) })
const apiUpdateSuite = (id: number, p: object) => apiFetch<LessonSuite>(`/api/v1/lessons/${id}`, { method: 'PATCH', body: JSON.stringify(p) })
const apiDeleteSuite = (id: number) => apiFetch<void>(`/api/v1/lessons/${id}`, { method: 'DELETE' })

const apiCreateFile = (sid: number, p: object) => apiFetch<LessonFile>(`/api/v1/lessons/${sid}/files`, { method: 'POST', body: JSON.stringify(p) })
const apiUpdateFile = (sid: number, fid: number, p: object) => apiFetch<LessonFile>(`/api/v1/lessons/${sid}/files/${fid}`, { method: 'PATCH', body: JSON.stringify(p) })
const apiDeleteFile = (sid: number, fid: number) => apiFetch<void>(`/api/v1/lessons/${sid}/files/${fid}`, { method: 'DELETE' })
const apiReorderFiles = (sid: number, files: { id: number; sortOrder: number }[]) =>
  apiFetch<LessonFile[]>(`/api/v1/lessons/${sid}/files/reorder`, { method: 'PUT', body: JSON.stringify({ files }) })

// ─── State ────────────────────────────────────────────────────────────────────

const suites = ref<LessonSuite[]>([])
const agents = ref<Agent[]>([])
const pageLoading = ref(true)
const pageError = ref<string | null>(null)
const saving = ref(false)
const toast = ref<{ msg: string; type: 'success' | 'error' } | null>(null)

function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toast.value = { msg, type }
  setTimeout(() => { toast.value = null }, 3000)
}

async function loadAll() {
  pageLoading.value = true
  pageError.value = null
  try {
    const [rawSuites, rawAgents] = await Promise.all([
      apiListSuites(),
      apiFetch<Agent[]>('/api/v1/agents'),
    ])
    suites.value = rawSuites
    agents.value = rawAgents.filter(a => a.isEnabled)
    if (rawSuites.length) {
      activeSuiteId.value = rawSuites[0].id
      activeFileId.value = rawSuites[0].files[0]?.id ?? null
    }
  } catch (e: any) {
    pageError.value = e.message
  } finally {
    pageLoading.value = false
  }
}

watch(() => workspaceStore.activeWorkspaceId, (id) => { if (id !== null) loadAll() }, { immediate: true })

// ─── Active suite / file ──────────────────────────────────────────────────────

const activeSuiteId = ref<number | null>(null)
const activeFileId = ref<number | null>(null)
const activeSuite = computed(() => suites.value.find(s => s.id === activeSuiteId.value) ?? null)
const activeFile = computed(() => activeSuite.value?.files.find(f => f.id === activeFileId.value) ?? null)

function selectSuite(id: number) {
  flushAutoSave()
  activeSuiteId.value = id
  const suite = suites.value.find(s => s.id === id)
  activeFileId.value = suite?.files[0]?.id ?? null
  contentDirty.value = false
}

function selectFile(id: number) {
  flushAutoSave()
  activeFileId.value = id
  contentDirty.value = false
}

// ─── Auto-save ────────────────────────────────────────────────────────────────

const contentDirty = ref(false)
let _saveTimer: ReturnType<typeof setTimeout> | null = null

function markDirty() {
  contentDirty.value = true
  if (_saveTimer) clearTimeout(_saveTimer)
  _saveTimer = setTimeout(flushAutoSave, 1500)
}

async function flushAutoSave() {
  if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null }
  if (!contentDirty.value || !activeFile.value || !activeSuite.value) return
  const suiteId = activeSuite.value.id
  const fileId = activeFile.value.id
  const content = activeFile.value.content
  try {
    await apiUpdateFile(suiteId, fileId, { content })
    contentDirty.value = false
    const file = activeSuite.value.files.find(f => f.id === fileId)
    if (file) file.updatedAt = new Date().toISOString()
  } catch {}
}

// ─── Suite CRUD ───────────────────────────────────────────────────────────────

const showSuiteModal = ref(false)
const editingSuite = ref<LessonSuite | null>(null)
const suiteForm = ref({ title: '', description: '', subject: '', level: 'beginner' as DifficultyLevel, coverEmoji: '📚', assignedAgentId: null as number | null })
const EMOJIS = ['📚', '⚡', '🎨', '🔬', '🧮', '🌍', '🎵', '💡', '🧠', '🔥', '🚀', '🌱']

function openNewSuite() {
  editingSuite.value = null
  suiteForm.value = { title: '', description: '', subject: '', level: 'beginner', coverEmoji: '📚', assignedAgentId: null }
  showSuiteModal.value = true
}

function openEditSuite(suite: LessonSuite) {
  editingSuite.value = suite
  suiteForm.value = { title: suite.title, description: suite.description, subject: suite.subject, level: suite.level, coverEmoji: suite.coverEmoji, assignedAgentId: suite.assignedAgentId }
  showSuiteModal.value = true
}

async function saveSuite() {
  if (!suiteForm.value.title.trim()) return
  saving.value = true
  try {
    if (editingSuite.value) {
      const updated = await apiUpdateSuite(editingSuite.value.id, suiteForm.value)
      const idx = suites.value.findIndex(s => s.id === updated.id)
      if (idx !== -1) { updated.files = suites.value[idx].files; suites.value[idx] = updated }
      showToast('Suite saved')
    } else {
      const created = await apiCreateSuite(suiteForm.value)
      created.files = []
      suites.value.unshift(created)
      selectSuite(created.id)
      showToast('Suite created')
    }
    showSuiteModal.value = false
  } catch (e: any) { showToast(e.message, 'error') }
  finally { saving.value = false }
}

async function deleteSuite(suite: LessonSuite) {
  if (!confirm(`Delete "${suite.title}"? All ${suite.files.length} lesson${suite.files.length !== 1 ? 's' : ''} will be removed.`)) return
  saving.value = true
  try {
    await apiDeleteSuite(suite.id)
    suites.value = suites.value.filter(s => s.id !== suite.id)
    activeSuiteId.value = suites.value[0]?.id ?? null
    activeFileId.value = suites.value[0]?.files[0]?.id ?? null
    showSuiteModal.value = false
    showToast('Suite deleted')
  } catch (e: any) { showToast(e.message, 'error') }
  finally { saving.value = false }
}

async function togglePublish(suite: LessonSuite) {
  try {
    const next = !suite.isPublished
    await apiUpdateSuite(suite.id, { isPublished: next })
    suite.isPublished = next
    showToast(next ? 'Suite published — learners can now see it' : 'Suite unpublished')
  } catch (e: any) { showToast(e.message, 'error') }
}

// ─── Lesson file CRUD ─────────────────────────────────────────────────────────

const showFileModal = ref(false)
const editingFile = ref<LessonFile | null>(null)
const fileForm = ref({ title: '', estimatedMinutes: 15 })

function openNewFile() {
  if (!activeSuite.value) return
  editingFile.value = null
  fileForm.value = { title: '', estimatedMinutes: 15 }
  showFileModal.value = true
}

function openEditFileMeta(file: LessonFile) {
  editingFile.value = file
  fileForm.value = { title: file.title, estimatedMinutes: file.estimatedMinutes }
  showFileModal.value = true
}

async function saveFile() {
  if (!fileForm.value.title.trim() || !activeSuite.value) return
  saving.value = true
  try {
    if (editingFile.value) {
      const updated = await apiUpdateFile(activeSuite.value.id, editingFile.value.id, { title: fileForm.value.title.trim(), estimatedMinutes: fileForm.value.estimatedMinutes })
      const idx = activeSuite.value.files.findIndex(f => f.id === updated.id)
      if (idx !== -1) activeSuite.value.files[idx] = { ...activeSuite.value.files[idx], ...updated }
      showToast('Lesson updated')
    } else {
      const created = await apiCreateFile(activeSuite.value.id, { title: fileForm.value.title.trim(), estimatedMinutes: fileForm.value.estimatedMinutes, sortOrder: activeSuite.value.files.length })
      activeSuite.value.files.push(created)
      selectFile(created.id)
      showToast('Lesson added')
    }
    showFileModal.value = false
  } catch (e: any) { showToast(e.message, 'error') }
  finally { saving.value = false }
}

async function deleteFile(file: LessonFile) {
  if (!activeSuite.value || !confirm(`Delete lesson "${file.title}"?`)) return
  try {
    await apiDeleteFile(activeSuite.value.id, file.id)
    activeSuite.value.files = activeSuite.value.files.filter(f => f.id !== file.id)
    if (activeFileId.value === file.id) activeFileId.value = activeSuite.value.files[0]?.id ?? null
    showToast('Lesson deleted')
  } catch (e: any) { showToast(e.message, 'error') }
}

async function moveFile(file: LessonFile, dir: -1 | 1) {
  if (!activeSuite.value) return
  const files = activeSuite.value.files
  const idx = files.indexOf(file)
  const newIdx = idx + dir
  if (newIdx < 0 || newIdx >= files.length) return
  files.splice(idx, 1); files.splice(newIdx, 0, file)
  files.forEach((f, i) => { f.sortOrder = i })
  try { await apiReorderFiles(activeSuite.value.id, files.map(f => ({ id: f.id, sortOrder: f.sortOrder }))) }
  catch (e: any) { showToast(e.message, 'error') }
}

// ─── Play / Preview mode ─────────────────────────────────────────────────────

const simulateOpen = ref(false)   // markdown-only preview modal (no agent fallback)
const simulateIdx = ref(0)
const previewTab = ref<'rendered' | 'raw'>('rendered')
const simulateFile = computed(() => activeSuite.value?.files[simulateIdx.value] ?? null)
const assignedAgent = computed(() => activeSuite.value?.assignedAgentId ? agents.value.find(a => a.id === activeSuite.value!.assignedAgentId) ?? null : null)

// Label/icon adapt based on whether an agent is assigned
const playLabel = computed(() => assignedAgent.value ? 'Play with Agent' : 'Preview')
const playIcon = computed(() => assignedAgent.value ? 'i-lucide-bot' : 'i-lucide-play')

/**
 * If suite has an assigned agent → navigate to the live interactive session.
 * Otherwise → open the markdown preview modal.
 */
function openPlay() {
  if (!activeSuite.value?.files.length) return
  if (activeSuite.value.assignedAgentId) {
    router.push(`/learn/${activeSuite.value.id}`)
  } else {
    simulateIdx.value = 0; previewTab.value = 'rendered'; simulateOpen.value = true
  }
}

function simNext() { if (activeSuite.value && simulateIdx.value < activeSuite.value.files.length - 1) simulateIdx.value++ }
function simPrev() { if (simulateIdx.value > 0) simulateIdx.value-- }

function renderMarkdown(src: string): string {
  return src
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/```(\w*)\n([\s\S]*?)```/gm, (_: string, lang: string, code: string) => `<pre><code class="lang-${lang}">${code.replace(/</g, '&lt;')}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr>')
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^\|(.+)\|$/gm, (row: string) => '<tr>' + row.split('|').slice(1,-1).map((c: string) => `<td>${c.trim()}</td>`).join('') + '</tr>')
    .replace(/\n\n([^<\n])/g, '\n\n<p>$1').replace(/([^>])\n\n/g, '$1</p>\n\n')
    .replace(/\n/g, '<br>')
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function totalMinutes(suite: LessonSuite) { return suite.files.reduce((a, f) => a + (f.estimatedMinutes ?? 0), 0) }
function agentName(id: number | null) { return id ? agents.value.find(a => a.id === id)?.name ?? null : null }
function formatAge(ts: string) {
  const d = Date.now() - new Date(ts).getTime()
  if (d < 3_600_000) return `${Math.floor(d/60_000)}m ago`
  if (d < 86_400_000) return `${Math.floor(d/3_600_000)}h ago`
  return `${Math.floor(d/86_400_000)}d ago`
}
const LEVEL_COLOR: Record<DifficultyLevel, string> = {
  beginner:     'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800',
  intermediate: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800',
  advanced:     'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
}
</script>

<template>
  <UDashboardPanel id="lesson-maker-panel">
    <template #header>
      <UDashboardNavbar title="Lesson Suites">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #trailing>
          <div class="flex items-center gap-2">
            <UButton v-if="activeSuite?.files.length" :icon="playIcon" size="sm" variant="soft" color="primary" :label="playLabel" @click="openPlay" />
            <UButton icon="i-lucide-plus" size="sm" color="primary" label="New Suite" @click="openNewSuite" />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="pageLoading" class="h-full flex items-center justify-center">
        <UIcon name="i-lucide-loader-circle" class="w-6 h-6 animate-spin text-neutral-400" />
      </div>

      <div v-else-if="pageError" class="h-full flex flex-col items-center justify-center gap-3 text-center p-8">
        <UIcon name="i-lucide-wifi-off" class="w-8 h-8 text-red-400" />
        <p class="text-sm text-red-500">{{ pageError }}</p>
        <UButton size="sm" color="primary" label="Retry" @click="loadAll" />
      </div>

      <div v-else class="flex h-full min-h-0">

        <!-- ═══ Suite list ═══ -->
        <div class="w-64 shrink-0 border-r border-neutral-200 dark:border-neutral-800 flex flex-col h-full min-h-0">
          <div class="px-3 py-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
            <p class="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Suites <span class="text-neutral-300 dark:text-neutral-600">{{ suites.length }}</span>
            </p>
          </div>
          <div class="flex-1 overflow-y-auto nice-scroll py-2 px-2 space-y-0.5">
            <div
              v-for="suite in suites" :key="suite.id"
              class="group flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
              :class="activeSuiteId === suite.id ? 'bg-primary/10 text-primary' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'"
              @click="selectSuite(suite.id)"
            >
              <span class="text-lg shrink-0 mt-0.5 leading-none select-none">{{ suite.coverEmoji }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate leading-snug">{{ suite.title }}</p>
                <p class="text-[10px] mt-0.5 tabular-nums" :class="activeSuiteId === suite.id ? 'text-primary/60' : 'text-neutral-400'">
                  {{ suite.files.length }} lesson{{ suite.files.length !== 1 ? 's' : '' }} · {{ totalMinutes(suite) }}min
                </p>
              </div>
              <div class="flex flex-col items-end gap-1.5 shrink-0 pt-0.5">
                <span class="text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none"
                      :class="suite.isPublished ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'">
                  {{ suite.isPublished ? 'Live' : 'Draft' }}
                </span>
                <button class="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity" @click.stop="openEditSuite(suite)">
                  <UIcon name="i-lucide-settings-2" class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div v-if="!suites.length" class="py-12 text-center">
              <UIcon name="i-lucide-book-plus" class="w-8 h-8 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
              <p class="text-xs text-neutral-400">No suites yet</p>
              <button class="text-xs text-primary hover:underline mt-1" @click="openNewSuite">Create first suite</button>
            </div>
          </div>
          <div class="shrink-0 px-3 py-2.5 border-t border-neutral-200 dark:border-neutral-800">
            <button class="flex items-center gap-2 text-xs text-neutral-400 hover:text-primary transition-colors" @click="openNewSuite">
              <UIcon name="i-lucide-plus" class="w-3.5 h-3.5" /> New Suite
            </button>
          </div>
        </div>

        <!-- ═══ No suite selected ═══ -->
        <div v-if="!activeSuite" class="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
          <UIcon name="i-lucide-book-open" class="w-10 h-10 text-neutral-300 dark:text-neutral-700" />
          <p class="text-sm text-neutral-400">Select or create a suite to begin</p>
        </div>

        <template v-else>

          <!-- ═══ Lesson list ═══ -->
          <div class="w-60 shrink-0 border-r border-neutral-200 dark:border-neutral-800 flex flex-col h-full min-h-0">
            <!-- Suite meta -->
            <div class="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 shrink-0 space-y-2.5">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 mb-1">
                    <span class="text-base select-none">{{ activeSuite.coverEmoji }}</span>
                    <p class="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{{ activeSuite.title }}</p>
                  </div>
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full border capitalize" :class="LEVEL_COLOR[activeSuite.level]">{{ activeSuite.level }}</span>
                    <span v-if="activeSuite.subject" class="text-[10px] text-neutral-400">{{ activeSuite.subject }}</span>
                  </div>
                </div>
                <button class="text-neutral-400 hover:text-primary transition-colors shrink-0 mt-0.5" @click="openEditSuite(activeSuite)">
                  <UIcon name="i-lucide-settings-2" class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- Agent connection -->
              <div v-if="assignedAgent" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/5 border border-primary/15">
                <UIcon name="i-lucide-bot" class="w-3 h-3 text-primary shrink-0" />
                <span class="text-[11px] font-medium text-primary truncate">{{ assignedAgent.name }}</span>
                <span class="text-[9px] text-primary/50 ml-auto shrink-0 font-mono">connected</span>
              </div>
              <div v-else class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-dashed border-neutral-200 dark:border-neutral-700">
                <UIcon name="i-lucide-bot-off" class="w-3 h-3 text-neutral-400 shrink-0" />
                <span class="text-[11px] text-neutral-400">No agent</span>
                <button class="text-[9px] text-primary hover:underline ml-auto shrink-0" @click="openEditSuite(activeSuite)">assign</button>
              </div>

              <!-- Publish + Play -->
              <div class="flex items-center gap-2">
                <button
                  class="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-semibold px-2 py-1.5 rounded-lg border transition-all"
                  :class="activeSuite.isPublished ? 'border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950' : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-primary/40 hover:text-primary'"
                  @click="togglePublish(activeSuite)"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="activeSuite.isPublished ? 'bg-emerald-500' : 'bg-neutral-400'" />
                  {{ activeSuite.isPublished ? 'Published' : 'Publish' }}
                </button>
                <button v-if="activeSuite.files.length"
                        class="flex items-center gap-1 text-[11px] font-medium px-2 py-1.5 rounded-lg border border-primary/20 text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                        @click="openPlay"
                >
                  <UIcon :name="playIcon" class="w-3 h-3" /> {{ playLabel }}
                </button>
              </div>
            </div>

            <!-- Files header -->
            <div class="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800/60 shrink-0 flex items-center justify-between">
              <p class="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                Lessons <span class="text-neutral-300 dark:text-neutral-600">{{ activeSuite.files.length }}</span>
              </p>
              <button class="text-neutral-400 hover:text-primary transition-colors" @click="openNewFile">
                <UIcon name="i-lucide-plus" class="w-3.5 h-3.5" />
              </button>
            </div>

            <!-- File list -->
            <div class="flex-1 overflow-y-auto nice-scroll py-1 px-2 space-y-0.5">
              <div
                v-for="(file, idx) in activeSuite.files" :key="file.id"
                class="group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors"
                :class="activeFileId === file.id ? 'bg-primary/10 text-primary' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'"
                @click="selectFile(file.id)"
              >
                <span class="text-[10px] font-mono text-neutral-400 shrink-0 w-4 text-right select-none">{{ idx + 1 }}</span>
                <UIcon name="i-lucide-file-text" class="w-3.5 h-3.5 shrink-0 opacity-40" />
                <p class="text-xs font-medium flex-1 truncate leading-snug">{{ file.title }}</p>
                <div class="hidden group-hover:flex items-center gap-0.5 shrink-0">
                  <button class="opacity-50 hover:opacity-100 p-0.5" @click.stop="moveFile(file, -1)"><UIcon name="i-lucide-chevron-up" class="w-3 h-3" /></button>
                  <button class="opacity-50 hover:opacity-100 p-0.5" @click.stop="moveFile(file, 1)"><UIcon name="i-lucide-chevron-down" class="w-3 h-3" /></button>
                  <button class="opacity-50 hover:opacity-100 p-0.5 ml-0.5" @click.stop="openEditFileMeta(file)"><UIcon name="i-lucide-pencil" class="w-3 h-3" /></button>
                  <button class="opacity-50 hover:!opacity-100 text-red-400 p-0.5" @click.stop="deleteFile(file)"><UIcon name="i-lucide-x" class="w-3 h-3" /></button>
                </div>
              </div>
              <div v-if="!activeSuite.files.length" class="py-8 text-center">
                <UIcon name="i-lucide-file-plus" class="w-7 h-7 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
                <p class="text-xs text-neutral-400 mb-1">No lessons yet</p>
                <button class="text-xs text-primary hover:underline" @click="openNewFile">Add first lesson</button>
              </div>
              <button class="w-full flex items-center gap-2 px-3 py-2 mt-1 text-xs text-neutral-400 hover:text-primary transition-colors rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800" @click="openNewFile">
                <UIcon name="i-lucide-plus" class="w-3.5 h-3.5" /> Add lesson
              </button>
            </div>
          </div>

          <!-- ═══ Markdown editor ═══ -->
          <div class="flex-1 min-w-0 flex flex-col h-full min-h-0">
            <div v-if="!activeFile" class="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div class="w-14 h-14 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 flex items-center justify-center">
                <UIcon name="i-lucide-file-text" class="w-7 h-7 text-neutral-300 dark:text-neutral-600" />
              </div>
              <div>
                <p class="text-sm font-medium text-neutral-500 dark:text-neutral-400">No lesson selected</p>
                <p class="text-xs text-neutral-400 mt-1">Pick a lesson from the list or add a new one.</p>
              </div>
              <UButton icon="i-lucide-plus" size="sm" color="primary" label="Add Lesson" @click="openNewFile" />
            </div>

            <template v-else>
              <!-- Toolbar -->
              <div class="flex items-center justify-between px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 shrink-0 bg-white dark:bg-neutral-900">
                <div class="flex items-center gap-3 min-w-0">
                  <p class="text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate">{{ activeFile.title }}</p>
                  <span class="text-[10px] text-neutral-400 shrink-0">{{ activeFile.estimatedMinutes }}min</span>
                  <span class="flex items-center gap-1 text-[10px] shrink-0 transition-colors" :class="contentDirty ? 'text-amber-500' : 'text-neutral-300 dark:text-neutral-600'">
                    <UIcon :name="contentDirty ? 'i-lucide-circle-dot' : 'i-lucide-circle-check'" class="w-3 h-3" />
                    {{ contentDirty ? 'Unsaved' : 'Saved' }}
                  </span>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <button v-for="btn in [{ label:'H2',insert:'\n## '},{label:'H3',insert:'\n### '},{label:'B',insert:'**text**'},{label:'`',insert:'`code`'},{label:'```',insert:'\n```js\n\n```\n'},{label:'—',insert:'\n---\n'}]" :key="btn.label"
                          class="px-1.5 py-0.5 text-[10px] font-mono rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-primary/10 hover:text-primary transition-colors"
                          @click="activeFile.content += btn.insert; markDirty()">{{ btn.label }}</button>
                </div>
              </div>

              <textarea
                v-model="activeFile.content"
                spellcheck="false"
                class="flex-1 w-full resize-none bg-white dark:bg-neutral-950 text-neutral-800 dark:text-neutral-100 font-mono text-sm leading-relaxed p-5 focus:outline-none border-0 nice-scroll"
                placeholder="# Lesson Title&#10;&#10;Start writing in Markdown..."
                @input="markDirty()"
              />

              <div class="flex items-center justify-between px-4 py-1.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 shrink-0">
                <div class="flex items-center gap-3">
                  <span class="text-[10px] text-neutral-400 font-mono">{{ activeFile.content.split('\n').length }}L · {{ activeFile.content.length }}ch</span>
                  <span class="text-[10px] text-neutral-300 dark:text-neutral-600">Edited {{ formatAge(activeFile.updatedAt) }}</span>
                </div>
                <span class="text-[10px] text-neutral-400 font-mono">Markdown</span>
              </div>
            </template>
          </div>
        </template>
      </div>
    </template>
  </UDashboardPanel>

  <!-- ═══ SIMULATE MODAL ═══ -->
  <Transition enter-active-class="transition-opacity duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition-opacity duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
    <div v-if="simulateOpen" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6" @click.self="simulateOpen = false">
      <Transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0 scale-95 translate-y-3" enter-to-class="opacity-100 scale-100 translate-y-0">
        <div v-if="simulateOpen && simulateFile" class="w-full max-w-3xl max-h-[88vh] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-neutral-200 dark:border-neutral-800">

          <!-- Header -->
          <div class="flex items-center gap-3 px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
            <span class="text-xl select-none">{{ activeSuite?.coverEmoji }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">{{ activeSuite?.title }}</p>
              <p class="text-xs text-neutral-400">Preview — Lesson {{ simulateIdx + 1 }} of {{ activeSuite?.files.length }}</p>
            </div>
            <!-- Progress dots -->
            <div class="flex items-center gap-1.5 shrink-0">
              <button v-for="(f, i) in activeSuite?.files" :key="f.id"
                      class="rounded-full transition-all duration-200"
                      :class="i === simulateIdx ? 'w-5 h-2 bg-primary' : i < simulateIdx ? 'w-2 h-2 bg-primary/35' : 'w-2 h-2 bg-neutral-200 dark:bg-neutral-700'"
                      @click="simulateIdx = i" />
            </div>
            <!-- Agent badge -->
            <div v-if="assignedAgent" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/8 border border-primary/20 shrink-0">
              <UIcon name="i-lucide-bot" class="w-3.5 h-3.5 text-primary" />
              <span class="text-xs font-medium text-primary">{{ assignedAgent.name }}</span>
            </div>
            <!-- Tab toggle -->
            <div class="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden shrink-0">
              <button class="px-2.5 py-1.5 text-xs font-medium transition-colors" :class="previewTab === 'rendered' ? 'bg-primary text-white' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'" @click="previewTab = 'rendered'">Preview</button>
              <button class="px-2.5 py-1.5 text-xs font-medium transition-colors" :class="previewTab === 'raw' ? 'bg-primary text-white' : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'" @click="previewTab = 'raw'">Markdown</button>
            </div>
            <button class="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0" @click="simulateOpen = false">
              <UIcon name="i-lucide-x" class="w-4 h-4" />
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto nice-scroll">
            <div v-if="previewTab === 'rendered'" class="px-10 py-8 lesson-preview" v-html="renderMarkdown(simulateFile.content)" />
            <pre v-else class="px-10 py-8 font-mono text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">{{ simulateFile.content }}</pre>
          </div>

          <!-- Meta strip -->
          <div class="px-5 py-2.5 bg-neutral-50 dark:bg-neutral-800/40 border-t border-neutral-100 dark:border-neutral-800 shrink-0 flex items-center gap-4">
            <div class="flex items-center gap-1.5 min-w-0">
              <UIcon name="i-lucide-file-text" class="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span class="text-xs font-semibold text-neutral-700 dark:text-neutral-300 truncate">{{ simulateFile.title }}</span>
            </div>
            <div class="flex items-center gap-1">
              <UIcon name="i-lucide-clock" class="w-3 h-3 text-neutral-400" />
              <span class="text-xs text-neutral-500">{{ simulateFile.estimatedMinutes }}min</span>
            </div>
            <span v-if="activeSuite?.subject" class="text-xs text-neutral-400 ml-auto shrink-0">{{ activeSuite.subject }}</span>
          </div>

          <!-- Nav footer -->
          <div class="flex items-center justify-between px-5 py-3.5 border-t border-neutral-200 dark:border-neutral-800 shrink-0">
            <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" label="Previous" :disabled="simulateIdx === 0" @click="simPrev" />
            <span class="text-xs text-neutral-400 tabular-nums">{{ simulateIdx + 1 }} / {{ activeSuite?.files.length }}</span>
            <UButton v-if="simulateIdx < (activeSuite?.files.length ?? 0) - 1" trailing-icon="i-lucide-arrow-right" color="primary" label="Next Lesson" @click="simNext" />
            <template v-else>
              <UButton icon="i-lucide-check-circle" variant="ghost" color="neutral" label="Done" @click="simulateOpen = false" />
              <UButton v-if="assignedAgent" icon="i-lucide-bot" color="primary" label="Play with Agent" @click="simulateOpen = false; router.push(`/learn/${activeSuite!.id}`)" />
              <UButton v-else icon="i-lucide-check-circle" color="primary" label="Finish" @click="simulateOpen = false; showToast('Preview complete')" />
            </template>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>

  <!-- ═══ SUITE MODAL ═══ -->
  <UModal v-model:open="showSuiteModal" :title="editingSuite ? `Edit — ${editingSuite.title}` : 'New Lesson Suite'" :ui="{ width: 'sm:max-w-lg' }">
    <template #body>
      <div class="space-y-4 py-1">
        <div class="flex gap-3">
          <div>
            <p class="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1.5">Icon</p>
            <div class="flex flex-wrap gap-1.5 w-36">
              <button v-for="e in EMOJIS" :key="e" class="w-8 h-8 text-lg rounded-lg flex items-center justify-center transition-all" :class="suiteForm.coverEmoji === e ? 'bg-primary/15 ring-1 ring-primary/40 scale-110' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'" @click="suiteForm.coverEmoji = e">{{ e }}</button>
            </div>
          </div>
          <div class="flex-1 space-y-3">
            <UFormField label="Title" required>
              <UInput v-model="suiteForm.title" placeholder="e.g. Introduction to JavaScript" class="w-full" autofocus />
            </UFormField>
            <UFormField label="Subject">
              <UInput v-model="suiteForm.subject" placeholder="e.g. Programming, Math, History" class="w-full" />
            </UFormField>
          </div>
        </div>
        <UFormField label="Description">
          <UTextarea v-model="suiteForm.description" placeholder="What will students learn in this suite?" :rows="2" class="w-full" />
        </UFormField>
        <UFormField label="Difficulty">
          <div class="grid grid-cols-3 gap-2">
            <button v-for="lvl in (['beginner', 'intermediate', 'advanced'] as DifficultyLevel[])" :key="lvl" class="py-2 text-xs font-medium rounded-lg border capitalize transition-all" :class="suiteForm.level === lvl ? 'border-primary bg-primary/5 text-primary' : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-300'" @click="suiteForm.level = lvl">{{ lvl }}</button>
          </div>
        </UFormField>
        <UFormField label="AI Agent" hint="The agent students chat with while studying this suite">
          <div class="space-y-1.5 max-h-48 overflow-y-auto nice-scroll pr-1">
            <button class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs transition-all" :class="suiteForm.assignedAgentId === null ? 'border-primary bg-primary/5 text-primary' : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-300'" @click="suiteForm.assignedAgentId = null">
              <UIcon name="i-lucide-ban" class="w-3.5 h-3.5 shrink-0" /> No agent
              <UIcon v-if="suiteForm.assignedAgentId === null" name="i-lucide-check" class="w-3 h-3 ml-auto" />
            </button>
            <button v-for="agent in agents" :key="agent.id" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs transition-all" :class="suiteForm.assignedAgentId === agent.id ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-neutral-300'" @click="suiteForm.assignedAgentId = agent.id">
              <UIcon name="i-lucide-bot" class="w-3.5 h-3.5 shrink-0" :class="suiteForm.assignedAgentId === agent.id ? 'text-primary' : 'opacity-40'" />
              <span class="flex-1 text-left">{{ agent.name }}</span>
              <span class="font-mono text-[9px] opacity-40 shrink-0">{{ agent.model }}</span>
              <UIcon v-if="suiteForm.assignedAgentId === agent.id" name="i-lucide-check" class="w-3 h-3 ml-1 shrink-0" />
            </button>
            <p v-if="!agents.length" class="text-xs text-neutral-400 px-1 py-1">No agents configured yet — create one in Studio → Chat first.</p>
          </div>
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-between w-full">
        <UButton v-if="editingSuite" color="error" variant="ghost" icon="i-lucide-trash-2" label="Delete Suite" :loading="saving" @click="deleteSuite(editingSuite!)" />
        <div class="flex gap-2 ml-auto">
          <UButton color="neutral" variant="ghost" label="Cancel" @click="showSuiteModal = false" />
          <UButton color="primary" label="Save" icon="i-lucide-check" :loading="saving" :disabled="!suiteForm.title.trim()" @click="saveSuite" />
        </div>
      </div>
    </template>
  </UModal>

  <!-- ═══ FILE MODAL ═══ -->
  <UModal v-model:open="showFileModal" :title="editingFile ? 'Edit Lesson' : 'New Lesson'" :ui="{ width: 'sm:max-w-sm' }">
    <template #body>
      <div class="space-y-4 py-1">
        <UFormField label="Lesson Title" required>
          <UInput v-model="fileForm.title" placeholder="e.g. Variables & Data Types" class="w-full" autofocus />
        </UFormField>
        <UFormField label="Estimated Duration">
          <div class="flex items-center gap-2">
            <UInput v-model.number="fileForm.estimatedMinutes" type="number" min="1" max="180" class="w-24" />
            <span class="text-sm text-neutral-400">minutes</span>
          </div>
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex gap-2 ml-auto">
        <UButton color="neutral" variant="ghost" label="Cancel" @click="showFileModal = false" />
        <UButton color="primary" label="Save" icon="i-lucide-check" :loading="saving" :disabled="!fileForm.title.trim()" @click="saveFile" />
      </div>
    </template>
  </UModal>

  <!-- ═══ Toast ═══ -->
  <Transition enter-active-class="transition-all duration-200 ease-out" enter-from-class="opacity-0 translate-y-2" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition-all duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
    <div v-if="toast" class="fixed bottom-4 right-4 z-[60] flex items-center gap-2.5 text-sm px-4 py-3 rounded-xl shadow-lg border"
         :class="toast.type === 'error' ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200'">
      <UIcon :name="toast.type === 'error' ? 'i-lucide-alert-circle' : 'i-lucide-check-circle'" class="w-4 h-4 shrink-0" :class="toast.type === 'error' ? 'text-red-500' : 'text-emerald-500'" />
      {{ toast.msg }}
    </div>
  </Transition>
</template>

<style scoped>
.lesson-preview :deep(h1) { font-size: 1.6rem; font-weight: 700; margin: 0 0 1rem; line-height: 1.2; }
.lesson-preview :deep(h2) { font-size: 1.25rem; font-weight: 600; margin: 1.5rem 0 0.6rem; }
.lesson-preview :deep(h3) { font-size: 1.05rem; font-weight: 600; margin: 1.2rem 0 0.5rem; }
.lesson-preview :deep(p)  { margin: 0 0 0.8rem; line-height: 1.75; }
.lesson-preview :deep(ul), .lesson-preview :deep(ol) { margin: 0.5rem 0 1rem 1.25rem; }
.lesson-preview :deep(li) { margin-bottom: 0.3rem; line-height: 1.6; }
.lesson-preview :deep(code) { font-family: ui-monospace, monospace; font-size: 0.82em; background: #f5f5f5; padding: 0.15em 0.45em; border-radius: 4px; }
.dark .lesson-preview :deep(code) { background: #262626; }
.lesson-preview :deep(pre) { background: #0f172a; color: #e2e8f0; padding: 1rem 1.25rem; border-radius: 10px; overflow-x: auto; margin: 1rem 0; font-size: 0.84rem; line-height: 1.65; }
.lesson-preview :deep(pre code) { background: transparent; padding: 0; }
.lesson-preview :deep(blockquote) { border-left: 3px solid #818cf8; padding: 0.4rem 0 0.4rem 1rem; margin: 1rem 0; color: #6b7280; font-style: italic; }
.lesson-preview :deep(hr) { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
.lesson-preview :deep(strong) { font-weight: 600; }
.lesson-preview :deep(em) { font-style: italic; }
.lesson-preview :deep(table) { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.88rem; }
.lesson-preview :deep(th) { background: #f5f5f5; font-weight: 600; text-align: left; padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; }
.lesson-preview :deep(td) { padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; }
.dark .lesson-preview :deep(th) { background: #262626; border-color: #404040; }
.dark .lesson-preview :deep(td) { border-color: #404040; }
</style>
