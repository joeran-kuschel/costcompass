<script setup lang="ts">
    const { t } = useI18n()
    const { open, cost, month, close, openAdd } = useCostDialog()
    const { retry } = useCostLists()
    const { items } = useNavItems()
    const toast = useToast()
    async function onSaved(name: string) {
        await retry()
        close()
        toast.add({ title: t('common.saved', { name }) })
    }
</script>
<template>
    <div class="relative lg:flex lg:min-h-screen">
        <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-full focus:bg-default focus:px-4 focus:py-2">
            {{ t('nav.skip') }}
        </a>
        <LanguageSwitcher compact class="absolute right-4 top-4 z-30 lg:hidden" />
        <USidebar :title="t('app.name')" collapsible="none" as="div" breakpoint="lg" class="hidden shrink-0 lg:block [--sidebar-width:15.5rem]">
            <template #title>
                <NuxtLink to="/">
                    <span class="flex items-center gap-2.5">
                        <LogoMark class="size-9 shrink-0" />
                        {{ t('app.name') }}
                    </span>
                </NuxtLink>
            </template>
            <p><UButton :label="t('costs.add')" icon="i-lucide-plus" class="pill pill-shadow" @click="openAdd()" /></p>
            <UNavigationMenu :items="items" orientation="vertical" :aria-label="t('nav.label')"/>
            <template #footer>
                <LanguageSwitcher />
            </template>
        </USidebar>
        <UMain id="main" class="min-w-0 flex-1">
            <UContainer class="mx-0">
                <slot />
            </UContainer>
        </UMain>
    </div>
    <MobileBar />
    <UModal
        :ui="{
            content: 'rounded-[2rem] bg-elevated divide-y-0 ring-0 shadow-[0_24px_48px_-12px_rgba(20,22,43,0.3)]',
            header: 'min-h-0 h-15 pt-4 pb-0 ps-5 pe-3 sm:h-17 sm:pt-6 sm:pb-0 sm:ps-8 sm:pe-5',
            title: 'text-xl font-extrabold tracking-[-0.02em] sm:text-[22px]',
            close: 'top-4 end-3 size-11 justify-center rounded-full bg-muted text-default hover:bg-accented dark:bg-accented sm:top-6 sm:end-5',
            body: 'px-5 pt-2 pb-7 sm:px-8 sm:pt-2 sm:pb-7'
        }"
        :open="open"
        :title="cost ? t('costs.edit', { name: cost.name }) : t('costs.add')"
        @update:open="(isOpen: boolean) => { if (!isOpen) close() }"
    >
        <template #body>
            <CostForm :cost="cost" :month="month" @saved="onSaved" @cancel="close" />
        </template>
    </UModal>
</template>
