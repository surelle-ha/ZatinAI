<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useModelStore, type WorkspaceModel, type ModelPlatform } from '~/stores/models'

const modelStore = useModelStore()
onMounted(() => modelStore.fetchModels())

// ─── Form state ───────────────────────────────────────────────────────────────

const showModal = ref(false)
const editingModel = ref<WorkspaceModel | null>(null)
const saving = ref(false)
const modalError = ref<string | null>(null)
const showToken = ref(false)

const OLLAMA_DEFAULT_HOST = 'http://localhost:11434'

const form = ref({
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

// Auto-fill hostUrl when platform changes
watch(() => form.value.platform, (p) => {
  if (p === 'enterprise' && (!form.value.hostUrl || form.value.hostUrl === '')) {
    form.value.hostUrl = OLLAMA_DEFAULT_HOST
  }
})

function openNew(prefill?: Partial<typeof form.value>) {
  editingModel.value = null
  showToken.value = false
  form.value = {
    label: prefill?.label ?? '',
    value: prefill?.value ?? '',
    provider: prefill?.provider ?? '',
    description: prefill?.description ?? '',
    contextWindow: prefill?.contextWindow ?? '',
    platform: prefill?.platform ?? 'enterprise',
    hostUrl: prefill?.hostUrl ?? OLLAMA_DEFAULT_HOST,
    apiToken: '',
    sortOrder: modelStore.models.length,
    isActive: true,
  }
  modalError.value = null
  showModal.value = true
}

function openEdit(model: WorkspaceModel) {
  editingModel.value = model
  showToken.value = false
  form.value = {
    label: model.label,
    value: model.value,
    provider: model.provider,
    description: model.description,
    contextWindow: model.contextWindow,
    platform: model.platform ?? 'enterprise',
    hostUrl: model.hostUrl ?? OLLAMA_DEFAULT_HOST,
    apiToken: model.apiToken ?? '',
    sortOrder: model.sortOrder,
    isActive: model.isActive,
  }
  modalError.value = null
  showModal.value = true
}

// Exposed so marketplace can trigger openNew with prefill
defineExpose({ openNew })

async function saveForm() {
  if (!form.value.label.trim() || !form.value.value.trim() || saving.value) return
  saving.value = true
  modalError.value = null
  try {
    if (editingModel.value) {
      await modelStore.updateModel(editingModel.value.id, { ...form.value })
    } else {
      await modelStore.createModel({ ...form.value })
    }
    showModal.value = false
  } catch (e: any) {
    modalError.value = e?.data?.message ?? e.message ?? 'Save failed'
  } finally {
    saving.value = false
  }
}

async function deleteModel(model: WorkspaceModel) {
  if (!confirm(`Delete "${model.label}"? This cannot be undone.`)) return
  try {
    await modelStore.removeModel(model.id)
    showModal.value = false
  } catch (e: any) {
    console.error('Delete failed', e)
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function providerColor(provider?: string) {
  const map: Record<string, string> = {
    'MiniMax':   'from-sky-500 to-blue-600',
    'Zhipu AI':  'from-violet-500 to-purple-600',
    'OpenAI':    'from-emerald-500 to-teal-600',
    'Anthropic': 'from-orange-400 to-amber-500',
  }
  return map[provider ?? ''] ?? 'from-gray-400 to-gray-500'
}

function providerInitial(label?: string) {
  return (label ?? '?').charAt(0).toUpperCase()
}

const platformOptions = [
  { label: 'Enterprise', value: 'enterprise' },
  { label: 'Third-party API', value: 'third-party' },
]
</script>

<template>
  <UDashboardPanel id="models-panel">
    <template #header>
      <UDashboardNavbar title="Models">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #trailing>
          <UButton icon="i-lucide-plus" size="sm" color="primary" label="Add Model" @click="openNew()" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-6 max-w-3xl mx-auto">

        <div class="mb-6">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Configure which models are available in Studio. Only <span class="font-medium text-gray-700 dark:text-gray-300">active</span> models appear in the agent model picker.
          </p>
        </div>

        <!-- Loading -->
        <div v-if="modelStore.loading" class="flex items-center gap-2 text-sm text-gray-400 py-12 justify-center">
          <UIcon name="i-lucide-loader" class="w-4 h-4 animate-spin" />
          Loading models...
        </div>

        <!-- Error -->
        <div v-else-if="modelStore.error" class="text-sm text-red-500 py-8 text-center">
          {{ modelStore.error }}
          <UButton size="xs" variant="ghost" color="primary" label="Retry" class="ml-2" @click="modelStore.fetchModels()" />
        </div>

        <!-- Empty -->
        <div v-else-if="!modelStore.models.length" class="rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 py-20 flex flex-col items-center gap-3 text-center">
          <div class="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <UIcon name="i-lucide-cpu" class="w-6 h-6 text-gray-400" />
          </div>
          <p class="text-sm font-medium text-gray-600 dark:text-gray-400">No models configured</p>
          <UButton size="sm" color="primary" icon="i-lucide-plus" label="Add your first model" @click="openNew()" />
        </div>

        <!-- Model list -->
        <div v-else class="flex flex-col gap-3">
          <div
            v-for="model in modelStore.models"
            :key="model.id"
            class="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex items-center gap-4 transition-all"
            :class="!model.isActive ? 'opacity-50' : ''"
          >
            <!-- Icon -->
            <div class="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br" :class="providerColor(model.provider)">
              {{ providerInitial(model.label) }}
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ model.label }}</p>
                <span class="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{{ model.value }}</span>
                <span v-if="model.contextWindow" class="text-[10px] text-gray-400 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded-full">{{ model.contextWindow }}</span>
                <!-- Platform badge -->
                <span
                  class="text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
                  :class="model.platform === 'enterprise'
                    ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 border-sky-200 dark:border-sky-800'
                    : 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800'"
                >
                  {{ model.platform === 'enterprise' ? 'Enterprise' : 'Third-party' }}
                </span>
              </div>
              <p v-if="model.provider" class="text-xs text-gray-400 mt-0.5">{{ model.provider }}</p>
              <p class="text-[11px] text-gray-400 mt-0.5 font-mono truncate">{{ model.hostUrl }}</p>
            </div>

            <!-- Toggle + actions -->
            <div class="flex items-center gap-3 shrink-0">
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-400 select-none">{{ model.isActive ? 'Active' : 'Inactive' }}</span>
                <button
                  class="relative w-9 h-5 rounded-full transition-colors focus:outline-none"
                  :class="model.isActive ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'"
                  @click="modelStore.toggleActive(model.id)"
                >
                  <span class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" :class="model.isActive ? 'translate-x-4' : 'translate-x-0'" />
                </button>
              </div>
              <UButton icon="i-lucide-pencil" size="xs" variant="ghost" color="neutral" class="opacity-0 group-hover:opacity-100 transition-opacity" @click="openEdit(model)" />
              <UButton icon="i-lucide-trash-2" size="xs" variant="ghost" color="error" class="opacity-0 group-hover:opacity-100 transition-opacity" @click="deleteModel(model)" />
            </div>
          </div>
        </div>

        <p v-if="modelStore.models.length" class="text-xs text-gray-400 dark:text-gray-500 mt-4 text-right">
          {{ modelStore.activeModels.length }} of {{ modelStore.models.length }} models active
        </p>
      </div>
    </template>
  </UDashboardPanel>

  <!-- ── Add / Edit Modal ── -->
  <UModal
    v-model:open="showModal"
    :title="editingModel ? `Edit — ${editingModel.label}` : 'Add Model'"
    :ui="{ width: 'sm:max-w-lg' }"
  >
    <template #body>
      <div class="space-y-4 py-1">

        <!-- Platform selector -->
        <UFormField label="Platform">
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="opt in platformOptions"
              :key="opt.value"
              class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition-all"
              :class="form.platform === opt.value
                ? 'border-primary bg-primary/5 text-primary font-medium'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'"
              @click="form.platform = opt.value as ModelPlatform"
            >
              <UIcon :name="opt.value === 'enterprise' ? 'i-lucide-building-2' : 'i-lucide-globe'" class="w-4 h-4 shrink-0" />
              {{ opt.label }}
            </button>
          </div>
        </UFormField>

        <!-- Host URL — always shown, pre-filled for enterprise -->
        <UFormField label="Host URL" :hint="form.platform === 'enterprise' ? 'Enterprise inference host' : 'Base URL of the API endpoint'">
          <UInput v-model="form.hostUrl" placeholder="http://localhost:11434" class="w-full font-mono text-xs" />
        </UFormField>

        <!-- API Token — only for third-party -->
        <UFormField v-if="form.platform === 'third-party'" label="API Token" hint="Bearer token sent in Authorization header">
          <div class="relative">
            <UInput
              v-model="form.apiToken"
              :type="showToken ? 'text' : 'password'"
              placeholder="sk-..."
              class="w-full font-mono text-xs pr-10"
            />
            <button
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              @click="showToken = !showToken"
            >
              <UIcon :name="showToken ? 'i-lucide-eye-off' : 'i-lucide-eye'" class="w-4 h-4" />
            </button>
          </div>
        </UFormField>

        <div class="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Display Name" required>
              <UInput v-model="form.label" placeholder="e.g. MiniMax M2" class="w-full" autofocus />
            </UFormField>
            <UFormField label="Model ID" required>
              <UInput v-model="form.value" placeholder="e.g. minimax-m2:cloud" class="w-full font-mono text-xs" />
            </UFormField>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Provider">
              <UInput v-model="form.provider" placeholder="e.g. MiniMax" class="w-full" />
            </UFormField>
            <UFormField label="Context Window">
              <UInput v-model="form.contextWindow" placeholder="e.g. 1M, 128K" class="w-full" />
            </UFormField>
          </div>
          <UFormField label="Description">
            <UTextarea v-model="form.description" placeholder="Brief description..." :rows="2" class="w-full" />
          </UFormField>
          <div class="flex items-center gap-4">
            <UFormField label="Sort Order" class="w-24">
              <UInput v-model.number="form.sortOrder" type="number" min="0" class="w-full" />
            </UFormField>
            <div class="flex items-center gap-2 mt-5">
              <button
                class="relative w-9 h-5 rounded-full transition-colors"
                :class="form.isActive ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'"
                @click="form.isActive = !form.isActive"
              >
                <span class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" :class="form.isActive ? 'translate-x-4' : 'translate-x-0'" />
              </button>
              <span class="text-sm text-gray-600 dark:text-gray-400 select-none">{{ form.isActive ? 'Active' : 'Inactive' }}</span>
            </div>
          </div>
        </div>

        <p v-if="modalError" class="text-xs text-red-500 flex items-center gap-1.5">
          <UIcon name="i-lucide-alert-circle" class="w-3.5 h-3.5 shrink-0" />
          {{ modalError }}
        </p>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-between w-full">
        <UButton v-if="editingModel" color="error" variant="ghost" label="Delete" icon="i-lucide-trash-2" :loading="saving" @click="deleteModel(editingModel!)" />
        <div class="flex gap-2 ml-auto">
          <UButton color="neutral" variant="ghost" label="Cancel" @click="showModal = false" />
          <UButton color="primary" label="Save" icon="i-lucide-check" :loading="saving" :disabled="!form.label.trim() || !form.value.trim()" @click="saveForm" />
        </div>
      </div>
    </template>
  </UModal>
</template>
