<script lang="ts" setup>
    const { t } = useI18n()
    const route = useRoute()
    const { items } = useNavItems()
    const { open, openAdd } = useCostDialog()
    const { monthYear } = useMonth()

    // On a month page the address holds the month; anywhere else the check fails and there is none.
    const monthRef = computed<MonthRef | null>(() => {
        const parsed = monthParamsSchema.safeParse(route.params)
        return parsed.success ? { year: parsed.data.year, month: parsed.data.month as Month } : null
    })
    const addLabel = computed(() => monthRef.value
        ? t('costs.addToMonth', { month: monthYear(monthRef.value.year, monthRef.value.month) })
        : t('costs.add'))
</script>

<template>
    <div class="fixed inset-x-4 bottom-7 z-40 flex items-center gap-2.5 lg:hidden">
        <nav :aria-label="t('nav.label')" class="mobile-tabs">
            <NuxtLink v-for="item in items" :key="item.to" :to="item.to" class="mobile-tab">
                <UIcon :name="item.icon" class="size-5" />
                {{ item.shortLabel }}
            </NuxtLink>
        </nav>
        <UButton v-if="!open" :aria-label="addLabel" icon="i-lucide-plus" class="mobile-add" @click="openAdd(monthRef)" />
    </div>
</template>
