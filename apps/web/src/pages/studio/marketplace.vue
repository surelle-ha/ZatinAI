<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useModelStore, type WorkspaceModel, type ModelPlatform } from '~/stores/models'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModelCard {
  id: string
  name: string
  value: string
  provider: string
  description: string
  tags: string[]
  contextWindow: string
  speed: 'Fast' | 'Medium' | 'Slow'
  icon: string
  color: string
  disabled?: boolean
}

interface AgentCard {
  id: string
  name: string
  description: string
  tags: string[]
  fileCount: number
  author: string
  downloads: number
  filename: string
  exportData: object
}

// ─── Active section ───────────────────────────────────────────────────────────

type Section = 'models' | 'agents' | 'memory' | 'integrations'
const activeSection = ref<Section>('models')

const modelStore = useModelStore()
onMounted(() => modelStore.fetchModels())

// ─── Configure modal (opened from marketplace when model not configured) ──────

const OLLAMA_DEFAULT_HOST = 'https://ollama-models-001.up.railway.app'

const showConfigureModal = ref(false)
const configureSaving = ref(false)
const configureError = ref<string | null>(null)
const showConfigureToken = ref(false)

const configureForm = ref({
  label: '',
  value: '',
  provider: '',
  description: '',
  contextWindow: '',
  platform: 'enterprise' as ModelPlatform,
  hostUrl: OLLAMA_DEFAULT_HOST,
  apiToken: '',
  sortOrder: 0,
  isActive: true,
})

const platformOptions = [
  { label: 'Enterprise', value: 'enterprise' },
  { label: 'Third-party API', value: 'third-party' },
]

watch(() => configureForm.value.platform, (p) => {
  if (p === 'enterprise') configureForm.value.hostUrl = OLLAMA_DEFAULT_HOST
})

function openConfigureModal(model: typeof models[0]) {
  configureError.value = null
  showConfigureToken.value = false
  configureForm.value = {
    label: model.name,
    value: model.value,
    provider: model.provider,
    description: model.description,
    contextWindow: model.contextWindow,
    platform: 'enterprise',
    hostUrl: OLLAMA_DEFAULT_HOST,
    apiToken: '',
    sortOrder: modelStore.models.length,
    isActive: true,
  }
  showConfigureModal.value = true
}

async function saveConfigureForm() {
  if (!configureForm.value.label.trim() || !configureForm.value.value.trim() || configureSaving.value) return
  configureSaving.value = true
  configureError.value = null
  try {
    await modelStore.createModel({ ...configureForm.value })
    showConfigureModal.value = false
  } catch (e: any) {
    configureError.value = e?.message ?? 'Failed to add model'
  } finally {
    configureSaving.value = false
  }
}

// Cross-reference marketplace model value against live store to get real active status
function isModelActive(value: string): boolean {
  if (modelStore.models.length === 0) return true // still loading — assume active
  return modelStore.models.some(m => m.value === value && m.isActive)
}
function isModelInStore(value: string): boolean {
  return modelStore.models.some(m => m.value === value)
}

const sections: { id: Section; label: string; icon: string; count?: number }[] = [
  { id: 'models',       label: 'Models',       icon: 'i-lucide-cpu'  },
  { id: 'agents',       label: 'Agents',        icon: 'i-lucide-bot',           count: 4  },
  { id: 'memory',       label: 'Memory Shards', icon: 'i-lucide-database',      count: 0  },
  { id: 'integrations', label: 'Integrations',  icon: 'i-lucide-plug',          count: 0  },
]

// ─── Models ───────────────────────────────────────────────────────────────────

