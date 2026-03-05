import { useSessionStore } from '~/stores/session'

export default defineNuxtPlugin(async (nuxtApp) => {
  const session = useSessionStore()
  const workspace = useWorkspaceStore()
  const router = useRouter()

  await session.initialize()

  if (session.isAuthenticated) {
    await workspace.fetchWorkspaces()
  }
  nuxtApp.hook('app:created', () => {
    globalThis.$fetch = $fetch.create({
      onResponseError: async ({ request, response, options }) => {
        if (response.status === 401) {
          const refreshed = await session.refresh()
          if (refreshed) {
            await $fetch(request, {
              ...options,
              method: options.method as 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'options' | 'connect' | 'trace' | undefined,
              headers: {
                ...options.headers,
                Authorization: `Bearer ${session.accessToken}`
              }
            })
          } else {
            router.push('/auth/sign-in')
          }
        }
      }
    })
  })
})
