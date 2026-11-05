<script lang="ts" setup>
import { annualSummary, categoryBreakdown, splitPercentages, monthBreakdown } from '~~/shared/utils/costs'

const EMPTY_BADGES = ['housing', 'food', 'insurance', 'mobility'] as const
const GAP = 0.6

const { t, n } = useI18n()
const { year, currentYear, currentMonth } = useYear()
const { monthName, monthYear, monthPath } = useMonth()
const thisMonthSummary = useMonthSummary()
const { recurring, purchases, failed, loading, retry } = useCostLists()
const { categoryClass } = useCategory()
const euros = useMoney()
const cents = useMoney({ cents: true })
const { openAdd } = useCostDialog()
const heading = useTemplateRef<HTMLElement>('heading')

const years = computed(() => availableYears(purchases.value ?? [], currentYear.value))
const shownYear = computed(() => years.value.includes(year.value) ? year.value : currentYear.value)
const empty = computed(() => !failed.value && !loading.value && recurring.value?.length === 0 && purchases.value?.length === 0)
const summary = computed (() => annualSummary(recurring.value ?? [], purchases.value ?? [], shownYear.value))
const categoryRows = computed (() => categoryBreakdown(recurring.value ?? [], purchases.value ?? [], shownYear.value).map(({ category, total, percent}) => ({
    category,
    label: t(`category.${category}`),
    amount: euros(total),
    percent: n(percent / 100, { style: 'percent' }),
    value: percent
})))
const split = computed(() => splitPercentages(summary.value))
   // the gap between the two colours, in percent of the ring
const splitRing = computed(() => {
    const { household, business } = split.value
    const filled = (color: string) => `conic-gradient(${color} 0 100%)`
    const half = GAP / 2
    if (summary.value.total === 0) return filled('var(--ui-bg-accented)')   // empty year: an empty track
    if (business === 0) return filled('var(--ui-primary)')                  // 100% household
    if (household === 0) return filled('var(--ui-warning)')                 // 100% business
    return `conic-gradient(
        var(--ui-bg-elevated) 0 ${half}%,
        var(--ui-primary) ${half}% ${household - half}%,
        var(--ui-bg-elevated) ${household - half}% ${household + half}%,
        var(--ui-warning) ${household + half}% ${100 - half}%,
        var(--ui-bg-elevated) ${100 - half}% 100%)`
})
const tiles = computed(() => [
    { key: 'total', value: summary.value.total, label: t('dashboard.summary.total'), sub: t('dashboard.summary.perYear'),  dot: 'bg-inverted' },
    { key: 'average', value: summary.value.averagePerMonth, label: t('dashboard.summary.average'), sub: t('dashboard.summary.perMonth'), dot: 'bg-accented' },
    { key: 'household', value: summary.value.household, label: t('dashboard.summary.household'), sub: t('dashboard.summary.ofYear', { percent: split.value.household }), dot: 'bg-primary' },
    { key: 'business',  value: summary.value.business, label: t('business.label'), sub: t('dashboard.summary.ofYear', { percent: split.value.business }),  dot: 'bg-secondary' },
].map(tile => ({ ...tile, value: euros(tile.value) })))
const monthRows = computed (() => monthBreakdown(recurring.value ?? [], purchases.value ?? [], shownYear.value).map(({ month, total, share}) => {
    const shortAmount = (total: number) => Math.round(total) < 1000 ? n(Math.round(total)) : t('dashboard.months.thousand', { value: n(total / 1000, { maximumFractionDigits: 1 }) })
    return {
        month,
        short: monthName(month, 'short'),
        text: t('dashboard.months.alt', { month: monthName(month, 'long'), amount: euros(total)}),
        height: `${share * 100}%`,
        to: monthPath(shownYear.value, month),
        current: shownYear.value === currentYear.value && month === currentMonth.value,
        value: shortAmount(total)
    }
}))

useHead({ title: () => t('nav.dashboard') })