const models: ModelCard[] = [
  {
    id: 'glm-5',
    name: 'GLM-5',
    value: 'glm-5:cloud',
    provider: 'Zhipu AI',
    description: 'Next-generation bilingual language model with strong reasoning, coding, and long-context understanding up to 128K tokens.',
    tags: ['Reasoning', 'Coding', 'Bilingual', '128K'],
    contextWindow: '128K',
    speed: 'Medium',
    icon: 'i-lucide-zap',
    color: 'from-violet-500 to-purple-600',
  },
  {
    id: 'minimax-m2',
    name: 'MiniMax M2',
    value: 'minimax-m2:cloud',
    provider: 'MiniMax',
    description: 'High-performance mixture-of-experts model optimized for multi-turn conversation, instruction following, and creative tasks.',
    tags: ['MoE', 'Creative', 'Multi-turn', '1M'],
    contextWindow: '1M',
    speed: 'Fast',
    icon: 'i-lucide-sparkles',
    color: 'from-sky-500 to-blue-600',
  },
  {
    id: 'qwen3.5',
    name: 'Qwen 3.5',
    value: 'qwen3.5:cloud',
    provider: 'Alibaba',
    description: 'Versatile large language model with strong performance across reasoning, coding, and multilingual tasks, supporting up to 128K context.',
    tags: ['Versatile', 'Multilingual', '128K'],
    contextWindow: '128K',
    speed: 'Medium',
    icon: 'i-lucide-globe',
    color: 'from-green-500 to-emerald-600',
  },
  {
    id: 'qwen3-coder-next',
    name: 'Qwen 3 Coder Next',
    value: 'qwen3-coder-next:cloud',
    provider: 'Alibaba',
    description: 'Specialized coding model with deep understanding of programming languages, optimized for code generation, debugging, and explanation tasks.',
    tags: ['Coding', 'Debugging', '128K'],
    contextWindow: '128K',
    speed: 'Medium',
    icon: 'i-lucide-code',
    color: 'from-green-500 to-emerald-600',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    value: 'gpt-4o',
    provider: 'OpenAI',
    description: "OpenAI's flagship multimodal model with strong reasoning, vision, and tool use capabilities.",
    tags: ['Multimodal', 'Vision', 'Tools', '128K'],
    contextWindow: '128K',
    speed: 'Fast',
    icon: 'i-lucide-sparkles',
    color: 'from-gray-400 to-gray-500',
    disabled: true,
  },
  {
    id: 'claude-sonnet',
    name: 'Claude Sonnet',
    value: 'claude-sonnet-4-5',
    provider: 'Anthropic',
    description: "Anthropic's balanced model — strong at reasoning, coding, and nuanced instruction following with a focus on safety.",
    tags: ['Reasoning', 'Coding', 'Safety', '200K'],
    contextWindow: '200K',
    speed: 'Fast',
    icon: 'i-lucide-shield',
    color: 'from-gray-400 to-gray-500',
    disabled: true,
  },
]

// ─── Agents ───────────────────────────────────────────────────────────────────

