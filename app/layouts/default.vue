<script setup lang="ts">
    const { t } = useI18n()
    const { open, cost, month, close } = useCostDialog()
    const { retry } = useCostLists()
    const { currentYear, currentMonth} = useYear()
    const { monthPath } = useMonth()
    const navItems = computed(() => [
        {'label': t('nav.dashboard'), to: '/'},
        {'label': t('nav.costs'), to: '/costs'},
        {'label': t('nav.thisMonth'), to: monthPath(currentYear.value, currentMonth.value)}
    ])

    async function onSaved() {
        await retry()
        close()
    }
</script>
<template>
    <UHeader :title="t('app.name')">
        <template #title>
            <span class="flex items-center gap-2.5">
                <LogoMark class="size-9 shrink-0" />
                {{ t('app.name') }}
            </span>
        </template>
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
