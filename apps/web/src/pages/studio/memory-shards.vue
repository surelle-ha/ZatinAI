<script setup lang="ts">
import { ref, computed } from 'vue'

// ─── Types ────────────────────────────────────────────────────────────────────

type ShardVisibility = 'private' | 'shared'

interface MemoryShard {
  id: string
  name: string
  purpose: string              // human hint: what this shard is FOR
  visibility: ShardVisibility  // shared = multiple agents read+write same shard
  boundAgentIds: string[]
  content: string              // free-form text the AI edits freely — no structure
  updatedAt: number | null     // last time the AI touched it
  createdAt: number
}

// ─── Mock agents ──────────────────────────────────────────────────────────────

const availableAgents = ref([
  { id: 'a1', name: 'Customer Support' },
  { id: 'a2', name: 'Code Reviewer' },
  { id: 'a3', name: 'Content Writer' },
  { id: 'a4', name: 'Data Analyst' },
])

// ─── Mock shards ──────────────────────────────────────────────────────────────

const shards = ref<MemoryShard[]>([
  {
    id: 'sh1',
    name: 'User Preferences',
    purpose: 'Store anything learned about the user — communication style, expertise, preferences.',
    visibility: 'shared',
    boundAgentIds: ['a1', 'a3'],
    content: `User prefers concise answers. Dislikes bullet points — write in prose.
Works in fintech. Strong technical background — skip basics.
Timezone: UTC+8 (inferred from message times).
Prefers to be addressed by first name: Marco.
Gets frustrated with repetitive clarification questions — just attempt the task.`,
    updatedAt: Date.now() - 3600000,
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'sh2',
    name: 'Ongoing Context',
    purpose: 'Track open threads, unresolved tasks, and things to follow up on.',
    visibility: 'private',
    boundAgentIds: ['a1'],
    content: `Billing dispute open since Nov 12. Ticket #4821. User expects resolution this week.
User asked about upgrading to Pro plan — waiting on pricing confirmation.`,
    updatedAt: Date.now() - 1800000,
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'sh3',
    name: 'Cross-agent Knowledge',
    purpose: 'Shared pool for facts any agent discovers that others should know.',
    visibility: 'shared',
    boundAgentIds: ['a1', 'a2', 'a3', 'a4'],
    content: '',
    updatedAt: null,
    createdAt: Date.now() - 86400000 * 7,
  },
])

// ─── View state ───────────────────────────────────────────────────────────────

const activeShardId = ref<string | null>(shards.value[0]?.id ?? null)
const activeShard = computed(() => shards.value.find(s => s.id === activeShardId.value) ?? null)

// ─── Shard config modal ───────────────────────────────────────────────────────

const showModal = ref(false)
const editingShard = ref<MemoryShard | null>(null)
const form = ref({
  name: '',
  purpose: '',
  visibility: 'private' as ShardVisibility,
  boundAgentIds: [] as string[],
})

function openNew() {
  editingShard.value = null
  form.value = { name: '', purpose: '', visibility: 'private', boundAgentIds: [] }
  showModal.value = true
}

function openEdit(shard: MemoryShard) {
  editingShard.value = shard
  form.value = {
    name: shard.name,
    purpose: shard.purpose,
    visibility: shard.visibility,
    boundAgentIds: [...shard.boundAgentIds],
  }
  showModal.value = true
}

function toggleAgent(id: string) {
  const idx = form.value.boundAgentIds.indexOf(id)
  if (idx === -1) form.value.boundAgentIds.push(id)
  else form.value.boundAgentIds.splice(idx, 1)
}

function save() {
  if (!form.value.name.trim()) return
  if (editingShard.value) {
    Object.assign(editingShard.value, {
      name: form.value.name.trim(),
      purpose: form.value.purpose.trim(),
      visibility: form.value.visibility,
      boundAgentIds: [...form.value.boundAgentIds],
    })
  } else {
    const s: MemoryShard = {
      id: crypto.randomUUID(),
      name: form.value.name.trim(),
      purpose: form.value.purpose.trim(),
      visibility: form.value.visibility,
      boundAgentIds: [...form.value.boundAgentIds],
      content: '',
      updatedAt: null,
      createdAt: Date.now(),
    }
    shards.value.push(s)
    activeShardId.value = s.id
  }
  showModal.value = false
}

