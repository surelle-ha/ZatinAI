<script setup lang="ts">
/**
 * LessonPlayPage.vue
 *
 * Full learning session: lesson reader (left) + agent chat with whiteboard (right).
 * Accepts route params:  ?suiteId=1  (opens the suite)
 * or receives props via router: { suite, agent } injected by the lesson builder's Play button.
 *
 * Usage — add to your router:
 *   { path: '/learn/:suiteId', component: LessonPlayPage }
 *
 * Or use as a full-screen modal overlay by toggling :open prop.
 */
import { ref, computed, watch, nextTick } from 'vue'
import MarkdownIt from 'markdown-it'
import { useSessionStore } from '~/stores/session'
import { useWorkspaceStore } from '~/stores/workspace'
import { useRoute } from 'vue-router'

const md = new MarkdownIt({ html: false, linkify: true, typographer: true, breaks: true })
const sessionStore = useSessionStore()
const workspaceStore = useWorkspaceStore()
const modelStore = useModelStore()
const route = useRoute()

// ─── Types ────────────────────────────────────────────────────────────────────

interface LessonFile {
  id: number
  title: string
  content: string
  sortOrder: number
  estimatedMinutes: number
}

interface LessonSuite {
  id: number
  title: string
  description: string
  subject: string
  level: string
  coverEmoji: string
  assignedAgentId: number | null
  isPublished: boolean
  files: LessonFile[]
}

interface Agent {
  id: number
  name: string
  model: string
  isEnabled: boolean
  files: ScriptFile[]
}

interface ScriptFile {
  id: number | string
  name: string
  content: string
  sortOrder: number
  isBootstrap: boolean
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: number
}

interface VisualBlock {
  id: string
  html: string
  label: string
  complete: boolean
  createdAt: number
}

// ─── API ──────────────────────────────────────────────────────────────────────

const config = useRuntimeConfig()

function apiHeaders(withBody = false): Record<string, string> {
  const h: Record<string, string> = {}
  if (withBody) h['Content-Type'] = 'application/json'
  if (sessionStore.accessToken) h['Authorization'] = `Bearer ${sessionStore.accessToken}`
  if (workspaceStore.activeWorkspaceId) h['x-workspace-id'] = String(workspaceStore.activeWorkspaceId)
  return h
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = config.public.apiBase as string
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: { ...apiHeaders(!!options.body), ...(options.headers as Record<string,string> ?? {}) },
  })
  if (res.status === 401) {
    const ok = await sessionStore.refresh()
    if (!ok) { navigateTo('/auth/sign-in'); throw new Error('Unauthorized') }
    const retry = await fetch(`${base}${path}`, {
      ...options,
      headers: { ...apiHeaders(!!options.body), ...(options.headers as Record<string,string> ?? {}) },
    })
    if (!retry.ok) throw new Error(`API error ${retry.status}`)
    if (retry.status === 204) return undefined as T
    return retry.json()
  }
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.message ?? `API ${res.status}`) }
  if (res.status === 204) return undefined as T
  return res.json()
}

// ─── Loading ──────────────────────────────────────────────────────────────────

const pageLoading = ref(true)
const pageError = ref<string | null>(null)
const suite = ref<LessonSuite | null>(null)
const agent = ref<Agent | null>(null)

async function load(suiteId: number) {
  pageLoading.value = true
  pageError.value = null
  try {
    await modelStore.fetchModels()
    const [s, allAgents] = await Promise.all([
      apiFetch<LessonSuite>(`/api/v1/lessons/${suiteId}`),
      apiFetch<Agent[]>('/api/v1/agents'),
    ])
    suite.value = s
    if (s.assignedAgentId) {
      const a = allAgents.find(a => a.id === s.assignedAgentId)
      if (a) {
        // load agent files for system prompt
        const files = await apiFetch<ScriptFile[]>(`/api/v1/agents/${a.id}/files`)
        agent.value = { ...a, files }
      }
    }
    // Auto-select first lesson
    if (s.files.length) lessonIdx.value = 0
    // Greet the student
    if (agent.value) greetStudent()
  } catch (e: any) {
    pageError.value = e.message
  } finally {
    pageLoading.value = false
  }
}

watch(
  () => workspaceStore.activeWorkspaceId,
  (id) => {
    if (id !== null) {
      const sid = Number(route.params.suiteId)
      if (!isNaN(sid)) load(sid)
    }
  },
  { immediate: true }
)

// ─── Lesson navigation ────────────────────────────────────────────────────────

const lessonIdx = ref(0)
const currentLesson = computed(() => suite.value?.files[lessonIdx.value] ?? null)
const isLastLesson = computed(() => suite.value ? lessonIdx.value === suite.value.files.length - 1 : false)

function goToLesson(idx: number) {
  if (!suite.value || idx < 0 || idx >= suite.value.files.length) return
  lessonIdx.value = idx
  // Notify agent about lesson change
  const lesson = suite.value.files[idx]
  if (lesson && agent.value && messages.value.length > 0) {
    sendSystemNotice(`The student has moved to lesson: "${lesson.title}". Acknowledge briefly and help them study it.`)
  }
}

function nextLesson() { goToLesson(lessonIdx.value + 1) }
function prevLesson() { goToLesson(lessonIdx.value - 1) }

