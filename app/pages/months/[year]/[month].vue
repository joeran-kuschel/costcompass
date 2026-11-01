<script lang="ts" setup>
const route = useRoute()

const parsed = monthParamsSchema.safeParse(route.params)
if (!parsed.success) {
    throw createError({ status: 404, fatal: true, data: { reason: 'month' }})
}
const { year, month } = parsed.data
const { t, locale } = useI18n()
const { currentYear, currentMonth } = useYear()
const { recurring, purchases, failed, loading, retry } = useCostLists()
const { monthName, monthYear, monthPath } = useMonth()
const title = computed(() => monthYear(year, month))
const euros = useMoney({ cents: true })
const monthRef: MonthRef = { year, month: month as Month }
const open = ref(false)
const isCurrentMonth = computed(() => year === currentYear.value && month === currentMonth.value)
const neighbours = computed(() => monthNeighbours(monthRef, availableYears(purchases.value ?? [], currentYear.value)))
const groups = computed(() => groupMonthCosts<Stored<RecurringCost>, Stored<Purchase>>(costsInMonth(recurring.value ?? [], purchases.value ?? [], year, month as Month)))
const recurringRows = computed(() => groups.value.recurring.map(toRow))
const purchaseRows = computed(() => groups.value.purchases.map(toRow))
const sections = computed(() => [
    { id: 'recurring', title: t('month.recurring'), total: euros(groups.value.recurringTotal), rows: recurringRows.value },
    { id: 'purchases', title: t('month.purchases'), total: euros(groups.value.purchasesTotal), rows: purchaseRows.value },
].filter(section => section.rows.length > 0))
const formatDate = (date:string) => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', timeZone: 'UTC'}).format(new Date(date))
const heading = useTemplateRef<HTMLElement>('heading')


useHead({ title: () => title.value })

watch([loading, failed], () => {
    if (loading.value || failed.value) return
    if (!availableYears(purchases.value ?? [], currentYear.value).includes(year)) {
        showError(createError({ status: 404, fatal: true, data: { reason: 'month' } }))
    }
}, { immediate: true })

function toRow(cost: Stored<RecurringCost> | Stored<Purchase>) {
    const detail = cost.kind === 'recurring' ? t(`interval.${cost.interval}`) : formatDate(cost.date)
    return {
        key: `${cost.kind}-${cost.id}`,
        name: cost.name,
        subline: `${t(`category.${cost.category}`)} · ${detail}`,
        business: cost.business,
        amount: euros(cost.amount)
    }
}

async function onRetry() {
    await retry()
    if (failed.value) return
    await nextTick()
    heading.value?.focus()
}
async function onSaved() {
    await retry()
    open.value = false
}
</script>
<template>
    <UButton to="/" :label="t('nav.dashboard')" icon="i-lucide-arrow-left" variant="link" color="neutral" class="mb-2 px-0" />
    <div class="flex items-center gap-2">
        <UButton
            v-if="neighbours.previous"
            :to="monthPath(neighbours.previous.year, neighbours.previous.month)"
            :aria-label="t('month.previous', { month: monthYear(neighbours.previous.year, neighbours.previous.month) })"
            icon="i-lucide-chevron-left"
            variant="ghost"
            color="neutral"
            class="size-9 justify-center"
        />
        <h1 ref="heading" tabindex="-1">{{ title }}</h1>
        <UBadge v-if="isCurrentMonth" :label="t('month.thisMonth')" variant="outline" />
        <UButton
            v-if="neighbours.next"
            :to="monthPath(neighbours.next.year, neighbours.next.month)"
            :aria-label="t('month.next', { month: monthYear(neighbours.next.year, neighbours.next.month) })"
            icon="i-lucide-chevron-right"
            variant="ghost"
            color="neutral"
            class="size-9 justify-center"
        />
        <UButton v-if="!loading && !failed" :label="t('costs.add')" icon="i-lucide-plus" class="ml-auto" @click="open = true" />
    </div>
    <div :aria-busy="loading">
        <template v-if="loading">
            <p role="status" class="sr-only">{{ t('month.loading', { month: title }) }}</p>
            <USkeleton aria-hidden="true" role="presentation" class="mt-4 h-10 w-40 motion-reduce:animate-none" />
            <USkeleton aria-hidden="true" role="presentation" class="mt-4 h-32 w-full motion-reduce:animate-none" />
        </template>
        <UAlert
            v-else-if="failed"
            role="alert"
            color="error"
            :title="t('month.error', { month: monthName(month) })"
            :description="t('month.errorText')"
            :actions="[{ label: t('dashboard.retry'), onClick: onRetry }]"
        />
        <template v-else>
            <UCard variant="subtle" class="mt-4" aria-labelledby="month-total-title">
                <h2 id="month-total-title">{{ t('month.total', { month: monthName(month) }) }}</h2>
                <p>{{ euros(groups.total) }}</p>
            </UCard>
            <UCard v-if="sections.length === 0" variant="subtle" class="mt-6 text-center">
                <UIcon name="i-lucide-calendar-x" class="size-8" aria-hidden="true" />
                <h2>{{ t('month.emptyTitle', { month: monthName(month) }) }}</h2>
                <p>{{ t('month.emptyText') }}</p>
                <UButton :label="t('costs.add')" class="mt-4" @click="open = true" />
            </UCard>
            <section v-for="section in sections" :key="section.id" :aria-labelledby="`${section.id}-title`" class="mt-6">
                <div class="flex items-baseline justify-between gap-4">
                    <h2 :id="`${section.id}-title`">{{ section.title }}</h2>
                    <p>{{ section.total }}</p>
                </div>
                <ul>
                    <li v-for="row in section.rows" :key="row.key" class="flex items-start justify-between gap-4 py-2">
                        <div class="min-w-0">
                            <p class="break-words">
                                {{ row.name }}
                                <UBadge v-if="row.business" :label="t('month.business')" variant="outline" size="sm" />
                            </p>
                            <p class="text-sm text-muted">{{ row.subline }}</p>
                        </div>
                        <p class="shrink-0 text-right tabular-nums">{{ row.amount }}</p>
                    </li>
                </ul>
            </section>
        </template>
    </div>
    <UModal v-model:open="open" :title="t('costs.add')">
        <template #body>
            <CostForm :month="monthRef" @saved="onSaved" @cancel="open = false" />
        </template>
    </UModal>
</template>
