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
    placeholder: 'Create a password',
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
  const result = await session.register(email, password)

  loading.value = false

  if (result.success) {
    toast.add({
      title: 'Account Created',
      description: 'Your account has been successfully created.'
    })

    await router.push('/')
  } else {
    toast.add({
      title: 'Registration Failed',
      description: result.message,
      color: 'error'
    })
  }
}
</script>

<template>
  <UPageCard class="w-full max-w-md">
    <UAuthForm
      :schema="schema"
      title="Sign Up"
      description="Create your account."
      icon="i-lucide-user-plus"
      :fields="fields"
      :loading="loading"
      @submit="onSubmit"
    />

    <div class="mt-4 text-center text-sm">
      Already have an account?
      <NuxtLink
        to="/auth/sign-in"
        class="text-primary font-medium hover:underline ml-1"
      >
        Sign in
      </NuxtLink>
    </div>
  </UPageCard>
</template>
