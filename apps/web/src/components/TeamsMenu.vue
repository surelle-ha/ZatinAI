<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const useWorkspace = useWorkspaceStore()
const workspace = computed(() => useWorkspace.activeWorkspace)

const teams = computed(() => [{
  label: workspace.value?.publicName || 'Loading...',
  avatar: {
    src: 'https://cdn-icons-png.freepik.com/512/7717/7717267.png',
    alt: workspace.value?.publicName || 'Loading...'
  }
}])

const selectedTeam = computed(() => teams.value[0])

const items = computed<DropdownMenuItem[][]>(() => {
  return [teams.value.map(team => ({
    ...team,
    onSelect() {
      // handle selection
    }
  })), [{
    label: 'Invite Members',
    icon: 'i-lucide-circle-plus'
  }, {
    label: 'Manage Workspace',
    icon: 'i-lucide-cog'
  }]]
})
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-40' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        ...selectedTeam,
        label: collapsed ? undefined : selectedTeam?.label,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :class="[!collapsed && 'py-2']"
      :ui="{
        trailingIcon: 'text-dimmed'
      }"
    />
  </UDropdownMenu>
</template>