async function onRetry() {
    await retry()
    if (failed.value) return
    await nextTick()
    heading.value?.focus()
}
</script>
<template>
    <h1 ref="heading" tabindex="-1">{{ t('nav.dashboard') }}</h1>
    <div v-if="loading" :aria-busy="loading" class="flex flex-col gap-4">
    <p role="status" class="sr-only">{{ t('dashboard.loading') }}</p>
        <DashboardSkeleton />
    </div>
    <UAlert
        v-else-if="failed"
        role="alert"
        variant="subtle"
        class="card mt-6"
        :ui="{
            root: 'flex-col items-center gap-2.5 px-6 pb-7 pt-9 text-center',
            wrapper: 'flex flex-col items-center gap-2.5',
            description: 'max-w-72'
        }"
    >
        <template #leading>
            <span class="mb-2 flex size-[4.5rem] items-center justify-center rounded-full bg-error/10 text-error" aria-hidden="true">
                <UIcon name="i-lucide-circle-alert" class="size-8" />
            </span>
        </template>
        <template #title><h2 class="text-[1.375rem]">{{ t('dashboard.error.title') }}</h2></template>
        <template #description><p class="m-0 text-muted">{{ t('dashboard.error.text') }}</p></template>
        <template #actions>
            <UButton :label="t('dashboard.retry')" icon="i-lucide-refresh-cw" class="pill mt-3.5 min-h-14 w-full justify-center sm:w-auto" @click="onRetry" />
        </template>
    </UAlert>
    <div v-else-if="empty">
        <UCard variant="subtle" class="card card-state mt-6">
            <div class="mb-3.5 flex justify-center" aria-hidden="true">
                <div
                    v-for="(category, index) in EMPTY_BADGES"
                    :key="category"
                    class="-mr-2.5 rounded-full border-4 border-elevated last:mr-0"
                    :class="{ '-translate-y-2': index % 2 === 1 }"
                >
                    <CategoryBadge :category="category" :size="56" />
                </div>
            </div>
            <h2 class="text-2xl">{{ t('dashboard.emptyTitle') }}</h2>
            <p class="max-w-70 text-muted">{{ t('dashboard.emptyText') }}</p>
            <UButton :label="t('dashboard.emptyAdd')" icon="i-lucide-plus" class="pill pill-shadow mt-3.5 min-h-14 w-full justify-center sm:w-auto" @click="openAdd()" />
            <p class="mt-1.5 text-[0.8125rem] text-muted">{{ t('dashboard.emptyTip') }}</p>
        </UCard>
    </div>
    <template v-else>
        <section aria-labelledby="this-month-title">
            <UCard variant="subtle" class="card card-hero">
                <span class="hero-ring" aria-hidden="true" />
                <h2 id="this-month-title">{{ t('dashboard.thisMonth.title', { month: monthName(thisMonthSummary.month), year: thisMonthSummary.year }) }}</h2>
                <p class="hero-total">{{ euros(thisMonthSummary.total) }}</p>
                <p class="hero-pill mt-3">
                    <UIcon :name="thisMonthSummary.icon" class="size-3.5 sm:size-4" aria-hidden="true" />
                    {{ thisMonthSummary.comparison }}
                </p>
                <div class="mt-auto flex w-full flex-wrap items-center justify-between gap-3 pt-10">
                    <dl class="flex flex-wrap gap-x-8 gap-y-2">
                        <div>
                            <dt class="text-sm">{{ t('month.recurring') }}</dt>
                            <dd class="font-semibold tabular-nums">{{ cents(thisMonthSummary.recurringTotal) }}</dd>
                        </div>
                        <div>
                            <dt class="text-sm">{{ t('month.purchases') }}</dt>
                            <dd class="font-semibold tabular-nums">{{ cents(thisMonthSummary.purchasesTotal) }}</dd>
                        </div>
                    </dl>
                    <div v-if="thisMonthSummary.empty" class="flex flex-wrap items-center gap-3">
                        <p class="text-sm">{{ t('dashboard.thisMonth.empty') }}</p>
                        <UButton :label="t('costs.add')" class="pill border-white/60 text-white hover:bg-white/15 focus-visible:outline-white" color="neutral" variant="outline" @click="openAdd()" />
                    </div>
                    <UButton
                        :to="monthPath(currentYear, currentMonth)"
                        :label="t('dashboard.thisMonth.view', { month: monthYear(currentYear, currentMonth) })"
                        trailing-icon="i-lucide-arrow-right"
                        color="neutral" variant="solid"
                        class="pill ml-auto bg-white text-[#2D4BD8] hover:bg-white/90 focus-visible:outline-white"
                    />
                </div>
            </UCard>
        </section>
        <section aria-labelledby="largest-title">
            <UCard variant="subtle" class="card">
                <h2 id="largest-title">{{ t('dashboard.largest.title') }}</h2>
                <ul v-if="thisMonthSummary.largestRows.length" aria-labelledby="largest-title" class="flex flex-col gap-1.5">
                    <li v-for="row in thisMonthSummary.largestRows" :key="row.key" class="flex items-center gap-3 rounded-[1.125rem] bg-muted px-3 py-2.5">
                        <CategoryBadge :category="row.category" :size="40"/>
                        <div class="min-w-0 flex-1">
                            <p class="flex flex-wrap items-center gap-1.5 break-words font-bold">
                                {{ row.name }}
                                <BusinessBadge v-if="row.business" />
                            </p>
                            <p class="text-[0.8125rem] text-muted">{{ row.subline }}</p>
                        </div>
                        <p class="shrink-0 text-right font-extrabold tabular-nums">{{ row.amount }}</p>
                    </li>
                </ul>
                <p v-else class="mt-4">{{ t('dashboard.thisMonth.empty') }}</p>
            </UCard>
        </section>
        <section aria-labelledby="summary-title">
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 id="summary-title" class="mb-0 text-[1.625rem] font-extrabold tracking-tight">{{ t('dashboard.summary.title', { year: shownYear }) }}</h2>
                <YearSelect :model-value="shownYear" @update:model-value="year = $event" :years="years"/>
            </div>
            <UCard variant="subtle" class="card card-flush overflow-hidden">
                <dl class="grid grid-cols-2 gap-px bg-default lg:grid-cols-4">
                    <div v-for="tile in tiles" :key="tile.key" class="bg-elevated p-5 sm:p-6">
                        <dt class="mb-2 flex items-center gap-2 text-sm text-muted">
                            <span :class="['size-2.5 rounded-full', tile.dot]" aria-hidden="true" />
                            {{ tile.label }}
                        </dt>
                        <dd class="text-3xl font-bold tabular-nums">{{ tile.value }}</dd>
                        <dd class="mt-1 text-sm text-muted">{{ tile.sub }}</dd>
                    </div>
                </dl>
            </UCard>
        </section>
        <section aria-labelledby="categories-title">
            <UCard variant="subtle" class="card">
                <h2 id="categories-title">{{ t('dashboard.categories.title') }}</h2>
                <div class="mb-2.5 mt-4 flex h-3.5 gap-[3px] overflow-hidden rounded-full bg-accented" aria-hidden="true">
                    <div v-for="row in categoryRows" v-show="row.value > 0" :key="row.category" :class="categoryClass(row.category)" :style="{ width: `${row.value}%` }" />
                </div>
                <CategoryList :rows="categoryRows" />
            </UCard>
        </section>
        <section aria-labelledby="split-title">
            <UCard variant="subtle" class="card">
                <h2 id="split-title">{{ t('dashboard.split.title') }}</h2>
                <div class="flex flex-wrap items-center gap-6">
                    <div role="img"
                        :aria-label="t('dashboard.split.alt', { household: split.household, business: split.business })"
                        class="flex size-35 shrink-0 items-center justify-center rounded-full"
                        :style="{ background: splitRing }">
                        <div class="flex size-24 flex-col items-center justify-center rounded-full bg-elevated">
                            <span class="text-[1.375rem] font-extrabold tabular-nums">{{ split.household }}%</span>
                            <span class="text-[0.6875rem] font-semibold text-muted">{{ t('dashboard.split.household') }}</span>
                        </div>
                    </div>
                    <ul class="flex min-w-[8.75rem] flex-1 flex-col gap-3">
                        <li class="flex items-center gap-2.5">
                            <UIcon name="i-lucide-house" class="size-5 text-primary" aria-hidden="true" />
                            <span class="flex-1 font-bold">{{ t('dashboard.split.household') }}</span>
                            <span class="font-extrabold tabular-nums">{{ euros(summary.household) }}</span>
                        </li>
                        <li class="flex items-center gap-2.5">
                            <UIcon name="i-lucide-briefcase" class="size-5 text-secondary" aria-hidden="true" />
                            <span class="flex-1 font-bold">{{ t('business.label') }}</span>
                            <span class="font-extrabold tabular-nums">{{ euros(summary.business) }}</span>
                        </li>
                    </ul>
                </div>
            </UCard>
        </section>
        <section aria-labelledby="months-title" class="mt-6">
            <UCard variant="subtle" class="card">
                <div class="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 id="months-title" class="mb-0">{{ t('dashboard.months.title') }}</h2>
                    <p class="text-[0.8125rem] text-muted">{{ t('dashboard.months.hint') }}</p>
                </div>
                <div class="relative mt-4 overflow-x-auto p-1 pb-4">
                    <ol class="grid grid-cols-[repeat(12,minmax(2.75rem,1fr))] gap-2">
                        <li v-for="row in monthRows" :key="row.month" class="min-w-0">
                            <NuxtLink :to="row.to"  class="flex flex-col items-center gap-1 rounded focus-visible:outline-2 focus-visible:outline-primary">
                                <span class="sr-only">{{ row.text }}</span>
                                <span class="text-xs tabular-nums" :class="row.current ? 'font-bold text-primary' : 'text-muted'" aria-hidden="true">{{ row.value }}</span>
                                <span class="flex h-32 w-full items-end justify-center" aria-hidden="true" :title="row.text">
                                    <span class="block min-h-0.5 w-8 rounded-full" :class="row.current ? 'bg-primary' : 'bg-[var(--chart-soft)]'" :style="{ height: row.height }" />
                                </span>
                                <span class="text-xs" :class="{ 'font-bold': row.current }" aria-hidden="true">{{ row.short }}</span>
                            </NuxtLink>
                        </li>
                    </ol>
                </div>
            </UCard>
        </section>
    </template>
</template>
