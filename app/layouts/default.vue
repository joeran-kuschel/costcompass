<script setup lang="ts">
    const { t } = useI18n()
    const navItems = computed(() => [
        {'label': t('nav.dashboard'), to: '/'},
        {'label': t('nav.costs'), to: '/costs'}
    ])
</script>
<template>
    <UHeader :title="t('app.name')">
        <UNavigationMenu :items="navItems" />
        <template #right>
            <LanguageSwitcher />
        </template>
        <template #body>
            <UNavigationMenu :items="navItems" orientation="vertical" />
        </template>
    </UHeader>
    <UMain>
        <UContainer>
            <slot />
        </UContainer>
    </UMain>
</template>
