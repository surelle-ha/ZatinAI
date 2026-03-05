import { useSessionStore } from '~/stores/session'

export default defineNuxtRouteMiddleware((to) => {
  const session = useSessionStore()

  const isAuthPage = to.path.startsWith('/auth')

  if (!session.isAuthenticated && !isAuthPage) {
    return navigateTo('/auth/sign-in')
  }

  if (session.isAuthenticated && isAuthPage) {
    return navigateTo('/')
  }
})
