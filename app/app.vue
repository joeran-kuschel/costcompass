<script lang="ts" setup>
const { t, locale } = useI18n()
useHead({ 
  htmlAttrs: { lang: () => locale.value, dir: 'ltr' },
  titleTemplate: title => title ? `${title} – ${t('app.name')}` : t('app.name')
})
</script>
<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
