<script setup lang="ts">
import { ref, computed } from 'vue'

// ─── Types ────────────────────────────────────────────────────────────────────

type IntegrationStatus = 'connected' | 'disconnected' | 'coming_soon'
type IntegrationCategory = 'messaging' | 'legal' | 'cms' | 'web'

interface Integration {
  id: string
  name: string
  description: string
  category: IntegrationCategory
  status: IntegrationStatus
  logoType: 'icon' | 'image'
  logo?: string          // URL for image logos
  icon?: string          // lucide icon name for icon logos
  iconBg?: string        // tailwind gradient class
  configFields?: ConfigField[]
  connectedAt?: number
  connectedAgent?: string
}

interface ConfigField {
  key: string
  label: string
  type: 'text' | 'password' | 'textarea' | 'select' | 'code'
  placeholder?: string
  hint?: string
  options?: { label: string; value: string }[]
  value: string
  readOnly?: boolean
}

// ─── Mock agents ─────────────────────────────────────────────────────────────

const agents = ref([
  { id: 'a1', name: 'Customer Support' },
  { id: 'a2', name: 'Code Reviewer' },
  { id: 'a3', name: 'Content Writer' },
])

// ─── Integrations ─────────────────────────────────────────────────────────────

const integrations = ref<Integration[]>([
  {
    id: 'discord',
    name: 'Discord',
    description: 'Connect an agent to a Discord server. The agent will respond to messages in designated channels.',
    category: 'messaging',
    status: 'disconnected',
    logoType: 'icon',
    icon: 'i-lucide-message-square',
    iconBg: 'from-indigo-500 to-indigo-600',
    connectedAgent: '',
    configFields: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: 'Starts with MT... or OD...', hint: 'From the Discord Developer Portal → Bot → Token', value: '' },
      { key: 'channel_id', label: 'Channel ID', type: 'text', placeholder: 'e.g. 1234567890123456789', hint: 'Right-click a channel → Copy Channel ID', value: '' },
      { key: 'prefix', label: 'Command Prefix', type: 'text', placeholder: '! or / or leave blank for all messages', value: '' },
    ],
  },
  {
    id: 'phone',
    name: 'Phone Call',
    description: 'Let agents answer inbound phone calls using text-to-speech and speech-to-text via a telephony provider.',
    category: 'messaging',
    status: 'coming_soon',
    logoType: 'icon',
    icon: 'i-lucide-phone',
    iconBg: 'from-emerald-500 to-teal-600',
    configFields: [],
  },
  {
    id: 'sms',
    name: 'SMS',
    description: 'Send and receive SMS messages through Twilio or similar providers. Agents reply automatically to inbound messages.',
    category: 'messaging',
    status: 'disconnected',
    logoType: 'icon',
    icon: 'i-lucide-message-circle',
    iconBg: 'from-sky-500 to-blue-600',
    connectedAgent: '',
    configFields: [
      { key: 'provider', label: 'Provider', type: 'select', value: 'twilio', options: [{ label: 'Twilio', value: 'twilio' }, { label: 'Vonage', value: 'vonage' }, { label: 'MessageBird', value: 'messagebird' }] },
      { key: 'account_sid', label: 'Account SID', type: 'text', placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', value: '' },
      { key: 'auth_token', label: 'Auth Token', type: 'password', placeholder: 'Your auth token', value: '' },
      { key: 'from_number', label: 'From Number', type: 'text', placeholder: '+1 555 000 0000', hint: 'The number you purchased from the provider', value: '' },
    ],
  },
  {
    id: 'clio',
    name: 'Clio',
    description: 'Integrate with Clio legal practice management. Agents can access matters, contacts, and time entries.',
    category: 'legal',
    status: 'disconnected',
    logoType: 'image',
    logo: 'https://telewizard.ai/ar/assets/img/logos/clio.png',
    connectedAgent: '',
    configFields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'Your Clio API key', hint: 'Settings → API Keys in your Clio account', value: '' },
      { key: 'region', label: 'Region', type: 'select', value: 'us', options: [{ label: 'United States', value: 'us' }, { label: 'Canada', value: 'ca' }, { label: 'EU', value: 'eu' }, { label: 'Australia', value: 'au' }] },
      { key: 'webhook_url', label: 'Webhook URL', type: 'text', placeholder: 'Auto-generated after connect', hint: 'Paste this into Clio → Settings → Webhooks', value: 'https://api.yourapp.com/webhooks/clio', readOnly: true },
    ],
  },
  {
    id: 'wordpress',
    name: 'WordPress',
    description: 'Embed an agent chat widget on any WordPress site using the official plugin or shortcode.',
    category: 'cms',
    status: 'disconnected',
    logoType: 'icon',
    icon: 'i-lucide-globe',
    iconBg: 'from-blue-500 to-blue-700',
    connectedAgent: '',
    configFields: [
      { key: 'site_url', label: 'WordPress Site URL', type: 'text', placeholder: 'https://yoursite.com', value: '' },
      { key: 'api_key', label: 'Plugin API Key', type: 'password', placeholder: 'Generated after plugin install', hint: 'Install the Tetragram plugin → copy the API key', value: '' },
      { key: 'shortcode', label: 'Shortcode', type: 'code', placeholder: '', hint: 'Paste anywhere on your WordPress pages', value: '[tetragram-chat agent="customer-support"]', readOnly: true },
    ],
  },
  {
    id: 'embed',
    name: 'Embeddable Script',
    description: 'Add a floating chat widget to any website by pasting a single script tag into your HTML.',
    category: 'web',
    status: 'disconnected',
    logoType: 'icon',
    icon: 'i-lucide-code-2',
    iconBg: 'from-violet-500 to-purple-600',
    connectedAgent: '',
    configFields: [
      { key: 'allowed_origins', label: 'Allowed Origins', type: 'text', placeholder: 'https://yoursite.com', hint: 'Comma-separated list of domains allowed to embed the widget', value: '' },
      { key: 'widget_color', label: 'Widget Accent Color', type: 'text', placeholder: '#6366f1', value: '#6366f1' },
      {
        key: 'embed_code',
        label: 'Embed Script',
        type: 'code',
        value: `<script src="https://cdn.yourapp.com/widget.js"
  data-agent-id="YOUR_AGENT_ID"
  data-theme="light">
<\/script>`,
        hint: 'Paste before </body> on every page',
        readOnly: true,
      },
    ],
  },
])

