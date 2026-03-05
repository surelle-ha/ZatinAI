import { defineStore } from 'pinia'

export interface Profile {
  id: number
  name: string
  email: string
  sub?: number
}

interface SessionState {
  accessToken: string | null
  refreshToken: string | null
  profile: Profile | null
  initialized: boolean
}

export const useSessionStore = defineStore('session', {
  state: (): SessionState => ({
    accessToken: null,
    refreshToken: null,
    profile: null,
    initialized: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken,
    getProfile: (state) => state.profile
  },

  actions: {
    async initialize() {
      if (!process.client) return

      const accessToken = localStorage.getItem('accessToken')
      const refreshToken = localStorage.getItem('refreshToken')

      if (accessToken && refreshToken) {
        this.accessToken = accessToken
        this.refreshToken = refreshToken

        // Try to load profile, if access token is expired, refresh first
        const profile = await this.fetchProfile()
        if (!profile) {
          await this.refresh()
        }
      }

      this.initialized = true
    },

    async _authRequest(endpoint: string, email: string, password: string) {
      try {
        const config = useRuntimeConfig()
        const response = await $fetch<{
          accessToken: string
          refreshToken: string
          profile: Profile
        }>(`${config.public.apiBase}${endpoint}`, {
          method: 'POST',
          body: { email, password }
        })

        this.setSession(response.accessToken, response.refreshToken, response.profile)
        await this.fetchProfile()
        return { success: true }
      } catch (error: any) {
        return {
          success: false,
          message: error?.data?.message || 'Authentication failed'
        }
      }
    },

    login(email: string, password: string) {
      return this._authRequest('/api/v1/auth/sign-in/basic', email, password)
    },

    register(email: string, password: string) {
      return this._authRequest('/api/v1/auth/sign-up/basic', email, password)
    },

    // Call this when a 401 is received anywhere in the app
    async refresh(): Promise<boolean> {
      if (!this.refreshToken) {
        this.clearSession()
        return false
      }

      try {
        const config = useRuntimeConfig()
        const response = await $fetch<{
          accessToken: string
          refreshToken: string
          profile: Profile
        }>(`${config.public.apiBase}/api/v1/auth/refresh/basic`, {
          method: 'POST',
          body: { refreshToken: this.refreshToken }
        })

        this.setSession(response.accessToken, response.refreshToken, response.profile)
        await this.fetchProfile()
        return true
      } catch (err) {
        console.warn('Token refresh failed — logging out', err)
        this.clearSession()
        return false
      }
    },

    async logout() {
      try {
        const config = useRuntimeConfig()
        if (this.refreshToken) {
          await $fetch(`${config.public.apiBase}/api/v1/auth/logout`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${this.accessToken}` },
            body: { refreshToken: this.refreshToken }
          })
        }
      } catch (err) {
        console.warn('Logout API failed', err)
      } finally {
        this.clearSession()
      }
    },

    setSession(accessToken: string, refreshToken: string, profile: Profile) {
      this.accessToken = accessToken
      this.refreshToken = refreshToken
      this.profile = profile

      if (process.client) {
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        localStorage.setItem('profile', JSON.stringify(profile))
      }
    },

    clearSession() {
      this.accessToken = null
      this.refreshToken = null
      this.profile = null

      if (process.client) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('profile')
      }
    },

    async fetchProfile() {
      if (!this.accessToken) return null

      try {
        const config = useRuntimeConfig()
        const profile = await $fetch<Profile>(`${config.public.apiBase}/api/v1/profile`, {
          headers: { Authorization: `Bearer ${this.accessToken}` }
        })

        this.profile = profile
        if (process.client) {
          localStorage.setItem('profile', JSON.stringify(profile))
        }

        return profile
      } catch (err) {
        // Don't clearSession here anymore — let the caller decide (refresh may recover it)
        console.warn('Failed to fetch profile', err)
        return null
      }
    }
  }
})
