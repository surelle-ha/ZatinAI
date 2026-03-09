<script setup lang="ts">
import { ref, computed } from 'vue'

// ─── Types ────────────────────────────────────────────────────────────────────

type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'
type LessonStatus = 'locked' | 'available' | 'in-progress' | 'completed'

interface LessonFile {
  id: string
  title: string
  estimatedMinutes: number
  status: LessonStatus
}

interface LessonSuite {
  id: string
  title: string
  description: string
  subject: string
  level: DifficultyLevel
  coverEmoji: string
  agentName: string | null
  lessons: LessonFile[]
  totalMinutes: number
  completedCount: number
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const suites = ref<LessonSuite[]>([
  {
    id: 's1',
    title: 'Introduction to JavaScript',
    description: 'Learn the fundamentals of JavaScript from variables to functions.',
    subject: 'Programming',
    level: 'beginner',
    coverEmoji: '⚡',
    agentName: 'Code Tutor',
    totalMinutes: 90,
    completedCount: 2,
    lessons: [
      { id: 'l1', title: 'What is JavaScript?', estimatedMinutes: 10, status: 'completed' },
      { id: 'l2', title: 'Variables & Data Types', estimatedMinutes: 15, status: 'completed' },
      { id: 'l3', title: 'Functions', estimatedMinutes: 20, status: 'in-progress' },
      { id: 'l4', title: 'Arrays & Objects', estimatedMinutes: 20, status: 'available' },
      { id: 'l5', title: 'DOM Manipulation', estimatedMinutes: 25, status: 'locked' },
    ],
  },
  {
    id: 's2',
    title: 'CSS Grid & Flexbox',
    description: 'Master modern CSS layout techniques with practical visual examples.',
    subject: 'Web Design',
    level: 'intermediate',
    coverEmoji: '🎨',
    agentName: 'Design Coach',
    totalMinutes: 75,
    completedCount: 0,
    lessons: [
      { id: 'l6', title: 'Flexbox Basics', estimatedMinutes: 20, status: 'available' },
      { id: 'l7', title: 'Flex Alignment', estimatedMinutes: 15, status: 'locked' },
      { id: 'l8', title: 'CSS Grid', estimatedMinutes: 25, status: 'locked' },
      { id: 'l9', title: 'Responsive Layouts', estimatedMinutes: 15, status: 'locked' },
    ],
  },
  {
    id: 's3',
    title: 'Data Structures',
    description: 'Understand stacks, queues, trees and graphs with animated visualizations.',
    subject: 'Computer Science',
    level: 'advanced',
    coverEmoji: '🧠',
    agentName: 'CS Mentor',
    totalMinutes: 140,
    completedCount: 5,
    lessons: [
      { id: 'l10', title: 'Arrays & Linked Lists', estimatedMinutes: 25, status: 'completed' },
      { id: 'l11', title: 'Stacks & Queues', estimatedMinutes: 20, status: 'completed' },
      { id: 'l12', title: 'Hash Tables', estimatedMinutes: 25, status: 'completed' },
      { id: 'l13', title: 'Binary Trees', estimatedMinutes: 30, status: 'completed' },
      { id: 'l14', title: 'Graph Traversal', estimatedMinutes: 20, status: 'completed' },
      { id: 'l15', title: 'Dynamic Programming', estimatedMinutes: 20, status: 'available' },
    ],
  },
  {
    id: 's4',
    title: 'Python for Beginners',
    description: 'Start your programming journey with Python — clear, friendly and fun.',
    subject: 'Programming',
    level: 'beginner',
    coverEmoji: '🐍',
    agentName: 'Py Tutor',
    totalMinutes: 60,
    completedCount: 0,
    lessons: [
      { id: 'l16', title: 'Hello, Python!', estimatedMinutes: 10, status: 'available' },
      { id: 'l17', title: 'Variables & Types', estimatedMinutes: 15, status: 'locked' },
      { id: 'l18', title: 'Control Flow', estimatedMinutes: 20, status: 'locked' },
      { id: 'l19', title: 'Functions & Modules', estimatedMinutes: 15, status: 'locked' },
    ],
  },
])

// ─── State ────────────────────────────────────────────────────────────────────

const activeFilter = ref<'all' | DifficultyLevel>('all')
const searchQuery = ref('')
const expandedSuiteId = ref<string | null>('s1')

const filteredSuites = computed(() => {
  let list = suites.value
  if (activeFilter.value !== 'all') list = list.filter(s => s.level === activeFilter.value)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.subject.toLowerCase().includes(q) ||
      s.lessons.some(l => l.title.toLowerCase().includes(q))
    )
  }
  return list
})

function toggleSuite(id: string) {
  expandedSuiteId.value = expandedSuiteId.value === id ? null : id
}