// ─── Category filter ──────────────────────────────────────────────────────────

type FilterCategory = 'all' | IntegrationCategory
const activeFilter = ref<FilterCategory>('all')

const filters: { id: FilterCategory; label: string; icon: string }[] = [
  { id: 'all',       label: 'All',       icon: 'i-lucide-layout-grid' },
  { id: 'messaging', label: 'Messaging', icon: 'i-lucide-message-circle' },
  { id: 'legal',     label: 'Legal',     icon: 'i-lucide-scale' },
  { id: 'cms',       label: 'CMS',       icon: 'i-lucide-globe' },
  { id: 'web',       label: 'Web',       icon: 'i-lucide-code-2' },
]

const filtered = computed(() =>
  activeFilter.value === 'all'
    ? integrations.value
    : integrations.value.filter(i => i.category === activeFilter.value)
)

const connectedCount = computed(() => integrations.value.filter(i => i.status === 'connected').length)

// ─── Config / connect modal ───────────────────────────────────────────────────

const showModal = ref(false)
const activeIntegration = ref<Integration | null>(null)
const saving = ref(false)
const showSecrets = ref<Record<string, boolean>>({})
const copied = ref<Record<string, boolean>>({})

function openIntegration(integration: Integration) {
  if (integration.status === 'coming_soon') return
  activeIntegration.value = integration
  showSecrets.value = {}
  showModal.value = true
}

function toggleSecret(key: string) {
  showSecrets.value[key] = !showSecrets.value[key]
}

async function copyToClipboard(key: string, value: string) {
  await navigator.clipboard.writeText(value)
  copied.value[key] = true
  setTimeout(() => { copied.value[key] = false }, 2000)
}

function connect() {
  if (!activeIntegration.value) return
  saving.value = true
  setTimeout(() => {
    if (!activeIntegration.value) return
    activeIntegration.value.status = 'connected'
    activeIntegration.value.connectedAt = Date.now()
    saving.value = false
    showModal.value = false
  }, 1000)
}

