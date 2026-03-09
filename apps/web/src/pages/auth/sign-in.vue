<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'
import { useSessionStore } from '~/stores/session'

definePageMeta({
  layout: 'auth'
})

const toast = useToast()
const router = useRouter()
const session = useSessionStore()

const loading = ref(false)

const fields: AuthFormField[] = [
  {
    name: 'email',
    type: 'email',
    label: 'Email',
    placeholder: 'Enter your email',
    required: true
  },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    required: true
  }
]

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Must be at least 8 characters')
})

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  loading.value = true

  const { email, password } = payload.data
  const result = await session.login(email, password)

  if (result.success) {
    const workspace = useWorkspaceStore()
    await workspace.fetchWorkspaces()   // ← add this

    toast.add({
      title: 'Success',
      description: 'You are now logged in.'
    })

    await router.push('/')
  } else {
    toast.add({
      title: 'Login Failed',
      description: result.message,
      color: 'error'
    })
  }

  loading.value = false
}

</script>

<template>
  <UPageCard class="w-full max-w-md bg-black/80 backdrop-blur-md rounded-2xl border border-black/30 shadow-lg p-6">
    <UAuthForm
      :schema="schema"
      title="Login"
      description="Enter your credentials to access your account."
      icon="i-lucide-user"
      :fields="fields"
      :loading="loading"
      @submit="onSubmit"
    />

    <div class="mt-4 text-center text-sm text-white">
      Don't have an account?
      <NuxtLink
        to="/auth/sign-up"
        class="text-primary font-medium hover:underline ml-1"
      >
        Sign up
      </NuxtLink>
    </div>
  </UPageCard>
</template>