const featuredAgents: AgentCard[] = [
  {
    id: 'customer-support',
    name: 'Customer Support',
    description: 'Handles customer inquiries with empathy, escalation rules, and product knowledge. Equipped with FAQ and refund policy files.',
    tags: ['Support', 'CX', 'FAQ'],
    fileCount: 4,
    author: 'Marketplace',
    downloads: 1240,
    filename: 'customer-support-agent.json',
    exportData: {
      version: 1,
      exportedAt: new Date().toISOString(),
      agent: {
        name: 'Customer Support',
        model: 'minimax-m2:cloud',
        files: [
          { name: 'bootstrap.md', content: '# Customer Support — Bootstrap\n\nYou are a helpful customer support agent.\n\nRead and follow all instruction files: `rules.md`, `tone.md`, `escalation.md`.', sortOrder: 0, isBootstrap: true },
          { name: 'rules.md', content: '# Rules\n\n- Always greet the customer warmly\n- Never make promises you cannot keep\n- Offer refunds within 30 days\n- Escalate billing issues to a human', sortOrder: 1, isBootstrap: false },
          { name: 'tone.md', content: '# Tone\n\n- Empathetic and patient\n- Professional but warm\n- Avoid jargon', sortOrder: 2, isBootstrap: false },
          { name: 'escalation.md', content: '# Escalation\n\nEscalate when:\n- Customer is extremely upset\n- Issue involves legal or financial risk\n- You cannot resolve in 3 exchanges', sortOrder: 3, isBootstrap: false },
        ],
      },
    },
  },
  {
    id: 'code-reviewer',
    name: 'Code Reviewer',
    description: 'Reviews code for bugs, security issues, and best practices. Gives structured feedback with severity levels.',
    tags: ['Dev', 'Review', 'Security'],
    fileCount: 3,
    author: 'Marketplace',
    downloads: 893,
    filename: 'code-reviewer-agent.json',
    exportData: {
      version: 1,
      exportedAt: new Date().toISOString(),
      agent: {
        name: 'Code Reviewer',
        model: 'glm-5:cloud',
        files: [
          { name: 'bootstrap.md', content: '# Code Reviewer — Bootstrap\n\nYou are an expert code reviewer.\n\nFollow: `rules.md`, `severity.md`.', sortOrder: 0, isBootstrap: true },
          { name: 'rules.md', content: '# Rules\n\n- Check for security vulnerabilities first\n- Look for logic errors\n- Suggest idiomatic improvements\n- Be specific, cite line numbers when possible', sortOrder: 1, isBootstrap: false },
          { name: 'severity.md', content: '# Severity Levels\n\n- 🔴 Critical: Security, data loss\n- 🟡 Warning: Logic error, edge case\n- 🔵 Info: Style, readability', sortOrder: 2, isBootstrap: false },
        ],
      },
    },
  },
  {
    id: 'content-writer',
    name: 'Content Writer',
    description: 'Writes blogs, social posts, and marketing copy. Adapts to brand voice and produces SEO-optimized content.',
    tags: ['Writing', 'SEO', 'Marketing'],
    fileCount: 3,
    author: 'Marketplace',
    downloads: 654,
    filename: 'content-writer-agent.json',
    exportData: {
      version: 1,
      exportedAt: new Date().toISOString(),
      agent: {
        name: 'Content Writer',
        model: 'minimax-m2:cloud',
        files: [
          { name: 'bootstrap.md', content: '# Content Writer — Bootstrap\n\nYou are a skilled content writer.\n\nFollow: `rules.md`, `seo.md`.', sortOrder: 0, isBootstrap: true },
          { name: 'rules.md', content: '# Rules\n\n- Write in active voice\n- Use short paragraphs (3-4 sentences)\n- Start with a hook\n- End with a CTA', sortOrder: 1, isBootstrap: false },
          { name: 'seo.md', content: '# SEO\n\n- Use target keyword in first 100 words\n- Include 2-3 LSI keywords\n- Suggest a meta description', sortOrder: 2, isBootstrap: false },
        ],
      },
    },
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'Interprets data, writes SQL queries, and explains statistical concepts. Great for business intelligence tasks.',
    tags: ['Data', 'SQL', 'Analytics'],
    fileCount: 3,
    author: 'Marketplace',
    downloads: 421,
    filename: 'data-analyst-agent.json',
    exportData: {
      version: 1,
      exportedAt: new Date().toISOString(),
      agent: {
        name: 'Data Analyst',
        model: 'glm-5:cloud',
        files: [
          { name: 'bootstrap.md', content: '# Data Analyst — Bootstrap\n\nYou are an expert data analyst.\n\nFollow: `rules.md`, `sql.md`.', sortOrder: 0, isBootstrap: true },
          { name: 'rules.md', content: '# Rules\n\n- Always clarify what the user wants to measure\n- Explain your reasoning step by step\n- Suggest visualizations when relevant', sortOrder: 1, isBootstrap: false },
          { name: 'sql.md', content: '# SQL Guidelines\n\n- Use CTEs for readability\n- Comment complex logic\n- Always consider performance (indexes, LIMIT)', sortOrder: 2, isBootstrap: false },
        ],
      },
    },
  },
]