// Track completion
const completedLessons = ref<Set<number>>(new Set())
function markComplete(idx: number) { completedLessons.value.add(idx) }

// ─── internal.md for lesson mode ─────────────────────────────────────────────

const LESSON_INTERNAL = `# Lesson Tutor Instructions

You are a lesson tutor. The student is reading a lesson from a structured curriculum. Your role is to:
- Help the student understand the current lesson content
- Answer questions about what they are reading
- Reinforce concepts with examples and exercises
- Use the Whiteboard to visualize concepts, diagrams, tables, code walkthroughs
- Use Interactive Forms for questions, quizzes, and checks-for-understanding
- Use the Score Panel during formal quizzes/assessments
- Celebrate genuine achievements with <@@@CONFETTI@@@>

## Current Lesson Context
The student's current lesson will be injected into your system prompt below. Always refer to it.

## Whiteboard Panel
This interface has a split layout: lesson content on the LEFT, your chat on the RIGHT with a WHITEBOARD below.
The whiteboard is APPEND-BASED — each visual block you emit is added as a new card.

Emit visual content using:
<@@@VISUAL@@@>
...your HTML here...
<@@@VISUAL_END@@@>

### Whiteboard rules
- Add a data-label attribute to your outermost element: <div data-label="Concept Name">
- ONLY use for educational content: concept diagrams, tables, timelines, code walkthroughs, comparisons, flashcards, summaries
- NEVER use for greetings, conversational replies, or form questions
- Do NOT use <script> tags. Inline styles only.

### Whiteboard style guidelines
- Card heading: <h2 style="font-size:16px;font-weight:700;margin:0 0 10px;color:inherit">Title</h2>
- Body text: <p style="font-size:13px;line-height:1.7;margin:0 0 8px;color:inherit">...</p>
- Code: <pre style="background:#1e293b;color:#e2e8f0;padding:14px 16px;border-radius:10px;font-size:12px;line-height:1.6;overflow:auto;margin:10px 0">...</pre>
- Table: <table style="width:100%;border-collapse:collapse;font-size:12px;margin:10px 0">
- Table header: <th style="background:rgba(99,102,241,0.1);padding:8px 12px;text-align:left;font-weight:600;border:1px solid rgba(99,102,241,0.2)">
- Table cell: <td style="padding:8px 12px;border:1px solid rgba(0,0,0,0.08)">

## Score Panel
<@@@SCORE@@@>...HTML...<@@@SCORE_END@@@>
Only during formal quizzes/assessments. Keep it concise.

## Celebration
<@@@CONFETTI@@@> — use sparingly for genuine achievements only.

## Interactive Forms
<@@@START@@@>
...HTML form...
<@@@END@@@>
Use for questions, checks-for-understanding, and quizzes. Choice buttons, radio inputs, text inputs.
Button style: style="padding:5px 14px;border-radius:8px;border:1px solid var(--color-primary-400);background:var(--color-primary-50);color:var(--color-primary-700);cursor:pointer;font-size:13px;font-weight:500"
Submit button: style="padding:5px 14px;border-radius:8px;border:none;background:var(--color-primary-500);color:#fff;cursor:pointer;font-size:13px;font-weight:500"
`

// ─── System prompt ────────────────────────────────────────────────────────────

const systemPrompt = computed(() => {
  if (!agent.value || !currentLesson.value) return LESSON_INTERNAL
  const agentFiles = [...agent.value.files]
    .sort((a, b) => {
      if (a.isBootstrap) return -1
      if (b.isBootstrap) return 1
      return a.sortOrder - b.sortOrder
    })
    .filter(f => f.content.trim())
    .map(f => `=== ${f.name} ===\n${f.content.trim()}`)
    .join('\n\n')

  const lessonContext = `=== current_lesson.md ===
# Current Lesson: ${currentLesson.value.title}

${currentLesson.value.content}

---
Suite: ${suite.value?.title ?? ''}
Lesson ${lessonIdx.value + 1} of ${suite.value?.files.length ?? 1}
`
  return `${LESSON_INTERNAL}\n\n${agentFiles}\n\n${lessonContext}`
})

// ─── Chat ─────────────────────────────────────────────────────────────────────

const messages = ref<ChatMessage[]>([])
const input = ref('')
const chatStatus = ref<'idle' | 'streaming' | 'ready'>('ready')
const messagesEndRef = ref<HTMLDivElement | null>(null)
const chatScrollRef = ref<HTMLDivElement | null>(null)

function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
  nextTick(() => messagesEndRef.value?.scrollIntoView({ behavior, block: 'end' }))
}
watch(messages, () => scrollToBottom(), { deep: true })

// ─── Visual / whiteboard ──────────────────────────────────────────────────────

const VISUAL_START = '<@@@VISUAL@@@>'
const VISUAL_END = '<@@@VISUAL_END@@@>'
const SCORE_START = '<@@@SCORE@@@>'
const SCORE_END = '<@@@SCORE_END@@@>'

const visualBlocks = ref<VisualBlock[]>([])
const scoreData = ref<{ html: string; complete: boolean } | null>(null)
const whiteboardEndRef = ref<HTMLDivElement | null>(null)
const whiteboardOpen = ref(true)

watch(() => visualBlocks.value.length, () => {
  nextTick(() => whiteboardEndRef.value?.scrollIntoView({ behavior: 'smooth', block: 'end' }))
})

