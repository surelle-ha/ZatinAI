import { defineStore } from 'pinia'
import { useSessionStore } from '~/stores/session'

export interface Workspace {
  id: number
  publicName: string
  privateName: string
  description: string
  isEnabled: boolean
  isProperty: boolean
  ownedBy: number
  createdBy: number
}

interface WorkspaceState {
  workspaces: Workspace[]
  activeWorkspaceId: number | null
  loading: boolean
  initialized: boolean
}

export const useWorkspaceStore = defineStore('workspace', {
  state: (): WorkspaceState => ({
    workspaces: [],
    activeWorkspaceId: null,
    loading: false,
    initialized: false,
  }),

  getters: {
    activeWorkspace: (state): Workspace | null => {
      // Guard: ensure workspaces is always an array
      if (!Array.isArray(state.workspaces)) return null
      return state.workspaces.find(w => w.id === state.activeWorkspaceId) ?? null
    },

    hasWorkspace: (state): boolean => {
      if (!Array.isArray(state.workspaces)) return false
      return state.workspaces.length > 0
    },
  },

  actions: {
    /**
     * Fetch all workspaces for the authenticated user.
     * Call this right after a successful login or on app init if already authenticated.
     */
    async fetchWorkspaces(): Promise<void> {
      const sessionStore = useSessionStore()
      if (!sessionStore.accessToken) return

      if (!Array.isArray(this.workspaces)) {
        this.workspaces = []
      }

      this.loading = true
      try {
        const config = useRuntimeConfig()
        const workspaces = await $fetch<Workspace[]>(
          `${config.public.apiBase}/api/v1/workspaces/mine`,
          {
            headers: {
              Authorization: `Bearer ${sessionStore.accessToken}`,
            },
          }
        )
        console.log('workspaces response:', workspaces, typeof workspaces)

        this.workspaces = workspaces

        // Auto-select the first workspace, or restore from localStorage
        const stored = process.client ? localStorage.getItem('activeWorkspaceId') : null
        const storedId = stored ? parseInt(stored, 10) : null
        const validStored = storedId && workspaces.some(w => w.id === storedId)

        this.activeWorkspaceId = validStored ? storedId : (workspaces[0]?.id ?? null)

        if (this.activeWorkspaceId && process.client) {
          localStorage.setItem('activeWorkspaceId', String(this.activeWorkspaceId))
        }
      } catch (err) {
        console.warn('Failed to fetch workspaces', err)
        this.workspaces = []
        this.activeWorkspaceId = null
      } finally {
        this.loading = false
        this.initialized = true
      }
    },

    /**
     * Switch the active workspace.
     * Persists the selection to localStorage so it survives a page refresh.
     */
    setActiveWorkspace(id: number): void {
      const exists = this.workspaces.some(w => w.id === id)
      if (!exists) return

      this.activeWorkspaceId = id
      if (process.client) {
        localStorage.setItem('activeWorkspaceId', String(id))
      }
    },

    /**
     * Clear workspace state on logout.
     */
    clear(): void {
      this.workspaces = []
      this.activeWorkspaceId = null
      this.initialized = false
      if (process.client) {
        localStorage.removeItem('activeWorkspaceId')
      }
    },
  },
})