// ─── Import ───────────────────────────────────────────────────────────────────

function downloadAgent(agent: AgentCard) {
  const blob = new Blob([JSON.stringify(agent.exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = agent.filename
  a.click()
  URL.revokeObjectURL(url)
}

function useInStudio(agent: AgentCard) {
  // Queue the agent for auto-import when Studio initializes
  sessionStorage.setItem('marketplace:import', JSON.stringify(agent.exportData))
  navigateTo('/studio')
}

// ─── Speed badge color ────────────────────────────────────────────────────────

function speedColor(speed: ModelCard['speed']) {
  return speed === 'Fast' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800'
    : speed === 'Medium' ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800'
      : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
}

function formatDownloads(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}
</script>

<template>
  <UDashboardPanel id="marketplace-panel">
    <template #header>
      <UDashboardNavbar title="Marketplace">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <!-- ── Configure Model Modal (opened from marketplace) ── -->
        <UModal v-model:open="showConfigureModal" title="Add Model to Workspace" :ui="{ width: 'sm:max-w-lg' }">
          <template #body>
            <div class="space-y-4 py-1">
              <!-- Platform selector -->
              <UFormField label="Platform">
                <div class="grid grid-cols-2 gap-2">
                  <button
                    v-for="opt in platformOptions"
                    :key="opt.value"
                    class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition-all"
                    :class="configureForm.platform === opt.value
                ? 'border-primary bg-primary/5 text-primary font-medium'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'"
                    @click="configureForm.platform = opt.value as ModelPlatform"
                  >
                    <UIcon :name="opt.value === 'enterprise' ? 'i-lucide-building-2' : 'i-lucide-globe'" class="w-4 h-4 shrink-0" />
                    {{ opt.label }}
                  </button>
                </div>
              </UFormField>

              <UFormField label="Host URL" :hint="configureForm.platform === 'enterprise' ? 'Enterprise inference host' : 'Base URL of the API endpoint'">
                <UInput v-model="configureForm.hostUrl" placeholder="http://localhost:11434" class="w-full font-mono text-xs" />
              </UFormField>

              <UFormField v-if="configureForm.platform === 'third-party'" label="API Token" hint="Bearer token sent in Authorization header">
                <div class="relative">
                  <UInput
                    v-model="configureForm.apiToken"
                    :type="showConfigureToken ? 'text' : 'password'"
                    placeholder="sk-..."
                    class="w-full font-mono text-xs pr-10"
                  />
                  <button class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" @click="showConfigureToken = !showConfigureToken">
                    <UIcon :name="showConfigureToken ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="w-4 h-4" />
                  </button>
                </div>
              </UFormField>

              <div class="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-3">
                <div class="grid grid-cols-2 gap-3">
                  <UFormField label="Display Name" required>
                    <UInput v-model="configureForm.label" class="w-full" />
                  </UFormField>
                  <UFormField label="Model ID" required>
                    <UInput v-model="configureForm.value" class="w-full font-mono text-xs" />
                  </UFormField>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <UFormField label="Provider">
                    <UInput v-model="configureForm.provider" class="w-full" />
                  </UFormField>
                  <UFormField label="Context Window">
                    <UInput v-model="configureForm.contextWindow" class="w-full" />
                  </UFormField>
                </div>
              </div>

              <p v-if="configureError" class="text-xs text-red-500 flex items-center gap-1.5">
                <UIcon name="i-lucide-alert-circle" class="w-3.5 h-3.5 shrink-0" />
                {{ configureError }}
              </p>
            </div>
          </template>
          <template #footer>
            <div class="flex gap-2 ml-auto">
              <UButton color="neutral" variant="ghost" label="Cancel" @click="showConfigureModal = false" />
              <UButton color="primary" label="Add Model" icon="i-lucide-plus" :loading="configureSaving" :disabled="!configureForm.label.trim() || !configureForm.value.trim()" @click="saveConfigureForm" />
            </div>
          </template>
        </UModal>
        <template #trailing>
          <span class="text-xs text-gray-400 dark:text-gray-500 font-mono">Browse &amp; extend your workspace</span>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex h-full min-h-0">

        <!-- ═══ LEFT NAV ═══ -->
        <div class="w-52 shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col py-3 gap-0.5 px-2">
          <button
            v-for="s in sections"
            :key="s.id"
            class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left"
            :class="activeSection === s.id
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
            @click="activeSection = s.id"
          >
            <UIcon :name="s.icon" class="w-4 h-4 shrink-0" />
            <span class="flex-1">{{ s.label }}</span>
            <span
              v-if="s.count !== undefined"
              class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              :class="s.count === 0
                ? 'text-gray-400 bg-gray-100 dark:bg-gray-800'
                : activeSection === s.id
                  ? 'text-primary bg-primary/15'
                  : 'text-gray-500 bg-gray-100 dark:bg-gray-800'"
            >{{ s.count }}</span>
          </button>
        </div>

        <!-- ═══ CONTENT ═══ -->
        <div class="flex-1 min-w-0 overflow-y-auto">

          <!-- ── Models ── -->
          <div v-if="activeSection === 'models'" class="p-6 max-w-4xl">
            <div class="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Models</h2>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Language models available in your workspace. Click a model or use the button to configure.</p>
              </div>
              <UButton size="sm" variant="soft" color="primary" icon="i-lucide-settings" label="Manage Models" @click="navigateTo('/studio/models')" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                v-for="model in models"
                :key="model.id"
                class="group relative rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 flex flex-col gap-4 transition-all duration-200"
                :class="model.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/40 hover:shadow-md dark:hover:shadow-none'"
                @click="!model.disabled && (isModelInStore(model.value) ? navigateTo('/studio/models') : openConfigureModal(model))"
              >
                <!-- Top row -->
                <div class="flex items-start gap-3">
                  <div class="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" :class="`bg-gradient-to-br ${model.color}`">
                    <UIcon :name="model.icon" class="w-5 h-5 text-white" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">{{ model.name }}</p>
                      <span :class="speedColor(model.speed)" class="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border">{{ model.speed }}</span>
                    </div>
                    <p class="text-xs text-gray-400 mt-0.5">{{ model.provider }}</p>
                  </div>
                </div>

                <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{{ model.description }}</p>

                <!-- Tags + context -->
                <div class="flex items-center gap-2 flex-wrap">
                  <span
                    v-for="tag in model.tags"
                    :key="tag"
                    class="text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  >{{ tag }}</span>
                </div>

                <!-- Footer -->
                <div class="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800">
                  <span class="text-[11px] text-gray-400 flex items-center gap-1">
                    <UIcon name="i-lucide-layers" class="w-3 h-3" />
                    {{ model.contextWindow }} context
                  </span>
                  <template v-if="model.disabled">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-full">Coming Soon</span>
                  </template>
                  <template v-else-if="!isModelInStore(model.value)">
                    <button
                      class="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 hover:underline"
                      @click.stop="openConfigureModal(model)"
                    >
                      <UIcon name="i-lucide-plus-circle" class="w-3 h-3" />
                      Add to workspace
                    </button>
                  </template>
                  <template v-else-if="isModelActive(model.value)">
                    <span class="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      Active
                    </span>
                  </template>
                  <template v-else>
                    <span class="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                      Inactive
                    </span>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Agents ── -->
          <div v-else-if="activeSection === 'agents'" class="p-6 max-w-4xl">
            <div class="mb-6">
              <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Agents</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Pre-built agent configurations. Download the file and import it in Studio, or use it directly.</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                v-for="agent in featuredAgents"
                :key="agent.id"
                class="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 flex flex-col gap-3 hover:border-primary/40 hover:shadow-md dark:hover:shadow-none transition-all duration-200"
              >
                <!-- Header -->
                <div class="flex items-start gap-3">
                  <div class="w-9 h-9 rounded-xl shrink-0 bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {{ agent.name.charAt(0) }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">{{ agent.name }}</p>
                    <p class="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                      <UIcon name="i-lucide-file-text" class="w-3 h-3" />
                      {{ agent.fileCount }} instruction files
                    </p>
                  </div>
                </div>

                <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed flex-1">{{ agent.description }}</p>

                <!-- Tags -->
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span
                    v-for="tag in agent.tags"
                    :key="tag"
                    class="text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  >{{ tag }}</span>
                </div>

                <!-- Footer -->
                <div class="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span class="text-[11px] text-gray-400 flex items-center gap-1">
                    <UIcon name="i-lucide-download" class="w-3 h-3" />
                    {{ formatDownloads(agent.downloads) }} downloads
                  </span>
                  <div class="flex items-center gap-1.5">
                    <UButton
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      icon="i-lucide-download"
                      label="Download"
                      @click="downloadAgent(agent)"
                    />
                    <UButton
                      size="xs"
                      variant="soft"
                      color="primary"
                      icon="i-lucide-arrow-right"
                      label="Use in Studio"
                      @click="useInStudio(agent)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Memory Shards ── -->
          <div v-else-if="activeSection === 'memory'" class="p-6 max-w-4xl">
            <div class="mb-6">
              <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Memory Shards</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Predefined or shared memory blocks that can be injected into any agent's context.</p>
            </div>

            <div class="rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 py-20 flex flex-col items-center gap-3 text-center">
              <div class="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <UIcon name="i-lucide-database" class="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">No memory shards yet</p>
                <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs">Memory shards will appear here once they are published to the marketplace.</p>
              </div>
              <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-full">Coming Soon</span>
            </div>
          </div>

          <!-- ── Integrations ── -->
          <div v-else-if="activeSection === 'integrations'" class="p-6 max-w-4xl">
            <div class="mb-6">
              <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Integrations</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Connect your agents to external platforms and messaging services.</p>
            </div>

            <!-- Placeholder cards -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <div
                v-for="platform in [
                  { name: 'Viber',   icon: 'i-lucide-message-circle', color: 'bg-violet-100 dark:bg-violet-950 text-violet-500' },
                  { name: 'Discord', icon: 'i-lucide-headphones',      color: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-500' },
                  { name: 'Slack',   icon: 'i-lucide-hash',             color: 'bg-pink-100 dark:bg-pink-950 text-pink-500'    },
                  { name: 'Telegram',icon: 'i-lucide-send',             color: 'bg-sky-100 dark:bg-sky-950 text-sky-500'       },
                  { name: 'WhatsApp',icon: 'i-lucide-phone',            color: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-500' },
                  { name: 'Email',   icon: 'i-lucide-mail',             color: 'bg-amber-100 dark:bg-amber-950 text-amber-500' },
                ]"
                :key="platform.name"
                class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex flex-col items-center gap-3 opacity-60 select-none"
              >
                <div class="w-10 h-10 rounded-xl flex items-center justify-center" :class="platform.color">
                  <UIcon :name="platform.icon" class="w-5 h-5" />
                </div>
                <p class="text-xs font-medium text-gray-600 dark:text-gray-400">{{ platform.name }}</p>
                <span class="text-[9px] font-bold uppercase tracking-wider text-gray-400 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-full">Soon</span>
              </div>
            </div>

            <div class="rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 py-10 flex flex-col items-center gap-2 text-center">
              <UIcon name="i-lucide-plug" class="w-6 h-6 text-gray-300 dark:text-gray-600" />
              <p class="text-xs text-gray-400 dark:text-gray-500 max-w-xs">Integrations are coming soon. Connect your agents to messaging platforms and automate workflows.</p>
            </div>
          </div>

        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
