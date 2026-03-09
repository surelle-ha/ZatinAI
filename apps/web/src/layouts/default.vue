<script setup lang="ts">
import type {ButtonProps, NavigationMenuItem} from '@nuxt/ui'

const route = useRoute()
const toast = useToast()

const open = ref(false)

const links = [[{
  label: 'Courses',
  icon: 'i-lucide-book-open',
  to: '/courses',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Dashboard',
  icon: 'i-lucide-house',
  to: '/',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Agent Studio',
  to: '/studio',
  icon: 'i-lucide-sparkles',
  defaultOpen: true,
  type: 'trigger',
  children: [{
    label: 'Agents',
    icon: 'i-lucide-hat-glasses',
    to: '/studio',
    exact: true,
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Lesson Builder',
    icon: 'i-lucide-book',
    to: '/studio/lesson-builder',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Models',
    icon: 'i-lucide-brain',
    to: '/studio/models',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Memory Shards',
    icon: 'i-lucide-database',
    to: '/studio/memory-shards',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Marketplace',
    icon: 'i-lucide-store',
    to: '/studio/marketplace',
    onSelect: () => {
      open.value = false
    }
  }, {
    label: 'Integration',
    icon: 'i-lucide-plug',
    to: '/studio/integration',
    onSelect: () => {
      open.value = false
    }
  }],
}, {
  label: 'Students',
  icon: 'i-lucide-users',
  to: '/customers',
  onSelect: () => {
    open.value = false
  }
},
  {
    label: 'Settings',
    to: '/settings',
    icon: 'i-lucide-settings',
    defaultOpen: true,
    type: 'trigger',
    children: [{
      label: 'General',
      to: '/settings',
      exact: true,
      onSelect: () => {
        open.value = false
      }
    }, {
      label: 'Members',
      to: '/settings/members',
      onSelect: () => {
        open.value = false
      }
    }, {
      label: 'Notifications',
      to: '/settings/notifications',
      onSelect: () => {
        open.value = false
      }
    }, {
      label: 'Security',
      to: '/settings/security',
      onSelect: () => {
        open.value = false
      }
    }],
  }, {
    label: 'Administrators',
    to: '/admin',
    icon: 'i-lucide-lock',
    defaultOpen: true,
    type: 'trigger',
    children: [{
      label: 'General',
      to: '/admin',
      exact: true,
      onSelect: () => {
        open.value = false
      }
    }, {
      label: 'Members',
      to: '/admin/members',
      onSelect: () => {
        open.value = false
      }
    }, {
      label: 'Notifications',
      to: '/admin/notifications',
      onSelect: () => {
        open.value = false
      }
    }, {
      label: 'Security',
      to: '/admin/security',
      onSelect: () => {
        open.value = false
      }
    }],
  }], [{
  label: 'Development',
  color: 'warning',
  icon: 'i-lucide-code'
}, {
  label: 'Help & Support',
  icon: 'i-lucide-info',
  to: 'https://github.com/nuxt-ui-templates/dashboard',
  target: '_blank'
}]] satisfies NavigationMenuItem[][]

const groups = computed(() => [{
  id: 'links',
  label: 'Go to',
  items: links.flat()
}, {
  id: 'code',
  label: 'Code',
  items: [{
    id: 'source',
    label: 'View page source',
    icon: 'i-simple-icons-github',
    to: `https://github.com/nuxt-ui-templates/dashboard/blob/main/app/pages${route.path === '/' ? '/index' : route.path}.vue`,
    target: '_blank'
  }]
}])

onMounted(async () => {
  const cookie = useCookie('cookie-consent')
  if (cookie.value === 'accepted') {
    return
  }

  toast.add({
    title: 'We use first-party cookies to enhance your experience on our website.',
    duration: 0,
    close: false,
    actions: [{
      label: 'Accept',
      color: 'neutral',
      variant: 'outline',
      onClick: () => {
        cookie.value = 'accepted'
      }
    }, {
      label: 'Opt out',
      color: 'neutral',
      variant: 'ghost'
    }]
  })
})
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <UserMenu :collapsed="collapsed"/>
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default"/>

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <TeamsMenu :collapsed="collapsed"/>
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups"/>

    <slot/>

    <NotificationsSlideover/>
  </UDashboardGroup>
</template>