function updateVisualFromStream(raw: string, ctx: { blockId: string | null }) {
  const lastVisualStart = raw.lastIndexOf(VISUAL_START)
  if (lastVisualStart !== -1) {
    const afterStart = raw.slice(lastVisualStart + VISUAL_START.length)
    const endIdx = afterStart.indexOf(VISUAL_END)
    const html = endIdx === -1 ? afterStart.trim() : afterStart.slice(0, endIdx).trim()
    const complete = endIdx !== -1
    if (ctx.blockId) {
      const block = visualBlocks.value.find(b => b.id === ctx.blockId)
      if (block) {
        block.html = html; block.complete = complete
        const m = html.match(/data-label="([^"]*)"/)
        if (m?.[1]) block.label = m[1]
      }
    } else {
      const m = html.match(/data-label="([^"]*)"/)
      const label = m?.[1] ?? `Note ${visualBlocks.value.length + 1}`
      ctx.blockId = crypto.randomUUID()
      visualBlocks.value.push({ id: ctx.blockId, html, label, complete, createdAt: Date.now() })
      whiteboardOpen.value = true
    }
  }
  const lastScoreStart = raw.lastIndexOf(SCORE_START)
  if (lastScoreStart !== -1) {
    const after = raw.slice(lastScoreStart + SCORE_START.length)
    const endIdx = after.indexOf(SCORE_END)
    const html = endIdx === -1 ? after.trim() : after.slice(0, endIdx).trim()
    scoreData.value = { html, complete: endIdx !== -1 }
  }
}

function stripVisualBlocks(raw: string): string {
  raw = raw.replace(/<@@@CONFETTI@@@>/g, '')
  let r = raw
  for (const [S, E] of [[VISUAL_START, VISUAL_END], [SCORE_START, SCORE_END]]) {
    while (r.includes(S)) {
      const s = r.indexOf(S), e = r.indexOf(E, s)
      if (e === -1) { r = r.slice(0, s).trimEnd(); break }
      r = (r.slice(0, s).trimEnd() + '\n\n' + r.slice(e + E.length).trimStart()).trim()
    }
  }
  return r.trim()
}

// ─── Forms ────────────────────────────────────────────────────────────────────

const FORM_START = '<@@@START@@@>'
const FORM_END = '<@@@END@@@>'

interface PendingForm { html: string; question: string }
const pendingForms = ref<PendingForm[]>([])
const pendingForm = ref<PendingForm | null>(null)
const pendingAnswers = ref<string[]>([])
const buildingForm = ref(false)
const _formSubmitting = ref(false)

function extractFormBlocks(raw: string): PendingForm[] {
  const results: PendingForm[] = []
  let search = raw
  while (true) {
    const start = search.indexOf(FORM_START); if (start === -1) break
    const end = search.indexOf(FORM_END, start); if (end === -1) break
    const html = search.slice(start + FORM_START.length, end).trim()
    const q = html.match(/data-question="([^"]*)"/)
    results.push({ html, question: q?.[1] ?? 'Please select an option' })
    search = search.slice(end + FORM_END.length)
  }
  return results
}

function detectPendingForm() {
  const last = [...messages.value].reverse().find(m => m.role === 'assistant')
  if (!last) { pendingForm.value = null; return }
  const blocks = extractFormBlocks(last.text)
  if (!blocks.length) { pendingForm.value = null; return }
  pendingForms.value = blocks
  pendingForm.value = blocks[0]
}

function stripFormBlock(raw: string): string {
  const firstStart = raw.indexOf(FORM_START)
  if (firstStart === -1) return raw
  let result = raw.slice(0, firstStart).trim()
  let search = raw.slice(firstStart)
  while (true) {
    const start = search.indexOf(FORM_START); if (start === -1) break
    const end = search.indexOf(FORM_END, start)
    if (end === -1) break
    const after = search.slice(end + FORM_END.length)
    const nextStart = after.indexOf(FORM_START)
    const textAfter = (nextStart === -1 ? after : after.slice(0, nextStart)).trim()
    if (textAfter) result = result ? result + '\n\n' + textAfter : textAfter
    search = after
  }
  return result
}

function handleFormSubmit(event: Event) {
  event.preventDefault(); event.stopPropagation()
  if (_formSubmitting.value) return
  _formSubmitting.value = true
  setTimeout(() => { _formSubmitting.value = false }, 600)

  const form = event.target as HTMLFormElement
  const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null
  let answer = ''
  if (submitter?.value) {
    answer = submitter.value
  } else {
    const data = new FormData(form)
    const vals: string[] = []
    data.forEach(v => { if (v) vals.push(v.toString()) })
    answer = vals.join(', ')
  }
  if (!answer.trim()) return

  const forms = pendingForms.value
  const idx = forms.findIndex(f => f.html === (pendingForm.value?.html ?? ''))
  const next = forms[idx + 1] ?? null
  pendingAnswers.value = [...pendingAnswers.value, answer]

  if (next) {
    pendingForm.value = next
  } else {
    const all = pendingAnswers.value
    pendingForm.value = null; pendingForms.value = []; pendingAnswers.value = []
    const combined = all.length === 1 ? all[0] : all.map((a, i) => `Q${i + 1}: ${a}`).join('\n')
    input.value = combined
    sendMessage()
  }
}

