<script setup lang="ts">
    const { t } = useI18n()
    const { open, cost, month, close, openAdd } = useCostDialog()
    const { retry } = useCostLists()
    const { currentYear, currentMonth} = useYear()
    const { monthPath } = useMonth()
    const navItems = computed(() => [
        {'label': t('nav.dashboard'), to: '/', icon: 'i-lucide-layout-dashboard'},
        {'label': t('nav.costs'), to: '/costs', icon: 'i-lucide-list'},
        {'label': t('nav.thisMonth'), to: monthPath(currentYear.value, currentMonth.value), icon: 'i-lucide-calendar'}
    ])

    async function onSaved() {
        await retry()
        close()
    }
</script>
<template>
    <div class="lg:flex lg:min-h-screen">
        <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-full focus:bg-default focus:px-4 focus:py-2">
            {{ t('nav.skip') }}
        </a>
        <USidebar :title="t('app.name')" collapsible="none" as="div" breakpoint="lg" class="shrink-0 [--sidebar-width:15.5rem]">
            <template #title>
                <NuxtLink to="/">
                    <span class="flex items-center gap-2.5">
                        <LogoMark class="size-9 shrink-0" />
                        {{ t('app.name') }}
                    </span>
                </NuxtLink>
            </template>
            <p><UButton :label="t('costs.add')" icon="i-lucide-plus" class="pill pill-shadow" @click="openAdd()" /></p>
            <UNavigationMenu :items="navItems" orientation="vertical" :aria-label="t('nav.label')"/>
            <template #footer>
                <LanguageSwitcher />
            </template>
        </USidebar>
        <UMain id="main" class="min-w-0 flex-1">
            <UContainer>
                <slot />
            </UContainer>
        </UMain>
    </div>
    <UModal
        :ui="{ content: 'rounded-[2rem] bg-elevated' }"
        :open="open"
        :title="cost ? t('costs.edit', { name: cost.name }) : t('costs.add')"
        @update:open="(isOpen: boolean) => { if (!isOpen) close() }"
    >
        <template #body>
            <CostForm :cost="cost" :month="month" @saved="onSaved" @cancel="close" />
        </template>
    </UModal>
</template>
