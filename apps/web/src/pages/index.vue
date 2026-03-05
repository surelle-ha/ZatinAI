<script setup lang="ts">
import { ref, computed } from 'vue'

// ─── Mock data matching the real app's shape ─────────────────────────────────

const stats = ref({
  totalMessages: 14_823,
  messagesToday: 342,
  messagesThisWeek: 2_109,
  avgResponseMs: 820,
  activeAgents: 3,
  totalAgents: 5,
  activeSessions: 12,
  totalSessions: 287,
  activeModels: 2,
  totalModels: 2,
  memoryShards: 3,
  memoryWords: 1_204,
  connectedIntegrations: 2,
  totalIntegrations: 6,
})

// ─── Message volume chart (last 14 days) ─────────────────────────────────────

const chartDays = Array.from({ length: 14 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() - (13 - i))
  return {
    label: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
    short: d.toLocaleDateString([], { weekday: 'short' }),
    value: Math.floor(Math.random() * 400) + 80,
  }
})
// Make last few days match "today"
chartDays[13].value = 342
chartDays[12].value = 289
chartDays[11].value = 401

const chartMax = computed(() => Math.max(...chartDays.map(d => d.value)))

function barHeight(val: number) {
  return Math.max(4, Math.round((val / chartMax.value) * 100))
}

// ─── Agents ──────────────────────────────────────────────────────────────────

const agents = ref([
  { id: 1, name: 'Customer Support', model: 'minimax-m2:cloud', sessions: 142, messages: 6_821, active: true, lastActive: Date.now() - 120000 },
  { id: 2, name: 'Code Reviewer',    model: 'glm-5:cloud',      sessions: 89,  messages: 4_102, active: true, lastActive: Date.now() - 3600000 },
  { id: 3, name: 'Content Writer',   model: 'minimax-m2:cloud', sessions: 56,  messages: 3_900, active: true, lastActive: Date.now() - 7200000 },
  { id: 4, name: 'Data Analyst',     model: 'glm-5:cloud',      sessions: 0,   messages: 0,     active: false, lastActive: null },
  { id: 5, name: 'Legal Assistant',  model: 'minimax-m2:cloud', sessions: 0,   messages: 0,     active: false, lastActive: null },
])

// ─── Models usage ─────────────────────────────────────────────────────────────

const modelUsage = ref([
  { name: 'MiniMax M2', value: 'minimax-m2:cloud', requests: 9_802, pct: 66, color: 'bg-primary' },
  { name: 'GLM-5',      value: 'glm-5:cloud',      requests: 5_021, pct: 34, color: 'bg-neutral-400 dark:bg-neutral-600' },
])

// ─── Memory shards ────────────────────────────────────────────────────────────

const shards = ref([
  { id: 'sh1', name: 'User Preferences',    words: 847,  agents: 2, updatedAt: Date.now() - 3600000 },
  { id: 'sh2', name: 'Ongoing Context',     words: 357,  agents: 1, updatedAt: Date.now() - 1800000 },
  { id: 'sh3', name: 'Cross-agent Knowledge', words: 0,  agents: 4, updatedAt: null },
])

// ─── Integrations ─────────────────────────────────────────────────────────────

const integrations = ref([
  { id: 'discord',   name: 'Discord',            connected: true,  messages: 1_204, icon: 'i-lucide-message-square', color: 'bg-primary' },
  { id: 'sms',       name: 'SMS',                connected: true,  messages: 893,   icon: 'i-lucide-message-circle', color: 'bg-primary' },
  { id: 'wordpress', name: 'WordPress',          connected: false, messages: 0,     icon: 'i-lucide-globe',          color: 'bg-blue-500' },
  { id: 'clio',      name: 'Clio',               connected: false, messages: 0,     icon: 'i-lucide-scale',          color: 'bg-neutral-500' },
  { id: 'embed',     name: 'Embeddable Script',  connected: false, messages: 0,     icon: 'i-lucide-code-2',         color: 'bg-neutral-400 dark:bg-neutral-600' },
  { id: 'phone',     name: 'Phone',              connected: false, messages: 0,     icon: 'i-lucide-phone',          color: 'bg-neutral-400' },
])

// ─── Recent activity feed ─────────────────────────────────────────────────────

