<template>
  <div class="fixed inset-0">
    <BackgroundsColorBends
      class="absolute inset-0 w-full h-full"
      :colors="['#ff5c7a', '#8a5cff', '#00ffd1']"
      :rotation="30"
      :speed="0.2"
      :scale="1"
      :frequency="1"
      :warpStrength="1"
      :mouseInfluence="1.2"
      :parallax="0.5"
      :noise="0.1"
      transparent
    />
    <div class="absolute inset-0 flex items-center justify-center px-4">
      <slot />
    </div>
  </div>
</template>