function deleteShard(shard: MemoryShard) {
  if (!confirm(`Delete "${shard.name}"? The AI's memory in this shard will be permanently lost.`)) return
  shards.value = shards.value.filter(s => s.id !== shard.id)
  if (activeShardId.value === shard.id) activeShardId.value = shards.value[0]?.id ?? null
  showModal.value = false
}

// ─── Clear memory ─────────────────────────────────────────────────────────────

const confirmClear = ref(false)

function clearMemory() {
  if (!activeShard.value) return
  activeShard.value.content = ''
  activeShard.value.updatedAt = null
  confirmClear.value = false
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelative(ts: number) {
  const diff = Date.now() - ts
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

const agentColorMap = ['bg-sky-500', 'bg-violet-500', 'bg-pink-500', 'bg-amber-500', 'bg-emerald-500']
function agentColor(agentId: string) {
  const idx = availableAgents.value.findIndex(a => a.id === agentId)
  return agentColorMap[idx % agentColorMap.length]
}

function agentName(id: string) {
  return availableAgents.value.find(a => a.id === id)?.name ?? id
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}
</script>

<template>
  <UDashboardPanel id="memory-panel">
    <template #header>
      <UDashboardNavbar title="Memory Shards">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #trailing>
          <UButton icon="i-lucide-plus" size="sm" color="primary" label="New Shard" @click="openNew" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="flex h-full min-h-0">

        <!-- ═══ LEFT — Shard list ═══ -->
        <div class="w-56 shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full min-h-0">
          <div class="px-3 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
            <p class="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Shards</p>
          </div>

          <div class="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
            <div
              v-for="shard in shards"
              :key="shard.id"
              class="group flex items-start justify-between gap-1 rounded-xl px-3 py-2.5 cursor-pointer transition-colors"
              :class="activeShardId === shard.id
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'"
              @click="activeShardId = shard.id"
            >
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <UIcon
                    :name="shard.visibility === 'shared' ? 'i-lucide-share-2' : 'i-lucide-lock'"
                    class="w-3 h-3 shrink-0"
                    :class="activeShardId === shard.id ? 'text-primary/60' : 'text-gray-400'"
                  />
                  <p class="text-sm font-medium truncate">{{ shard.name }}</p>
                </div>
                <p
                  class="text-[10px] mt-0.5 pl-4.5 truncate"
                  :class="activeShardId === shard.id ? 'text-primary/50' : 'text-gray-400'"
                >
                  <span v-if="shard.content">{{ wordCount(shard.content) }} words</span>
                  <span v-else class="italic">empty</span>
                  · {{ shard.boundAgentIds.length }} agent{{ shard.boundAgentIds.length !== 1 ? 's' : '' }}
                </p>
              </div>
              <button
                class="opacity-0 group-hover:opacity-50 hover:!opacity-100 shrink-0 mt-0.5 transition-opacity"
                @click.stop="openEdit(shard)"
              >
                <UIcon name="i-lucide-settings-2" class="w-3.5 h-3.5" />
              </button>
            </div>

            <div v-if="!shards.length" class="py-10 text-center">
              <UIcon name="i-lucide-brain" class="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
              <p class="text-xs text-gray-400">No shards</p>
            </div>
          </div>

          <div class="shrink-0 px-3 py-2.5 border-t border-gray-200 dark:border-gray-800">
            <button class="flex items-center gap-2 text-xs text-gray-400 hover:text-primary transition-colors" @click="openNew">
              <UIcon name="i-lucide-plus" class="w-3.5 h-3.5" />
              New Shard
            </button>
          </div>
        </div>

        <!-- ═══ RIGHT — Memory viewer ═══ -->
        <div class="flex-1 min-w-0 flex flex-col min-h-0">

          <!-- No selection -->
          <div v-if="!activeShard" class="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
            <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <UIcon name="i-lucide-brain" class="w-8 h-8 text-gray-300 dark:text-gray-600" />
            </div>
            <div>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">No shard selected</p>
              <p class="text-xs text-gray-400 mt-1 max-w-sm">
                A shard is a free-form memory space the AI writes to and reads from across conversations.
                Bind one to multiple agents and they'll share the same memory.
              </p>
            </div>
            <UButton icon="i-lucide-plus" size="sm" color="primary" label="New Shard" @click="openNew" />
          </div>

          <template v-else>
            <!-- Shard header -->
            <div class="shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">{{ activeShard.name }}</h2>
                    <span
                      class="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border"
                      :class="activeShard.visibility === 'shared'
                        ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 border-sky-200 dark:border-sky-800'
                        : 'text-gray-500 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'"
                    >
                      <UIcon :name="activeShard.visibility === 'shared' ? 'i-lucide-share-2' : 'i-lucide-lock'" class="w-2.5 h-2.5" />
                      {{ activeShard.visibility }}
                    </span>
                  </div>

                  <!-- Purpose — the human hint to the AI -->
                  <p v-if="activeShard.purpose" class="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">
                    "{{ activeShard.purpose }}"
                  </p>

                  <!-- Bound agents -->
                  <div class="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span class="text-[10px] text-gray-400 shrink-0">Agents:</span>
                    <span
                      v-for="agentId in activeShard.boundAgentIds"
                      :key="agentId"
                      class="text-[10px] font-medium px-2 py-0.5 rounded-full text-white"
                      :class="agentColor(agentId)"
                    >
                      {{ agentName(agentId) }}
                    </span>
                    <span v-if="!activeShard.boundAgentIds.length" class="text-[10px] text-amber-500 flex items-center gap-1">
                      <UIcon name="i-lucide-alert-circle" class="w-3 h-3" />
                      Not bound — AI cannot access this shard
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-1.5 shrink-0">
                  <UButton icon="i-lucide-settings-2" size="xs" variant="ghost" color="neutral" @click="openEdit(activeShard)" />
                  <UButton
                    v-if="activeShard.content"
                    size="xs"
                    variant="ghost"
                    color="error"
                    icon="i-lucide-eraser"
                    label="Clear"
                    @click="confirmClear = true"
                  />
                </div>
              </div>

              <!-- Meta row -->
              <div class="flex items-center gap-4 mt-3 text-[11px] text-gray-400">
                <span class="flex items-center gap-1">
                  <UIcon name="i-lucide-text" class="w-3 h-3" />
                  {{ wordCount(activeShard.content) }} words
                </span>
                <span v-if="activeShard.updatedAt" class="flex items-center gap-1">
                  <UIcon name="i-lucide-clock" class="w-3 h-3" />
                  AI last wrote {{ formatRelative(activeShard.updatedAt) }}
                </span>
                <span v-else class="flex items-center gap-1 text-gray-300 dark:text-gray-600 italic">
                  <UIcon name="i-lucide-clock" class="w-3 h-3" />
                  Never written
                </span>
              </div>
            </div>

            <!-- Memory content — raw view of what the AI has written -->
            <div class="flex-1 overflow-y-auto">
              <!-- Empty -->
              <div v-if="!activeShard.content" class="h-full flex flex-col items-center justify-center gap-3 text-center p-8">
                <div class="w-12 h-12 rounded-full border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center">
                  <UIcon name="i-lucide-brain" class="w-6 h-6 text-gray-300 dark:text-gray-600" />
                </div>
                <div>
                  <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Memory is empty</p>
                  <p class="text-xs text-gray-400 mt-1 max-w-xs">
                    The AI hasn't written anything here yet. Start a conversation with a bound agent and it will begin populating this shard.
                  </p>
                </div>
              </div>

              <!-- Content — displayed as raw AI text, read-only for humans -->
              <div v-else class="p-6 max-w-3xl">
                <div class="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 overflow-hidden">
                  <!-- Label bar -->
                  <div class="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <span class="flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
                      <UIcon name="i-lucide-brain" class="w-3.5 h-3.5" />
                      AI-managed memory — read only
                    </span>
                    <span class="text-[10px] text-gray-400">
                      {{ wordCount(activeShard.content) }} words · {{ activeShard.content.length }} chars
                    </span>
                  </div>
                  <!-- Raw content -->
                  <pre class="px-5 py-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-mono">{{ activeShard.content }}</pre>
                </div>

                <!-- Warning: human shouldn't edit, AI owns this -->
                <p class="text-[11px] text-gray-400 mt-3 flex items-center gap-1.5">
                  <UIcon name="i-lucide-info" class="w-3.5 h-3.5 shrink-0" />
                  This content is written and maintained by the AI. Clearing it resets the agent's memory for this shard.
                </p>
              </div>
            </div>
          </template>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- ── Shard config modal ── -->
  <UModal
    v-model:open="showModal"
    :title="editingShard ? `Configure — ${editingShard.name}` : 'New Memory Shard'"
    :ui="{ width: 'sm:max-w-md' }"
  >
    <template #body>
      <div class="space-y-5 py-1">

        <UFormField label="Name" required>
          <UInput v-model="form.name" placeholder="e.g. User Preferences" class="w-full" autofocus />
        </UFormField>

        <UFormField label="Purpose" hint="A hint describing what the AI should store here. Not written into memory itself.">
          <UTextarea
            v-model="form.purpose"
            placeholder="e.g. Store anything learned about the user — style, expertise, preferences."
            :rows="2"
            class="w-full"
          />
        </UFormField>

        <!-- Visibility -->
        <UFormField label="Visibility">
          <div class="grid grid-cols-2 gap-2 mt-1">
            <button
              class="flex flex-col gap-1 px-3 py-2.5 rounded-xl border text-left transition-all"
              :class="form.visibility === 'private' ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
              @click="form.visibility = 'private'"
            >
              <div class="flex items-center gap-1.5">
                <UIcon name="i-lucide-lock" class="w-3.5 h-3.5" :class="form.visibility === 'private' ? 'text-primary' : 'text-gray-400'" />
                <span class="text-xs font-medium" :class="form.visibility === 'private' ? 'text-primary' : 'text-gray-700 dark:text-gray-300'">Private</span>
              </div>
              <span class="text-[10px] text-gray-400 leading-snug">One agent. Isolated memory.</span>
            </button>
            <button
              class="flex flex-col gap-1 px-3 py-2.5 rounded-xl border text-left transition-all"
              :class="form.visibility === 'shared' ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'"
              @click="form.visibility = 'shared'"
            >
              <div class="flex items-center gap-1.5">
                <UIcon name="i-lucide-share-2" class="w-3.5 h-3.5" :class="form.visibility === 'shared' ? 'text-primary' : 'text-gray-400'" />
                <span class="text-xs font-medium" :class="form.visibility === 'shared' ? 'text-primary' : 'text-gray-700 dark:text-gray-300'">Shared</span>
              </div>
              <span class="text-[10px] text-gray-400 leading-snug">Multiple agents share one memory.</span>
            </button>
          </div>
        </UFormField>

        <!-- Bound agents -->
        <UFormField label="Bound Agents" hint="These agents read from and write to this shard during conversations">
          <div class="flex flex-col gap-1.5 mt-1">
            <button
              v-for="agent in availableAgents"
              :key="agent.id"
              class="flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all"
              :class="form.boundAgentIds.includes(agent.id)
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'"
              @click="toggleAgent(agent.id)"
            >
              <div class="w-6 h-6 rounded-md shrink-0 flex items-center justify-center text-[10px] font-bold text-white" :class="agentColor(agent.id)">
                {{ agent.name.charAt(0) }}
              </div>
              <span class="text-sm flex-1 text-left" :class="form.boundAgentIds.includes(agent.id) ? 'text-primary font-medium' : 'text-gray-700 dark:text-gray-300'">
                {{ agent.name }}
              </span>
              <UIcon v-if="form.boundAgentIds.includes(agent.id)" name="i-lucide-check" class="w-3.5 h-3.5 text-primary" />
            </button>
          </div>
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between w-full">
        <UButton v-if="editingShard" color="error" variant="ghost" icon="i-lucide-trash-2" label="Delete" @click="deleteShard(editingShard!)" />
        <div class="flex gap-2 ml-auto">
          <UButton color="neutral" variant="ghost" label="Cancel" @click="showModal = false" />
          <UButton color="primary" label="Save" icon="i-lucide-check" :disabled="!form.name.trim()" @click="save" />
        </div>
      </div>
    </template>
  </UModal>

  <!-- ── Confirm clear ── -->
  <UModal v-model:open="confirmClear" title="Clear Memory?" :ui="{ width: 'sm:max-w-sm' }">
    <template #body>
      <p class="text-sm text-gray-600 dark:text-gray-400 py-1">
        This will erase everything the AI has written in <strong>{{ activeShard?.name }}</strong>.
        All bound agents will lose this memory and start fresh.
      </p>
    </template>
    <template #footer>
      <div class="flex gap-2 ml-auto">
        <UButton color="neutral" variant="ghost" label="Cancel" @click="confirmClear = false" />
        <UButton color="error" icon="i-lucide-eraser" label="Clear Memory" @click="clearMemory" />
      </div>
    </template>
  </UModal>
</template>