const activity = ref([
  { id: 1, type: 'message',     text: 'Customer Support handled 12 messages',   agent: 'Customer Support', icon: 'i-lucide-message-circle', color: 'text-primary',     time: Date.now() - 60000 * 3 },
  { id: 2, type: 'memory',      text: 'User Preferences shard updated',          agent: 'Customer Support', icon: 'i-lucide-brain',           color: 'text-primary',  time: Date.now() - 60000 * 12 },
  { id: 3, type: 'session',     text: 'New session started',                     agent: 'Code Reviewer',    icon: 'i-lucide-plus-circle',     color: 'text-emerald-500', time: Date.now() - 60000 * 34 },
  { id: 4, type: 'integration', text: 'SMS — 43 messages routed',                agent: 'Customer Support', icon: 'i-lucide-message-circle',  color: 'text-blue-500',    time: Date.now() - 60000 * 60 },
  { id: 5, type: 'message',     text: 'Content Writer completed 8 responses',    agent: 'Content Writer',   icon: 'i-lucide-message-circle',  color: 'text-primary',     time: Date.now() - 60000 * 90 },
  { id: 6, type: 'memory',      text: 'Ongoing Context shard updated',           agent: 'Customer Support', icon: 'i-lucide-brain',           color: 'text-primary',  time: Date.now() - 60000 * 130 },
  { id: 7, type: 'session',     text: 'Session ended after 24 exchanges',        agent: 'Code Reviewer',    icon: 'i-lucide-check-circle',    color: 'text-neutral-400',    time: Date.now() - 60000 * 180 },
])

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelative(ts: number) {
  const diff = Date.now() - ts
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

function formatNumber(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

const agentColors = ['bg-primary', 'bg-primary/80', 'bg-primary/60', 'bg-primary/40', 'bg-primary/30']
function agentColor(idx: number) {
  return agentColors[idx % agentColors.length]
}

// top agents by messages
const topAgents = computed(() =>
  [...agents.value].filter(a => a.messages > 0).sort((a, b) => b.messages - a.messages).slice(0, 3)
)
</script>

<template>
  <UDashboardPanel id="dashboard-panel">
    <template #header>
      <UDashboardNavbar title="Dashboard">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #trailing>
          <span class="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
            {{ new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) }}
          </span>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="overflow-y-auto h-full">
        <div class="p-6 max-w-6xl mx-auto space-y-6">

          <!-- ═══ TOP STAT CARDS ═══ -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">

            <!-- Messages today -->
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 flex flex-col gap-3">
              <div class="flex items-start justify-between">
                <div class="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <UIcon name="i-lucide-message-circle" class="w-4 h-4 text-primary" />
                </div>
                <span class="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-full">Today</span>
              </div>
              <div>
                <p class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">{{ formatNumber(stats.messagesToday) }}</p>
                <p class="text-xs text-neutral-400 mt-0.5">Messages · {{ formatNumber(stats.totalMessages) }} total</p>
              </div>
            </div>

            <!-- Active agents -->
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 flex flex-col gap-3">
              <div class="flex items-start justify-between">
                <div class="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <UIcon name="i-lucide-bot" class="w-4 h-4 text-primary" />
                </div>
                <span class="text-[10px] font-medium text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-full">{{ stats.totalAgents }} total</span>
              </div>
              <div>
                <p class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">{{ stats.activeAgents }}</p>
                <p class="text-xs text-neutral-400 mt-0.5">Active agents</p>
              </div>
            </div>

            <!-- Avg response time -->
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 flex flex-col gap-3">
              <div class="flex items-start justify-between">
                <div class="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <UIcon name="i-lucide-timer" class="w-4 h-4 text-primary" />
                </div>
                <span class="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-full">Fast</span>
              </div>
              <div>
                <p class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">{{ stats.avgResponseMs }}<span class="text-sm font-normal text-neutral-400 ml-1">ms</span></p>
                <p class="text-xs text-neutral-400 mt-0.5">Avg response time</p>
              </div>
            </div>

            <!-- Integrations -->
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4 flex flex-col gap-3">
              <div class="flex items-start justify-between">
                <div class="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                  <UIcon name="i-lucide-plug" class="w-4 h-4 text-emerald-500" />
                </div>
                <span class="text-[10px] font-medium text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-full">{{ stats.totalIntegrations }} available</span>
              </div>
              <div>
                <p class="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">{{ stats.connectedIntegrations }}</p>
                <p class="text-xs text-neutral-400 mt-0.5">Connected integrations</p>
              </div>
            </div>
          </div>

          <!-- ═══ MESSAGE VOLUME + ACTIVITY ═══ -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

            <!-- Chart — 14 day message volume -->
            <div class="lg:col-span-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
              <div class="flex items-start justify-between mb-5">
                <div>
                  <p class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Message Volume</p>
                  <p class="text-xs text-neutral-400 mt-0.5">Last 14 days · {{ formatNumber(stats.messagesThisWeek) }} this week</p>
                </div>
                <div class="text-right">
                  <p class="text-lg font-bold text-neutral-900 dark:text-neutral-100">{{ formatNumber(stats.totalMessages) }}</p>
                  <p class="text-[10px] text-neutral-400">total messages</p>
                </div>
              </div>

              <!-- Bar chart -->
              <div class="flex items-end gap-1 h-28">
                <div
                  v-for="(day, i) in chartDays"
                  :key="i"
                  class="flex-1 flex flex-col items-center gap-1 group"
                >
                  <div class="relative w-full flex items-end justify-center" style="height: 88px">
                    <div
                      class="w-full rounded-t-sm transition-all"
                      :class="i === 13 ? 'bg-primary' : 'bg-neutral-200 dark:bg-neutral-700 group-hover:bg-primary/60'"
                      :style="`height: ${barHeight(day.value)}%`"
                      :title="`${day.label}: ${day.value} messages`"
                    />
                  </div>
                  <span
                    class="text-[9px] text-neutral-400"
                    :class="i % 2 !== 0 ? 'opacity-0' : ''"
                  >{{ day.short }}</span>
                </div>
              </div>
            </div>

            <!-- Activity feed -->
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 flex flex-col">
              <p class="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Recent Activity</p>
              <div class="flex-1 space-y-3 overflow-hidden">
                <div
                  v-for="item in activity"
                  :key="item.id"
                  class="flex items-start gap-2.5"
                >
                  <div class="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 mt-0.5">
                    <UIcon :name="item.icon" class="w-3 h-3" :class="item.color" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-xs text-neutral-700 dark:text-neutral-300 leading-snug">{{ item.text }}</p>
                    <p class="text-[10px] text-neutral-400 mt-0.5">{{ item.agent }} · {{ formatRelative(item.time) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ═══ AGENTS + MODELS ═══ -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

            <!-- Agents table -->
            <div class="lg:col-span-2 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
              <div class="flex items-center justify-between mb-4">
                <p class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Agents</p>
                <UButton size="xs" variant="ghost" color="primary" label="Open Studio" icon="i-lucide-arrow-right" trailing @click="navigateTo('/studio')" />
              </div>

              <div class="space-y-2">
                <div
                  v-for="(agent, i) in agents"
                  :key="agent.id"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  :class="!agent.active ? 'opacity-50' : ''"
                >
                  <!-- Avatar -->
                  <div class="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold text-white" :class="agentColor(i)">
                    {{ agent.name.charAt(0) }}
                  </div>
                  <!-- Info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <p class="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">{{ agent.name }}</p>
                      <span class="text-[9px] font-mono text-neutral-400 truncate hidden sm:block">{{ agent.model }}</span>
                    </div>
                    <p class="text-[11px] text-neutral-400">
                      {{ agent.sessions }} sessions · {{ formatNumber(agent.messages) }} messages
                    </p>
                  </div>
                  <!-- Status dot -->
                  <div class="flex items-center gap-1.5 shrink-0">
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      :class="agent.active ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'"
                    />
                    <span class="text-[10px] text-neutral-400">{{ agent.active ? (agent.lastActive ? formatRelative(agent.lastActive) : 'active') : 'inactive' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Model usage -->
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
              <div class="flex items-center justify-between mb-4">
                <p class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Models</p>
                <UButton size="xs" variant="ghost" color="primary" label="Manage" icon="i-lucide-arrow-right" trailing @click="navigateTo('/studio/models')" />
              </div>

              <div class="space-y-4">
                <div v-for="model in modelUsage" :key="model.value">
                  <div class="flex items-center justify-between mb-1.5">
                    <p class="text-xs font-medium text-neutral-700 dark:text-neutral-300">{{ model.name }}</p>
                    <span class="text-xs text-neutral-400">{{ model.pct }}%</span>
                  </div>
                  <div class="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <div class="h-full rounded-full transition-all" :class="model.color" :style="`width: ${model.pct}%`" />
                  </div>
                  <p class="text-[10px] text-neutral-400 mt-1">{{ formatNumber(model.requests) }} requests</p>
                </div>
              </div>

              <!-- Sessions stats -->
              <div class="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-2 gap-3">
                <div class="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2.5">
                  <p class="text-lg font-bold text-neutral-900 dark:text-neutral-100">{{ stats.activeSessions }}</p>
                  <p class="text-[10px] text-neutral-400">Active sessions</p>
                </div>
                <div class="rounded-xl bg-neutral-50 dark:bg-neutral-800/50 px-3 py-2.5">
                  <p class="text-lg font-bold text-neutral-900 dark:text-neutral-100">{{ stats.totalSessions }}</p>
                  <p class="text-[10px] text-neutral-400">Total sessions</p>
                </div>
              </div>
            </div>
          </div>

          <!-- ═══ MEMORY + INTEGRATIONS ═══ -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

            <!-- Memory shards -->
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <p class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Memory Shards</p>
                  <p class="text-xs text-neutral-400 mt-0.5">{{ stats.memoryWords.toLocaleString() }} words stored across {{ stats.memoryShards }} shards</p>
                </div>
                <UButton size="xs" variant="ghost" color="primary" label="Manage" icon="i-lucide-arrow-right" trailing @click="navigateTo('/studio/memory')" />
              </div>

              <div class="space-y-2">
                <div
                  v-for="shard in shards"
                  :key="shard.id"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  <div class="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <UIcon name="i-lucide-brain" class="w-4 h-4 text-primary" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-neutral-800 dark:text-neutral-200 truncate">{{ shard.name }}</p>
                    <p class="text-[11px] text-neutral-400">
                      {{ shard.words > 0 ? `${shard.words} words` : 'Empty' }}
                      · {{ shard.agents }} agent{{ shard.agents !== 1 ? 's' : '' }} bound
                    </p>
                  </div>
                  <div class="shrink-0 text-right">
                    <span v-if="shard.updatedAt" class="text-[10px] text-neutral-400">{{ formatRelative(shard.updatedAt) }}</span>
                    <span v-else class="text-[10px] text-neutral-300 dark:text-neutral-600 italic">never written</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Integrations status -->
            <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <p class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Integrations</p>
                  <p class="text-xs text-neutral-400 mt-0.5">{{ stats.connectedIntegrations }} of {{ stats.totalIntegrations }} connected</p>
                </div>
                <UButton size="xs" variant="ghost" color="primary" label="Manage" icon="i-lucide-arrow-right" trailing @click="navigateTo('/studio/integrations')" />
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div
                  v-for="integration in integrations"
                  :key="integration.id"
                  class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors"
                  :class="integration.connected
                    ? 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40'
                    : 'border-neutral-200 dark:border-neutral-800 opacity-50'"
                >
                  <div class="w-6 h-6 rounded-md flex items-center justify-center text-white shrink-0 text-[10px]" :class="integration.color">
                    <UIcon :name="integration.icon" class="w-3.5 h-3.5" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">{{ integration.name }}</p>
                    <p class="text-[10px] text-neutral-400">
                      <span v-if="integration.connected">{{ formatNumber(integration.messages) }} msgs</span>
                      <span v-else>Not connected</span>
                    </p>
                  </div>
                  <span
                    class="w-1.5 h-1.5 rounded-full shrink-0"
                    :class="integration.connected ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- ═══ QUICK ACTIONS ═══ -->
          <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
            <p class="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Quick Actions</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <button
                v-for="action in [
                  { label: 'New Chat',         icon: 'i-lucide-message-square-plus', color: 'text-primary bg-neutral-100 dark:bg-neutral-800',       route: '/studio' },
                  { label: 'New Agent',        icon: 'i-lucide-bot',                 color: 'text-primary bg-neutral-100 dark:bg-neutral-800', route: '/studio' },
                  { label: 'Add Model',        icon: 'i-lucide-cpu',                 color: 'text-primary bg-neutral-100 dark:bg-neutral-800',  route: '/studio/models' },
                  { label: 'New Shard',        icon: 'i-lucide-brain',               color: 'text-primary bg-neutral-100 dark:bg-neutral-800',     route: '/studio/memory' },
                  { label: 'Marketplace',      icon: 'i-lucide-store',               color: 'text-emerald-500 bg-neutral-100 dark:bg-neutral-800', route: '/studio/marketplace' },
                  { label: 'Integrations',     icon: 'i-lucide-plug',                color: 'text-primary bg-neutral-100 dark:bg-neutral-800', route: '/studio/integrations' },
                ]"
                :key="action.label"
                class="flex flex-col items-center gap-2 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-primary/40 hover:shadow-sm transition-all group"
                @click="navigateTo(action.route)"
              >
                <div class="w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110" :class="action.color.split(' ').slice(1).join(' ')">
                  <UIcon :name="action.icon" class="w-4.5 h-4.5" :class="action.color.split(' ')[0]" />
                </div>
                <span class="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 text-center leading-tight">{{ action.label }}</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
