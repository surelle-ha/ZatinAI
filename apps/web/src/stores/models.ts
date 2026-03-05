import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type ModelPlatform = 'enterprise' | 'third-party'

export interface WorkspaceModel {
  id: number
  label: string
  value: string
  provider: string
  description: string
  contextWindow: string
  platform: ModelPlatform
  hostUrl: string
  apiToken: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export const useModelStore = defineStore('models', () => {
  const models = ref<WorkspaceModel[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const activeModels = computed(() =>
    models.value
      .filter(m => m.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  )

  const modelOptions = computed(() =>
    activeModels.value.map(m => ({ label: m.label, value: m.value }))
  )

  const defaultModel = computed(() => activeModels.value[0]?.value ?? '')

  // ─── Internal fetch ───────────────────────────────────────────────────────
  // Mirrors the apiFetch pattern in ChatWithAgentSuites.vue — same auth token,
  // same workspace header, same apiBase from runtimeConfig.

  async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const config = useRuntimeConfig()
    const sessionStore = (await import('~/stores/session')).useSessionStore()
    const workspaceStore = (await import('~/stores/workspace')).useWorkspaceStore()

    const base = config.public.apiBase as string

    const headers: Record<string, string> = {}
    if (options.body) headers['Content-Type'] = 'application/json'
    if (sessionStore.accessToken) headers['Authorization'] = `Bearer ${sessionStore.accessToken}`
    if (workspaceStore.activeWorkspaceId) headers['x-workspace-id'] = String(workspaceStore.activeWorkspaceId)

    const res = await fetch(`${base}${path}`, {
      ...options,
      headers: { ...headers, ...(options.headers as Record<string, string> ?? {}) },
    })

    if (res.status === 401) {
      const refreshed = await sessionStore.refresh()
      if (!refreshed) { navigateTo('/auth/sign-in'); throw new Error('Unauthorized') }
      const retry = await fetch(`${base}${path}`, {
        ...options,
        headers: { ...headers, ...(options.headers as Record<string, string> ?? {}) },
      })
      if (!retry.ok) throw new Error(`API error ${retry.status}`)
      if (retry.status === 204) return undefined as T
      const retryText = await retry.text()
      if (!retryText) return undefined as T
      return JSON.parse(retryText)
    }

    if (!res.ok) {
      const text = await res.text()
      // If we got HTML back the route doesn't exist — surface a clear error
      if (text.trimStart().startsWith('<!DOCTYPE') || text.trimStart().startsWith('<html')) {
        throw new Error(`Route not found: ${options.method ?? 'GET'} ${path} — is ModelModule registered in app.module.ts?`)
      }
      let err: any = {}
      try { err = JSON.parse(text) } catch {}
      throw new Error(err?.message ?? `API error ${res.status}`)
    }
    if (res.status === 204) return undefined as T
    const text = await res.text()
    if (!text) return undefined as T
    return JSON.parse(text)
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function unwrapList(raw: any): WorkspaceModel[] {
    const list = Array.isArray(raw) ? raw : (raw?.data ?? raw?.items ?? [])
    return Array.isArray(list) ? list : []
  }

  function unwrapOne(raw: any): WorkspaceModel {
    return Array.isArray(raw) ? raw[0] : (raw?.data ?? raw)
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  async function fetchModels() {
    loading.value = true
    error.value = null
    try {
      const raw = await apiFetch<any>('/api/v1/models')
      models.value = unwrapList(raw)
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load models'
    } finally {
      loading.value = false
    }
  }

  async function createModel(payload: {
    label: string
    value: string
    provider?: string
    description?: string
    contextWindow?: string
    platform?: ModelPlatform
    hostUrl?: string
    apiToken?: string
    sortOrder?: number
    isActive?: boolean
  }): Promise<WorkspaceModel> {
    const raw = await apiFetch<any>('/api/v1/models', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    const created = unwrapOne(raw)
    models.value.push(created)
    models.value.sort((a, b) => a.sortOrder - b.sortOrder)
    return created
  }

  async function updateModel(id: number, payload: Partial<WorkspaceModel>): Promise<WorkspaceModel> {
    const raw = await apiFetch<any>(`/api/v1/models/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    const updated = unwrapOne(raw)
    const idx = models.value.findIndex(m => m.id === id)
    if (idx !== -1) models.value.splice(idx, 1, updated)
    return updated
  }

  async function toggleActive(id: number): Promise<void> {
    const model = models.value.find(m => m.id === id)
    if (!model) return
    // Optimistic update
    model.isActive = !model.isActive
    try {
      await updateModel(id, { isActive: model.isActive })
    } catch {
      // Rollback on failure
      model.isActive = !model.isActive
    }
  }

  async function removeModel(id: number): Promise<void> {
    await apiFetch<void>(`/api/v1/models/${id}`, { method: 'DELETE' })
    models.value = models.value.filter(m => m.id !== id)
  }

  return {
    models,
    activeModels,
    modelOptions,
    defaultModel,
    loading,
    error,
    fetchModels,
    createModel,
    updateModel,
    toggleActive,
    removeModel,
  }
})