// ─── Confetti ─────────────────────────────────────────────────────────────────

const showConfetti = ref(false)
const confettiParticles = ref<{ id: number; x: number; color: string; delay: number; duration: number; rotate: number; size: number }[]>([])

function triggerConfetti() {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f97316']
  confettiParticles.value = Array.from({ length: 60 }, (_, i) => ({
    id: i, x: Math.random() * 100, color: colors[Math.floor(Math.random() * colors.length)],
    delay: Math.random() * 0.6, duration: 1.8 + Math.random() * 1.2,
    rotate: Math.random() * 720 - 360, size: 6 + Math.random() * 8,
  }))
  showConfetti.value = true
  setTimeout(() => { showConfetti.value = false }, 3500)
}

// ─── renderMarkdown ───────────────────────────────────────────────────────────

function renderMarkdown(raw: string): string {
  return md.render(stripFormBlock(stripVisualBlocks(raw)))
}

// ─── Send message ─────────────────────────────────────────────────────────────

async function sendMessage() {
  const text = input.value.trim()
  if (!text || chatStatus.value === 'streaming') return
  if (pendingForm.value) { pendingForm.value = null; pendingForms.value = []; pendingAnswers.value = [] }

  messages.value.push({ id: crypto.randomUUID(), role: 'user', text, createdAt: Date.now() })
  input.value = ''
  chatStatus.value = 'streaming'
  scrollToBottom()

  const assistantId = crypto.randomUUID()
  messages.value.push({ id: assistantId, role: 'assistant', text: '', createdAt: Date.now() })

  try {
    const history = messages.value.slice(0, -1).map(m => ({ role: m.role, content: m.text }))
    const allMessages = systemPrompt.value.trim()
      ? [{ role: 'system', content: systemPrompt.value }, ...history]
      : history

    const modelConfig = modelStore.models.find(m => m.value === agent.value?.model)
    const host = modelConfig?.hostUrl?.replace(/\/$/, '') ?? 'http://localhost:11434'
    const inferenceHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
    if (modelConfig?.platform === 'third-party' && modelConfig?.apiToken)
      inferenceHeaders['Authorization'] = `Bearer ${modelConfig.apiToken}`

    const response = await fetch(`${host}/api/chat`, {
      method: 'POST',
      headers: inferenceHeaders,
      body: JSON.stringify({ model: agent.value?.model, stream: true, messages: allMessages }),
    })
    if (!response.ok) throw new Error(`Model error: ${response.statusText}`)
    if (!response.body) throw new Error('No response body')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    const visualCtx = { blockId: null as string | null }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n').filter(Boolean)) {
        try {
          const json = JSON.parse(line)
          const msg = messages.value.find(m => m.id === assistantId)
          if (!msg) continue
          if (json.message?.content) {
            msg.text += json.message.content
            if (msg.text.includes(FORM_START)) buildingForm.value = true
            if (msg.text.includes(VISUAL_START) || msg.text.includes(SCORE_START))
              updateVisualFromStream(msg.text, visualCtx)
            if (msg.text.includes('<@@@CONFETTI@@@>') && !showConfetti.value)
              triggerConfetti()
          }
        } catch {}
      }
    }

    await nextTick()
    detectPendingForm()
    await nextTick()
    buildingForm.value = false
  } catch (err: any) {
    const msg = messages.value.find(m => m.id === assistantId)
    if (msg) msg.text = `**Error:** ${err.message ?? 'Could not reach the model.'}`
    buildingForm.value = false
  } finally {
    chatStatus.value = 'ready'
    scrollToBottom()
  }
}

