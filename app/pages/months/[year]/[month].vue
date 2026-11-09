<script lang="ts" setup>
const route = useRoute()

// The address is checked first, before any data is requested.
const parsed = monthParamsSchema.safeParse(route.params)
if (!parsed.success) {
    throw createError({ status: 404, fatal: true, data: { reason: 'month' }})
}
const { year, month } = parsed.data
const monthRef: MonthRef = { year, month: month as Month }

const { t } = useI18n()
const { currentYear, currentMonth } = useYear()
const { purchases, failed, loading, retry } = useCostLists()
const { monthName, monthYear, monthPath } = useMonth()
const { openAdd } = useCostDialog()
const euros = useMoney({ cents: true })
const moneyParts = useMoneyParts()
const heading = useTemplateRef<HTMLElement>('heading')
const thisMonthSummary = useMonthSummary()
const { kindIcon } = useKind()

const title = computed(() => monthYear(year, month))
const heroTotal = computed(() => moneyParts(thisMonthSummary.value.total))
const isCurrentMonth = computed(() => year === currentYear.value && month === currentMonth.value)
const neighbours = computed(() => monthNeighbours(monthRef, availableYears(purchases.value ?? [], currentYear.value)))
const sections = computed(() => [
    { id: 'recurring', title: t('month.recurring'), total: euros(thisMonthSummary.value.recurringTotal), rows: thisMonthSummary.value.recurringRows, kind: 'recurring' as const },
    { id: 'purchases', title: t('month.purchases'), total: euros(thisMonthSummary.value.purchasesTotal), rows: thisMonthSummary.value.purchaseRows, kind: 'purchase' as const },
].filter(section => section.rows.length > 0))
useHead({ title: () => title.value })

watch([loading, failed], () => {
    if (loading.value || failed.value) return
    if (!availableYears(purchases.value ?? [], currentYear.value).includes(year)) {
        showError(createError({ status: 404, fatal: true, data: { reason: 'month' } }))
    }
}, { immediate: true })

async function onRetry() {
    await retry()
    if (failed.value) return
    await nextTick()
    heading.value?.focus()
}

</script>
<template>
    <UButton to="/" :label="t('nav.dashboard')" icon="i-lucide-arrow-left" variant="link" color="neutral" class="mb-2 px-0" />
    <div class="grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2 sm:flex">
        <UButton
            v-if="neighbours.previous"
            :to="monthPath(neighbours.previous.year, neighbours.previous.month)"
            :aria-label="t('month.previous', { month: monthYear(neighbours.previous.year, neighbours.previous.month) })"
            icon="i-lucide-chevron-left"
            variant="ghost"
            color="neutral"
            class="pill-icon"
        />
        <div class="col-start-2 flex flex-col items-center gap-1 text-center sm:flex-row sm:gap-2 sm:text-left">
            <h1 ref="heading" tabindex="-1">{{ title }}</h1>
            <UBadge v-if="isCurrentMonth" :label="t('month.thisMonth')" variant="outline" />
        </div>
        <UButton
            v-if="neighbours.next"
            :to="monthPath(neighbours.next.year, neighbours.next.month)"
            :aria-label="t('month.next', { month: monthYear(neighbours.next.year, neighbours.next.month) })"
            icon="i-lucide-chevron-right"
            variant="ghost"
            color="neutral"
            class="pill-icon"
        />
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
            <div class="mt-4 flex flex-col gap-6 lg:flex-row lg:items-start">
                <div class="flex min-w-0 flex-1 flex-col gap-5">
                    <UCard variant="subtle" class="card card-hero" aria-labelledby="month-total-title">
                        <span class="hero-ring" aria-hidden="true" />
                        <div class="flex w-full flex-wrap items-end justify-between gap-x-5 gap-y-3">
                            <div>
                                <h2 id="month-total-title">{{ t('month.total', { month: monthName(month) }) }}</h2>
                                <p class="hero-total">{{ heroTotal.whole }}<span class="hero-cents">{{ heroTotal.cents }}</span>{{ heroTotal.after }}</p>
                            </div>
                            <div class="flex flex-col items-end gap-2.5">
                                <p v-if="!thisMonthSummary.empty" class="hero-pill">
                                    <UIcon :name="thisMonthSummary.icon" class="size-3.5 sm:size-4" aria-hidden="true" />
                                    <span aria-hidden="true" class="sm:hidden">{{ thisMonthSummary.comparisonShort }}</span>
                                    <span class="sr-only sm:not-sr-only">{{ thisMonthSummary.comparison }}</span>
                                </p>
                                <p v-if="!thisMonthSummary.empty" class="hero-meta hidden sm:block">{{ t('month.costCount', thisMonthSummary.count) }} · {{ t('month.businessCount', thisMonthSummary.businessCount) }}</p>
                            </div>
                        </div>
                    </UCard>
                    <UCard v-if="thisMonthSummary.empty" variant="subtle" class="card text-center">
                        <UIcon name="i-lucide-calendar-x" class="size-8" aria-hidden="true" />
                        <h2>{{ t('month.emptyTitle', { month: monthName(month) }) }}</h2>
                        <p>{{ t('month.emptyText') }}</p>
                        <UButton :label="t('month.emptyAdd', { month: monthName(month) })" class="pill mt-4" @click="openAdd(monthRef)" />
                        <p class="mt-1 text-[13px] text-muted">{{ t('month.emptyHint', { month: monthYear(year, month) }) }}</p>
                    </UCard>
                    <section v-for="section in sections" :key="section.id" :aria-labelledby="`${section.id}-title`" class="card px-6 py-5">
                        <div class="flex items-baseline justify-between gap-4">
                            <h2 :id="`${section.id}-title`" class="flex items-center gap-2">
                                <UIcon :name="kindIcon(section.kind)" class="text-muted" aria-hidden="true" />
                                {{ section.title }}
                            </h2>
                            <p class="font-extrabold tabular-nums">{{ section.total }}</p>
                        </div>
                        <ul class="mt-3 flex flex-col gap-1.5">
                            <li v-for="row in section.rows" :key="row.key" class="flex items-center gap-3 rounded-[18px] bg-muted px-3 py-2.5">
                                <CategoryBadge :category="row.category" :size="40" />
                                <div class="min-w-0 flex-1">
                                    <p class="flex flex-wrap items-center gap-1.5 break-words font-bold">
                                        {{ row.name }}
                                        <BusinessBadge v-if="row.business" />
                                    </p>
                                    <p class="text-sm text-muted">{{ row.subline }}</p>
                                </div>
                                <p class="shrink-0 text-right font-extrabold tabular-nums">{{ row.amount }}</p>
                            </li>
                        </ul>
                    </section>
                </div>
                <aside v-if="!thisMonthSummary.empty" aria-labelledby="categories-title" class="card px-6 py-5 lg:w-[340px] lg:shrink-0">
                    <h2 id="categories-title">{{ t('month.byCategory') }}</h2>
                    <CategoryList :rows="thisMonthSummary.categoryRows" />
                    <SplitList class="mt-3.5 border-t border-default pt-3.5" :householdTotal="thisMonthSummary.householdTotal" :businessTotal="thisMonthSummary.businessTotal" />
                </aside>
            </div>
        </template>
    </div>
</template>