function disconnect(integration: Integration) {
  if (!confirm(`Disconnect ${integration.name}? The agent will stop responding on this channel.`)) return
  integration.status = 'disconnected'
  integration.connectedAt = undefined
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

function categoryLabel(cat: IntegrationCategory) {
  const map: Record<IntegrationCategory, string> = { messaging: 'Messaging', legal: 'Legal', cms: 'CMS', web: 'Web' }
  return map[cat]
}
</script>

<template>
  <UDashboardPanel id="integrations-panel">
    <template #header>
      <UDashboardNavbar title="Integrations">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #trailing>
          <span v-if="connectedCount" class="text-xs text-gray-400 dark:text-gray-500">
            {{ connectedCount }} connected
          </span>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 max-w-5xl mx-auto">

        <!-- Page description -->
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Connect your agents to external platforms. Each integration routes incoming messages to a bound agent and delivers its responses back through the same channel.
        </p>

        <!-- Category filter -->
        <div class="flex items-center gap-1.5 mb-6 flex-wrap">
          <button
            v-for="f in filters"
            :key="f.id"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            :class="activeFilter === f.id
              ? 'bg-primary/10 text-primary'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
            @click="activeFilter = f.id"
          >
            <UIcon :name="f.icon" class="w-3.5 h-3.5" />
            {{ f.label }}
          </button>
        </div>

        <!-- Integration grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="integration in filtered"
            :key="integration.id"
            class="group relative rounded-2xl border bg-white dark:bg-gray-900 p-5 flex flex-col gap-4 transition-all duration-200"
            :class="[
              integration.status === 'coming_soon'
                ? 'border-gray-200 dark:border-gray-800 opacity-60 cursor-not-allowed'
                : 'border-gray-200 dark:border-gray-800 cursor-pointer hover:border-primary/40 hover:shadow-md dark:hover:shadow-none',
              integration.status === 'connected'
                ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/10'
                : '',
            ]"
            @click="openIntegration(integration)"
          >
            <!-- Logo + status -->
            <div class="flex items-start justify-between">
              <!-- Logo -->
              <div
                v-if="integration.logoType === 'icon'"
                class="w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br shrink-0"
                :class="integration.iconBg"
              >
                <UIcon :name="integration.icon!" class="w-5 h-5 text-white" />
              </div>
              <div v-else class="w-11 h-11 rounded-xl flex items-center justify-center bg-white border border-gray-200 dark:border-gray-700 shrink-0 overflow-hidden p-1.5">
                <img :src="integration.logo" :alt="integration.name" class="w-full h-full object-contain" />
              </div>

              <!-- Status badge -->
              <span
                class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                :class="integration.status === 'connected'
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800'
                  : integration.status === 'coming_soon'
                    ? 'text-gray-400 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    : 'text-gray-500 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'"
              >
                {{ integration.status === 'connected' ? '● Connected' : integration.status === 'coming_soon' ? 'Soon' : '○ Not connected' }}
              </span>
            </div>

            <!-- Name + description -->
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ integration.name }}</p>
                <span class="text-[9px] font-medium text-gray-400 uppercase tracking-wider border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded">
                  {{ categoryLabel(integration.category) }}
                </span>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{{ integration.description }}</p>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
              <span v-if="integration.status === 'connected' && integration.connectedAt" class="text-[11px] text-gray-400">
                Since {{ formatDate(integration.connectedAt) }}
              </span>
              <span v-else-if="integration.status === 'coming_soon'" class="text-[11px] text-gray-400 italic">Available soon</span>
              <span v-else class="text-[11px] text-gray-400">Click to configure</span>

              <UButton
                v-if="integration.status === 'connected'"
                size="xs"
                variant="ghost"
                color="error"
                label="Disconnect"
                @click.stop="disconnect(integration)"
              />
              <UButton
                v-else-if="integration.status !== 'coming_soon'"
                size="xs"
                variant="soft"
                color="primary"
                label="Connect"
                icon="i-lucide-plug"
                @click.stop="openIntegration(integration)"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <!-- ── Integration Config Modal ── -->
  <UModal
    v-if="activeIntegration"
    v-model:open="showModal"
    :title="activeIntegration.name"
    :ui="{ width: 'sm:max-w-lg' }"
  >
    <template #header>
      <div class="flex items-center gap-3 px-4 pt-4 pb-0">
        <!-- Logo -->
        <div
          v-if="activeIntegration.logoType === 'icon'"
          class="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br shrink-0"
          :class="activeIntegration.iconBg"
        >
          <UIcon :name="activeIntegration.icon!" class="w-4 h-4 text-white" />
        </div>
        <div v-else class="w-9 h-9 rounded-lg flex items-center justify-center bg-white border border-gray-200 dark:border-gray-700 shrink-0 overflow-hidden p-1">
          <img :src="activeIntegration.logo" :alt="activeIntegration.name" class="w-full h-full object-contain" />
        </div>

        <div>
          <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ activeIntegration.name }}</p>
          <p class="text-xs text-gray-400">{{ activeIntegration.status === 'connected' ? 'Connected' : 'Not connected' }}</p>
        </div>
      </div>
    </template>

    <template #body>
      <div class="space-y-4 py-1">

        <!-- Agent binding -->
        <UFormField label="Bound Agent" hint="Messages on this channel will be handled by this agent">
          <USelect
            v-model="activeIntegration.connectedAgent"
            :items="agents.map(a => ({ label: a.name, value: a.id }))"
            placeholder="Select an agent…"
            class="w-full"
          />
        </UFormField>

        <!-- Config fields -->
        <template v-for="field in activeIntegration.configFields" :key="field.key">
          <UFormField :label="field.label" :hint="field.hint">

            <!-- Select -->
            <USelect
              v-if="field.type === 'select'"
              v-model="field.value"
              :items="field.options ?? []"
              class="w-full"
            />

            <!-- Code / read-only block -->
            <div v-else-if="field.type === 'code'" class="relative">
              <pre class="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-mono text-gray-700 dark:text-gray-300 px-3 py-2.5 whitespace-pre-wrap leading-relaxed">{{ field.value }}</pre>
              <button
                class="absolute top-2 right-2 text-[10px] font-medium px-2 py-1 rounded-md transition-colors"
                :class="copied[field.key] ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'"
                @click="copyToClipboard(field.key, field.value)"
              >
                {{ copied[field.key] ? '✓ Copied' : 'Copy' }}
              </button>
            </div>

            <!-- Password with show/hide -->
            <div v-else-if="field.type === 'password'" class="relative">
              <UInput
                v-model="field.value"
                :type="showSecrets[field.key] ? 'text' : 'password'"
                :placeholder="field.placeholder"
                :disabled="field.readOnly"
                class="w-full font-mono text-xs pr-10"
              />
              <button
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                @click="toggleSecret(field.key)"
              >
                <UIcon :name="showSecrets[field.key] ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="w-4 h-4" />
              </button>
            </div>

            <!-- Text -->
            <div v-else class="relative">
              <UInput
                v-model="field.value"
                :placeholder="field.placeholder"
                :disabled="field.readOnly"
                :class="['w-full', field.readOnly ? 'font-mono text-xs' : '']"
              />
              <button
                v-if="field.readOnly"
                class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                @click="copyToClipboard(field.key, field.value)"
              >
                <UIcon :name="copied[field.key] ? 'i-lucide-check' : 'i-lucide-copy'" class="w-4 h-4" :class="copied[field.key] ? 'text-emerald-500' : ''" />
              </button>
            </div>
          </UFormField>
        </template>

        <!-- Already connected warning -->
        <div v-if="activeIntegration.status === 'connected'" class="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <UIcon name="i-lucide-check-circle" class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <p class="text-xs text-emerald-700 dark:text-emerald-400">
            This integration is active. Changes will take effect immediately after saving.
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between w-full">
        <UButton
          v-if="activeIntegration.status === 'connected'"
          color="error"
          variant="ghost"
          icon="i-lucide-plug-zap"
          label="Disconnect"
          @click="disconnect(activeIntegration!); showModal = false"
        />
        <div class="flex gap-2 ml-auto">
          <UButton color="neutral" variant="ghost" label="Cancel" @click="showModal = false" />
          <UButton
            color="primary"
            :label="activeIntegration.status === 'connected' ? 'Save Changes' : 'Connect'"
            :icon="activeIntegration.status === 'connected' ? 'i-lucide-save' : 'i-lucide-plug'"
            :loading="saving"
            @click="connect"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