// Internal helper — inject a hidden system message that steers the agent
async function sendSystemNotice(instruction: string) {
  const id = crypto.randomUUID()
  messages.value.push({ id, role: 'user', text: `[SYSTEM] ${instruction}`, createdAt: Date.now() })
  chatStatus.value = 'streaming'
  const assistantId = crypto.randomUUID()
  messages.value.push({ id: assistantId, role: 'assistant', text: '', createdAt: Date.now() })
  try {
    const history = messages.value.slice(0, -1).map(m => ({ role: m.role === 'user' && m.text.startsWith('[SYSTEM] ') ? 'user' : m.role, content: m.text.replace('[SYSTEM] ', '') }))
    const allMessages = [{ role: 'system', content: systemPrompt.value }, ...history]
    const modelConfig = modelStore.models.find(m => m.value === agent.value?.model)
    const host = modelConfig?.hostUrl?.replace(/\/$/, '') ?? 'http://localhost:11434'
    const resp = await fetch(`${host}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: agent.value?.model, stream: true, messages: allMessages }) })
    if (!resp.ok || !resp.body) throw new Error()
    const reader = resp.body.getReader(), decoder = new TextDecoder()
    const vCtx = { blockId: null as string | null }
    while (true) {
      const { done, value } = await reader.read(); if (done) break
      for (const line of decoder.decode(value).split('\n').filter(Boolean)) {
        try {
          const json = JSON.parse(line), msg = messages.value.find(m => m.id === assistantId)
          if (!msg) continue
          if (json.message?.content) {
            msg.text += json.message.content
            if (msg.text.includes(VISUAL_START) || msg.text.includes(SCORE_START)) updateVisualFromStream(msg.text, vCtx)
          }
        } catch {}
      }
    }
    // Remove the [SYSTEM] user message — hide it from the user
    messages.value = messages.value.filter(m => m.id !== id)
  } catch {}
  finally { chatStatus.value = 'ready'; scrollToBottom() }
}

function greetStudent() {
  if (!agent.value || !suite.value) return
  const lesson = suite.value.files[0]
  input.value = `Hi! I'm starting the "${suite.value.title}" course. The first lesson is "${lesson?.title}". Please introduce yourself and give me a quick overview.`
  sendMessage()
}

// Keyboard
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEVEL_COLOR: Record<string, string> = {
  beginner:     'text-emerald-600 bg-emerald-50 border-emerald-200',
  intermediate: 'text-amber-600 bg-amber-50 border-amber-200',
  advanced:     'text-red-600 bg-red-50 border-red-200',
}
</script>

<template>
  <!-- Loading -->
  <div v-if="pageLoading" class="h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
    <div class="flex flex-col items-center gap-3">
      <UIcon name="i-lucide-loader-circle" class="w-8 h-8 animate-spin text-primary" />
      <p class="text-sm text-neutral-400">Loading lesson...</p>
    </div>
  </div>

  <!-- Error -->
  <div v-else-if="pageError" class="h-screen flex flex-col items-center justify-center gap-4 p-8 bg-white dark:bg-neutral-950">
    <UIcon name="i-lucide-alert-circle" class="w-10 h-10 text-red-400" />
    <p class="text-sm text-red-500">{{ pageError }}</p>
    <UButton size="sm" color="primary" label="Retry" @click="load(Number(route.params.suiteId))" />
  </div>

  <!-- ══ Main ══ -->
  <div v-else-if="suite" class="h-screen flex flex-col bg-white dark:bg-neutral-950 overflow-hidden">

    <!-- ── Top bar ── -->
    <div class="flex items-center gap-3 px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0 z-10">
      <!-- Back -->
      <UButton icon="i-lucide-arrow-left" size="xs" variant="ghost" color="neutral" @click="$router.back()" />

      <div class="w-px h-4 bg-neutral-200 dark:bg-neutral-700" />

      <!-- Suite info -->
      <span class="text-base select-none">{{ suite.coverEmoji }}</span>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 flex-wrap">
          <p class="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">{{ suite.title }}</p>
          <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border capitalize" :class="LEVEL_COLOR[suite.level]">{{ suite.level }}</span>
          <span v-if="suite.subject" class="text-[10px] text-neutral-400">{{ suite.subject }}</span>
        </div>
      </div>

      <!-- Progress -->
      <div class="flex items-center gap-2 shrink-0">
        <div class="flex items-center gap-1">
          <div
            v-for="(_, i) in suite.files" :key="i"
            class="rounded-full transition-all duration-200 cursor-pointer"
            :class="i === lessonIdx ? 'w-5 h-2 bg-primary' : completedLessons.has(i) ? 'w-2 h-2 bg-primary/40' : 'w-2 h-2 bg-neutral-200 dark:bg-neutral-700'"
            @click="goToLesson(i)"
          />
        </div>
        <span class="text-[11px] text-neutral-400 tabular-nums">{{ lessonIdx + 1 }}/{{ suite.files.length }}</span>
      </div>

      <!-- Agent badge -->
      <div v-if="agent" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/8 border border-primary/20 shrink-0">
        <UIcon name="i-lucide-bot" class="w-3.5 h-3.5 text-primary" />
        <span class="text-xs font-medium text-primary">{{ agent.name }}</span>
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" :class="chatStatus === 'streaming' ? 'animate-pulse' : ''" />
      </div>
      <div v-else class="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-700 shrink-0">
        <UIcon name="i-lucide-bot-off" class="w-3.5 h-3.5 text-neutral-400" />
        <span class="text-xs text-neutral-400">No agent</span>
      </div>
    </div>

    <!-- ── Body: Lesson | Chat+Whiteboard ── -->
    <div class="flex flex-1 min-h-0">

      <!-- ═══════════════════════════════════════
           LEFT — Lesson reader
      ═══════════════════════════════════════ -->
      <div class="w-[52%] flex flex-col border-r border-neutral-200 dark:border-neutral-800 min-h-0">

        <!-- Lesson tabs / selector -->
        <div class="flex items-center gap-0 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 shrink-0 overflow-x-auto nice-scroll">
          <button
            v-for="(file, i) in suite.files" :key="file.id"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all shrink-0 mr-0.5"
            :class="i === lessonIdx
              ? 'bg-primary text-white shadow-sm'
              : completedLessons.has(i)
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100'
                : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'"
            @click="goToLesson(i)"
          >
            <UIcon
              :name="completedLessons.has(i) ? 'i-lucide-circle-check' : i === lessonIdx ? 'i-lucide-circle-dot' : 'i-lucide-circle'"
              class="w-3 h-3 shrink-0"
            />
            {{ file.title }}
          </button>
        </div>

        <!-- Lesson content -->
        <div v-if="currentLesson" class="flex-1 overflow-y-auto nice-scroll">
          <!-- Lesson header -->
          <div class="px-8 pt-7 pb-4">
            <div class="flex items-start justify-between gap-4">
              <h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 leading-tight">{{ currentLesson.title }}</h1>
              <span class="flex items-center gap-1 text-xs text-neutral-400 shrink-0 mt-1.5">
                <UIcon name="i-lucide-clock" class="w-3.5 h-3.5" />
                {{ currentLesson.estimatedMinutes }}min
              </span>
            </div>
            <div class="h-px bg-neutral-100 dark:bg-neutral-800 mt-4" />
          </div>

          <!-- Rendered markdown -->
          <div class="px-8 pb-8 lesson-reader" v-html="md.render(currentLesson.content)" />
        </div>

        <!-- Lesson nav footer -->
        <div class="flex items-center justify-between px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30 shrink-0">
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="neutral"
            size="sm"
            label="Previous"
            :disabled="lessonIdx === 0"
            @click="prevLesson"
          />

          <!-- Mark complete -->
          <button
            class="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
            :class="completedLessons.has(lessonIdx)
              ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-primary/10 hover:text-primary border border-transparent'"
            @click="markComplete(lessonIdx)"
          >
            <UIcon :name="completedLessons.has(lessonIdx) ? 'i-lucide-check-circle' : 'i-lucide-check'" class="w-3.5 h-3.5" />
            {{ completedLessons.has(lessonIdx) ? 'Completed' : 'Mark complete' }}
          </button>

          <UButton
            v-if="!isLastLesson"
            trailing-icon="i-lucide-arrow-right"
            color="primary"
            size="sm"
            label="Next Lesson"
            @click="nextLesson"
          />
          <UButton
            v-else
            icon="i-lucide-check-circle"
            color="primary"
            size="sm"
            label="Finish Suite"
            @click="markComplete(lessonIdx); triggerConfetti()"
          />
        </div>
      </div>

      <!-- ═══════════════════════════════════════
           RIGHT — Chat + Whiteboard
      ═══════════════════════════════════════ -->
      <div class="flex-1 flex flex-col min-h-0 min-w-0">

        <!-- No agent state -->
        <div v-if="!agent" class="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
          <div class="w-16 h-16 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 flex items-center justify-center">
            <UIcon name="i-lucide-bot-off" class="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
          </div>
          <div>
            <p class="text-sm font-semibold text-neutral-500 dark:text-neutral-400">No agent assigned</p>
            <p class="text-xs text-neutral-400 mt-1 max-w-xs leading-relaxed">
              Assign an AI agent to this lesson suite to enable the interactive tutor.
            </p>
          </div>
          <UButton size="sm" variant="ghost" color="primary" label="Go to Lesson Builder" @click="$router.push('/lessons')" />
        </div>

        <template v-else>
          <!-- Chat area (upper right) -->
          <div class="flex flex-col min-h-0 border-b border-neutral-200 dark:border-neutral-800" :style="whiteboardOpen && visualBlocks.length ? 'flex: 1 1 0' : 'flex: 2 1 0'">

            <!-- Chat header -->
            <div class="flex items-center justify-between px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 shrink-0 bg-white dark:bg-neutral-900">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-bot" class="w-4 h-4 text-primary" />
                <span class="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{{ agent.name }}</span>
                <span v-if="chatStatus === 'streaming'" class="text-[10px] text-primary/60 animate-pulse">thinking…</span>
              </div>
              <div class="flex items-center gap-1.5">
                <!-- Quick ask buttons -->
                <button
                  v-for="q in ['Explain this', 'Give me an example', 'Quiz me']"
                  :key="q"
                  class="px-2 py-1 text-[10px] font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-primary/10 hover:text-primary transition-colors"
                  :disabled="chatStatus === 'streaming'"
                  @click="input = q; sendMessage()"
                >{{ q }}</button>
                <!-- Whiteboard toggle -->
                <button
                  class="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-lg transition-colors"
                  :class="whiteboardOpen ? 'bg-primary/10 text-primary' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'"
                  @click="whiteboardOpen = !whiteboardOpen"
                >
                  <UIcon name="i-lucide-layout-panel-top" class="w-3 h-3" />
                  Board
                  <span v-if="visualBlocks.length" class="text-[9px] tabular-nums">{{ visualBlocks.length }}</span>
                </button>
              </div>
            </div>

            <!-- Messages -->
            <div ref="chatScrollRef" class="flex-1 overflow-y-auto nice-scroll px-4 py-3 space-y-3">
              <!-- Empty state -->
              <div v-if="!messages.length" class="h-full flex flex-col items-center justify-center gap-3 text-center py-8 opacity-50">
                <UIcon name="i-lucide-message-circle" class="w-8 h-8 text-neutral-300 dark:text-neutral-600" />
                <p class="text-xs text-neutral-400">Starting session…</p>
              </div>

              <template v-for="msg in messages" :key="msg.id">
                <!-- Skip [SYSTEM] user messages -->
                <template v-if="!msg.text.startsWith('[SYSTEM] ')">
                  <!-- User message -->
                  <div v-if="msg.role === 'user'" class="flex justify-end">
                    <div class="max-w-[80%] bg-primary text-white text-sm px-3.5 py-2.5 rounded-2xl rounded-tr-sm leading-relaxed">
                      {{ msg.text }}
                    </div>
                  </div>

                  <!-- Assistant message -->
                  <div v-else class="flex items-start gap-2.5 max-w-[90%]">
                    <div class="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <UIcon name="i-lucide-bot" class="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <!-- Streaming indicator -->
                      <div v-if="!msg.text && chatStatus === 'streaming'" class="flex gap-1 py-3">
                        <span class="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style="animation-delay:0ms" />
                        <span class="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style="animation-delay:150ms" />
                        <span class="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style="animation-delay:300ms" />
                      </div>
                      <div
                        v-else
                        class="prose prose-sm dark:prose-invert max-w-none text-neutral-800 dark:text-neutral-200
                          prose-headings:font-semibold prose-p:leading-relaxed prose-p:my-1
                          prose-code:bg-neutral-100 dark:prose-code:bg-neutral-800 prose-code:px-1 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
                          prose-pre:bg-neutral-900 prose-pre:rounded-xl prose-pre:text-xs"
                        v-html="renderMarkdown(msg.text)"
                      />
                    </div>
                  </div>
                </template>
              </template>

              <div ref="messagesEndRef" class="h-1" />
            </div>

            <!-- Form -->
            <div v-if="pendingForm && chatStatus !== 'streaming'" class="px-4 py-2 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30 shrink-0">
              <p class="text-[11px] font-semibold text-neutral-400 mb-2 uppercase tracking-wider">{{ pendingForm.question }}</p>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div v-html="pendingForm.html" @submit.capture.prevent="handleFormSubmit" />
            </div>
            <div v-else-if="buildingForm && chatStatus === 'streaming'" class="px-4 py-2.5 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
              <div class="flex items-center gap-2 text-xs text-neutral-400 animate-pulse">
                <UIcon name="i-lucide-loader" class="w-3.5 h-3.5 animate-spin" /> Preparing question…
              </div>
            </div>

            <!-- Input -->
            <div class="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0">
              <div class="flex items-end gap-2">
                <textarea
                  v-model="input"
                  rows="1"
                  placeholder="Ask about this lesson…"
                  class="flex-1 resize-none bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all max-h-24 nice-scroll"
                  :disabled="chatStatus === 'streaming'"
                  @keydown="onKeyDown"
                />
                <button
                  class="w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0"
                  :class="input.trim() && chatStatus !== 'streaming'
                    ? 'bg-primary text-white hover:brightness-110 shadow-sm'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'"
                  :disabled="!input.trim() || chatStatus === 'streaming'"
                  @click="sendMessage"
                >
                  <UIcon name="i-lucide-send" class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <!-- Whiteboard (lower right) -->
          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 translate-y-4"
            enter-to-class="opacity-100 translate-y-0"
          >
            <div v-if="whiteboardOpen" class="flex flex-col border-t border-neutral-200 dark:border-neutral-800 min-h-0" style="flex: 1 1 0; max-height: 45%">

              <!-- Whiteboard header -->
              <div class="flex items-center justify-between px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 shrink-0 bg-neutral-50 dark:bg-neutral-800/40">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-presentation" class="w-3.5 h-3.5 text-neutral-400" />
                  <span class="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Whiteboard</span>
                  <span v-if="visualBlocks.length" class="text-[10px] text-neutral-400 tabular-nums">{{ visualBlocks.length }}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <button
                    v-if="visualBlocks.length"
                    class="text-[10px] text-neutral-400 hover:text-red-400 transition-colors flex items-center gap-1"
                    @click="visualBlocks = []; scoreData = null"
                  >
                    <UIcon name="i-lucide-trash-2" class="w-3 h-3" /> Clear
                  </button>
                  <button class="text-neutral-400 hover:text-neutral-600 transition-colors" @click="whiteboardOpen = false">
                    <UIcon name="i-lucide-chevron-down" class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <!-- Score panel -->
              <Transition enter-active-class="transition-all duration-300" enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0">
                <div v-if="scoreData" class="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
                  <!-- eslint-disable-next-line vue/no-v-html -->
                  <div class="text-sm" v-html="scoreData.html" />
                </div>
              </Transition>

              <!-- Visual blocks -->
              <div class="flex-1 overflow-y-auto nice-scroll">
                <!-- Empty whiteboard -->
                <div v-if="!visualBlocks.length" class="h-full flex flex-col items-center justify-center gap-2 text-center p-6 opacity-50">
                  <UIcon name="i-lucide-layout-panel-top" class="w-6 h-6 text-neutral-300 dark:text-neutral-600" />
                  <p class="text-xs text-neutral-400">The agent will add visual notes here</p>
                </div>

                <div v-else class="p-3 flex flex-col gap-2.5">
                  <div
                    v-for="(block, idx) in visualBlocks"
                    :key="block.id"
                    class="rounded-xl border overflow-hidden"
                    :class="!block.complete ? 'border-primary/30 dark:border-primary/20' : 'border-neutral-200 dark:border-neutral-800'"
                  >
                    <div class="flex items-center justify-between px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="text-[10px] font-mono text-neutral-400 shrink-0">#{{ idx + 1 }}</span>
                        <span class="text-xs font-medium text-neutral-600 dark:text-neutral-400 truncate">{{ block.label }}</span>
                      </div>
                      <span v-if="!block.complete" class="text-[9px] text-primary/70 animate-pulse shrink-0 ml-2">writing…</span>
                    </div>
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <div
                      class="p-3 text-neutral-800 dark:text-neutral-200 text-sm leading-relaxed
                        [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-1.5 [&_h2]:mt-2
                        [&_p]:mb-1.5 [&_p]:text-xs [&_p]:leading-relaxed [&_p]:last:mb-0
                        [&_ul]:mb-2 [&_ul]:pl-3 [&_ul]:list-disc [&_li]:mb-0.5 [&_li]:text-xs
                        [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs
                        [&_th]:bg-neutral-100 [&_th]:dark:bg-neutral-800 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold [&_th]:border [&_th]:border-neutral-200 [&_th]:dark:border-neutral-700
                        [&_td]:px-2 [&_td]:py-1 [&_td]:border [&_td]:border-neutral-200 [&_td]:dark:border-neutral-700
                        [&_pre]:bg-neutral-900 [&_pre]:text-neutral-100 [&_pre]:p-2.5 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:text-[11px] [&_pre]:leading-relaxed [&_pre]:my-1.5
                        [&_code]:font-mono [&_code]:text-[11px] [&_code]:bg-neutral-100 [&_code]:dark:bg-neutral-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded
                        [&_pre_code]:bg-transparent [&_pre_code]:p-0
                        [&_strong]:font-semibold [&_hr]:border-neutral-200 [&_hr]:dark:border-neutral-700 [&_hr]:my-2"
                      v-html="block.html"
                    />
                  </div>

                  <div ref="whiteboardEndRef" class="h-1 shrink-0" />
                </div>
              </div>
            </div>
          </Transition>
        </template>
      </div>
    </div>
  </div>

  <!-- ── Confetti ── -->
  <Transition enter-active-class="transition-opacity duration-300" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition-opacity duration-700" leave-from-class="opacity-100" leave-to-class="opacity-0">
    <div v-if="showConfetti" class="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      <div v-for="p in confettiParticles" :key="p.id" class="absolute top-0 rounded-sm"
           :style="{ left: p.x + '%', width: p.size + 'px', height: p.size * 0.6 + 'px', backgroundColor: p.color, animationName: 'confetti-fall', animationDuration: p.duration + 's', animationDelay: p.delay + 's', animationTimingFunction: 'cubic-bezier(0.25,0.46,0.45,0.94)', animationFillMode: 'both', opacity: 0.9 }" />
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none" style="padding-top: 6rem">
        <div class="px-8 py-5 rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl border border-neutral-200 dark:border-neutral-700 text-center" style="animation: confetti-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both">
          <div class="text-4xl mb-2">🎉</div>
          <p class="text-lg font-bold text-neutral-900 dark:text-neutral-100">Suite Complete!</p>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Amazing work. You finished all lessons!</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Lesson reader prose */
.lesson-reader :deep(h1) { font-size: 1.5rem; font-weight: 700; margin: 0 0 1rem; line-height: 1.2; }
.lesson-reader :deep(h2) { font-size: 1.2rem; font-weight: 600; margin: 1.8rem 0 0.7rem; }
.lesson-reader :deep(h3) { font-size: 1rem; font-weight: 600; margin: 1.4rem 0 0.5rem; }
.lesson-reader :deep(p)  { margin: 0 0 1rem; line-height: 1.8; color: #374151; }
.dark .lesson-reader :deep(p) { color: #d1d5db; }
.lesson-reader :deep(ul), .lesson-reader :deep(ol) { margin: 0.5rem 0 1rem 1.5rem; }
.lesson-reader :deep(li) { margin-bottom: 0.4rem; line-height: 1.7; }
.lesson-reader :deep(code) { font-family: ui-monospace, monospace; font-size: 0.83em; background: #f1f5f9; padding: 0.2em 0.5em; border-radius: 4px; }
.dark .lesson-reader :deep(code) { background: #1e293b; color: #e2e8f0; }
.lesson-reader :deep(pre) { background: #0f172a; color: #e2e8f0; padding: 1.1rem 1.3rem; border-radius: 12px; overflow-x: auto; margin: 1.2rem 0; font-size: 0.86rem; line-height: 1.7; }
.lesson-reader :deep(pre code) { background: transparent; padding: 0; font-size: inherit; }
.lesson-reader :deep(blockquote) { border-left: 3px solid #6366f1; padding: 0.5rem 0 0.5rem 1.1rem; margin: 1.2rem 0; color: #6b7280; font-style: italic; background: #f8f9ff; border-radius: 0 8px 8px 0; }
.dark .lesson-reader :deep(blockquote) { background: #1e1b4b22; color: #9ca3af; }
.lesson-reader :deep(hr) { border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
.lesson-reader :deep(strong) { font-weight: 600; color: #111827; }
.dark .lesson-reader :deep(strong) { color: #f9fafb; }
.lesson-reader :deep(table) { width: 100%; border-collapse: collapse; margin: 1.2rem 0; font-size: 0.9rem; }
.lesson-reader :deep(th) { background: #f1f5f9; font-weight: 600; text-align: left; padding: 0.6rem 0.9rem; border: 1px solid #e2e8f0; }
.lesson-reader :deep(td) { padding: 0.6rem 0.9rem; border: 1px solid #e2e8f0; }
.dark .lesson-reader :deep(th) { background: #1e293b; border-color: #334155; }
.dark .lesson-reader :deep(td) { border-color: #334155; }

@keyframes confetti-fall {
  0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
  80%  { opacity: 1; }
  100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
}
@keyframes confetti-pop {
  0%   { opacity: 0; transform: scale(0.5); }
  100% { opacity: 1; transform: scale(1); }
}
</style>