function progressPct(suite: LessonSuite) {
  return Math.round((suite.completedCount / suite.lessons.length) * 100)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const levelConfig: Record<DifficultyLevel, { label: string; color: string; dot: string }> = {
  beginner:     { label: 'Beginner',     color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-500' },
  intermediate: { label: 'Intermediate', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800', dot: 'bg-amber-500' },
  advanced:     { label: 'Advanced',     color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800', dot: 'bg-red-500' },
}

const statusConfig: Record<LessonStatus, { icon: string; color: string; label: string }> = {
  locked:      { icon: 'i-lucide-lock',        color: 'text-neutral-300 dark:text-neutral-600',              label: 'Locked' },
  available:   { icon: 'i-lucide-circle',       color: 'text-neutral-400 dark:text-neutral-500',              label: 'Not started' },
  'in-progress': { icon: 'i-lucide-circle-dot', color: 'text-primary',                                        label: 'In progress' },
  completed:   { icon: 'i-lucide-circle-check', color: 'text-emerald-500',                                    label: 'Completed' },
}

const totalStats = computed(() => {
  const total = suites.value.reduce((a, s) => a + s.lessons.length, 0)
  const done = suites.value.reduce((a, s) => a + s.completedCount, 0)
  const mins = suites.value.reduce((a, s) => a + s.totalMinutes, 0)
  return { total, done, mins }
})
</script>

<template>
  <div class="h-full w-full overflow-y-auto nice-scroll bg-neutral-50 dark:bg-neutral-950">

    <!-- ── Hero header ── -->
    <div class="px-8 pt-8 pb-6 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <div class="w-full">
        <div class="flex items-start justify-between gap-6">
          <div>
            <h1 class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">My Learning</h1>
            <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Pick up where you left off or explore something new.</p>
          </div>

          <!-- Stats strip -->
          <div class="flex items-center gap-6 shrink-0">
            <div class="text-center">
              <p class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">{{ totalStats.done }}</p>
              <p class="text-[10px] text-neutral-400 uppercase tracking-wider mt-0.5">Completed</p>
            </div>
            <div class="w-px h-8 bg-neutral-200 dark:bg-neutral-700" />
            <div class="text-center">
              <p class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">{{ totalStats.total }}</p>
              <p class="text-[10px] text-neutral-400 uppercase tracking-wider mt-0.5">Lessons</p>
            </div>
            <div class="w-px h-8 bg-neutral-200 dark:bg-neutral-700" />
            <div class="text-center">
              <p class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">{{ Math.round(totalStats.mins / 60) }}h</p>
              <p class="text-[10px] text-neutral-400 uppercase tracking-wider mt-0.5">Content</p>
            </div>
          </div>
        </div>

        <!-- Search + filters -->
        <div class="flex items-center gap-3 mt-5">
          <div class="relative flex-1 max-w-xs">
            <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search lessons..."
              class="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
            />
          </div>
          <div class="flex items-center gap-1.5">
            <button
              v-for="f in (['all', 'beginner', 'intermediate', 'advanced'] as const)"
              :key="f"
              class="px-3 py-1.5 text-xs font-medium rounded-lg border transition-all capitalize"
              :class="activeFilter === f
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800'"
              @click="activeFilter = f"
            >
              {{ f === 'all' ? 'All levels' : f }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Suite cascade ── -->
    <div class="w-full px-8 py-6 space-y-4">

      <p v-if="!filteredSuites.length" class="text-center text-sm text-neutral-400 py-16">
        No suites match your search.
      </p>

      <!-- Suite card -->
      <div
        v-for="suite in filteredSuites"
        :key="suite.id"
        class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden transition-shadow hover:shadow-md"
      >
        <!-- Suite header row — always visible, click to expand/collapse -->
        <button
          class="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
          @click="toggleSuite(suite.id)"
        >
          <!-- Emoji + progress ring -->
          <div class="relative shrink-0 w-12 h-12 flex items-center justify-center">
            <!-- SVG progress ring -->
            <svg class="absolute inset-0 w-12 h-12 -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="3" class="text-neutral-100 dark:text-neutral-800" />
              <circle
                cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="3"
                class="text-primary transition-all duration-500"
                stroke-dasharray="125.6"
                :stroke-dashoffset="125.6 - (125.6 * progressPct(suite) / 100)"
                stroke-linecap="round"
              />
            </svg>
            <span class="text-xl leading-none z-10">{{ suite.coverEmoji }}</span>
          </div>

          <!-- Title + meta -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2.5 flex-wrap">
              <h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{{ suite.title }}</h3>
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize" :class="levelConfig[suite.level].color">
                {{ levelConfig[suite.level].label }}
              </span>
              <span v-if="suite.subject" class="text-[10px] text-neutral-400">{{ suite.subject }}</span>
            </div>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">{{ suite.description }}</p>

            <!-- Progress bar + stats -->
            <div class="flex items-center gap-3 mt-2">
              <div class="flex-1 max-w-48 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  class="h-full bg-primary rounded-full transition-all duration-500"
                  :style="`width: ${progressPct(suite)}%`"
                />
              </div>
              <span class="text-[10px] text-neutral-400 tabular-nums shrink-0">
                {{ suite.completedCount }}/{{ suite.lessons.length }} · {{ suite.totalMinutes }}min
              </span>
              <div v-if="suite.agentName" class="flex items-center gap-1 shrink-0">
                <UIcon name="i-lucide-bot" class="w-3 h-3 text-primary/50" />
                <span class="text-[10px] text-primary/60">{{ suite.agentName }}</span>
              </div>
            </div>
          </div>

          <!-- Expand chevron -->
          <UIcon
            name="i-lucide-chevron-down"
            class="w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-200"
            :class="expandedSuiteId === suite.id ? 'rotate-180' : ''"
          />
        </button>

        <!-- Lesson list — cascaded, collapsible -->
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div v-if="expandedSuiteId === suite.id" class="border-t border-neutral-100 dark:border-neutral-800">

            <!-- Lesson rows -->
            <div
              v-for="(lesson, idx) in suite.lessons"
              :key="lesson.id"
              class="group flex items-center gap-4 px-5 py-3 border-b border-neutral-50 dark:border-neutral-800/60 last:border-b-0 transition-colors"
              :class="lesson.status === 'locked'
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer'"
            >
              <!-- Step connector line -->
              <div class="flex flex-col items-center shrink-0 self-stretch">
                <div
                  v-if="idx > 0"
                  class="w-px flex-1 mb-1"
                  :class="suite.lessons[idx - 1]?.status === 'completed' ? 'bg-primary/30' : 'bg-neutral-200 dark:bg-neutral-700'"
                />
                <div v-else class="w-px flex-1 mb-1 bg-transparent" />
                <!-- Status icon -->
                <UIcon
                  :name="statusConfig[lesson.status].icon"
                  class="w-4 h-4 shrink-0"
                  :class="statusConfig[lesson.status].color"
                />
                <div
                  v-if="idx < suite.lessons.length - 1"
                  class="w-px flex-1 mt-1"
                  :class="lesson.status === 'completed' ? 'bg-primary/30' : 'bg-neutral-200 dark:bg-neutral-700'"
                />
                <div v-else class="w-px flex-1 mt-1 bg-transparent" />
              </div>

              <!-- Lesson info -->
              <div class="flex-1 min-w-0 py-0.5">
                <div class="flex items-center gap-2">
                  <p
                    class="text-sm font-medium leading-snug"
                    :class="lesson.status === 'locked'
                      ? 'text-neutral-400 dark:text-neutral-600'
                      : lesson.status === 'completed'
                        ? 'text-neutral-500 dark:text-neutral-400 line-through'
                        : 'text-neutral-800 dark:text-neutral-200'"
                  >
                    {{ lesson.title }}
                  </p>
                  <span
                    v-if="lesson.status === 'in-progress'"
                    class="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                  >
                    Continue
                  </span>
                </div>
                <p class="text-[11px] text-neutral-400 mt-0.5">{{ lesson.estimatedMinutes }} min</p>
              </div>

              <!-- CTA -->
              <div class="shrink-0">
                <template v-if="lesson.status === 'locked'">
                  <UIcon name="i-lucide-lock" class="w-4 h-4 text-neutral-300 dark:text-neutral-700" />
                </template>
                <template v-else-if="lesson.status === 'completed'">
                  <span class="text-[10px] text-emerald-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Review</span>
                </template>
                <template v-else>
                  <button
                    class="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                    :class="lesson.status === 'in-progress'
                      ? 'bg-primary text-white shadow-sm hover:brightness-110'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary'"
                  >
                    <UIcon :name="lesson.status === 'in-progress' ? 'i-lucide-play' : 'i-lucide-arrow-right'" class="w-3 h-3" />
                    {{ lesson.status === 'in-progress' ? 'Continue' : 'Start' }}
                  </button>
                </template>
              </div>
            </div>

            <!-- Suite footer CTA -->
            <div class="flex items-center justify-between px-5 py-3 bg-neutral-50 dark:bg-neutral-800/30">
              <span class="text-xs text-neutral-400">
                <template v-if="progressPct(suite) === 100">
                  🎉 Suite complete!
                </template>
                <template v-else>
                  {{ progressPct(suite) }}% complete
                </template>
              </span>
              <button
                v-if="suite.agentName"
                class="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <UIcon name="i-lucide-bot" class="w-3.5 h-3.5" />
                Chat with {{ suite.agentName }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>
