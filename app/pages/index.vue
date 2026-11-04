<script lang="ts" setup>
import { annualSummary, categoryBreakDown, splitPercentages, monthBreakdown, monthChange, costsInMonth, groupMonthCosts, largestCosts} from '~~/shared/utils/costs'

const { t } = useI18n()
const { year, currentYear, currentMonth } = useYear()
const { monthName, monthYear, monthPath, toRow } = useMonth()
const { recurring, purchases, failed, loading, retry } = useCostLists()
const years = computed(() => availableYears(purchases.value ?? [], currentYear.value))
const shownYear = computed(() => years.value.includes(year.value) ? year.value : currentYear.value)
const empty = computed(() => !failed.value && !loading.value && recurring.value?.length === 0 && purchases.value?.length === 0)
const summary = computed (() => annualSummary(recurring.value ?? [], purchases.value ?? [], shownYear.value))
const euros = useMoney()
const cents = useMoney({ cents: true })
const categoryRows = computed (() => categoryBreakDown(recurring.value ?? [], purchases.value ?? [], shownYear.value).map(({ category, total, share}) => ({
    category,
    label: t(`category.${category}`),
    amount: euros(total),
    width: `${share*100}%`,
})))
const split = computed(() => splitPercentages(summary.value))
const tiles = computed(() => [
    { key: 'total', value: summary.value.total, label: t('dashboard.summary.total'), sub: t('dashboard.summary.perYear'),  dot: 'bg-inverted' },
    { key: 'average', value: summary.value.averagePerMonth, label: t('dashboard.summary.average'), sub: t('dashboard.summary.perMonth'), dot: 'bg-accented' },
    { key: 'household', value: summary.value.household, label: t('dashboard.summary.household'), sub: t('dashboard.summary.ofYear', { percent: split.value.household }), dot: 'bg-primary' },
    { key: 'business',  value: summary.value.business, label: t('business.label'), sub: t('dashboard.summary.ofYear', { percent: split.value.business }),  dot: 'bg-secondary' },
].map(tile => ({ ...tile, value: euros(tile.value) })))
const monthRows = computed (() => monthBreakdown(recurring.value ?? [], purchases.value ?? [], shownYear.value).map(({ month, total, share}) => {
    return {
        month,
        short: monthName(month, 'short'),
        text: t('dashboard.months.alt', { month: monthName(month, 'long'), amount: euros(total)}),
        height: `${share * 100}%`,
        to: monthPath(shownYear.value, month),
        current: shownYear.value === currentYear.value && month === currentMonth.value
    }
}))
const thisMonth = computed(() => {
    const change = monthChange(recurring.value ?? [], purchases.value ?? [], currentYear.value, currentMonth.value)
    const percent = change.percent
    const direction = percent === null ? 'none' : percent < 0 ? 'less': percent > 0 ? 'more' : 'same'
    const costs = costsInMonth(recurring.value ?? [], purchases.value ?? [], currentYear.value, currentMonth.value)
    const groups = groupMonthCosts(costs)
    return {
        title: t('dashboard.thisMonth.title', { month: monthName(currentMonth.value), year: currentYear.value}),
        total: euros(change.current),
        comparison: t(`dashboard.thisMonth.${direction}`, { percent: Math.abs(percent ?? 0), previous: monthName (currentMonth.value === 1 ? 12 : currentMonth.value - 1) }),
        icon: { less: 'i-lucide-trending-down', more: 'i-lucide-trending-up', same: 'i-lucide-minus', none: 'i-lucide-minus'}[direction],
        recurringTotal: cents(groups.recurringTotal),
        purchasesTotal: cents(groups.purchasesTotal),
        empty: costs.length === 0,
        largest: largestCosts(costs).map(toRow)
    }
})
const { openAdd } = useCostDialog()

useHead({ title: () => t('nav.dashboard') })
</script>
<template>
    <h1>{{ t('nav.dashboard') }}</h1>
    <p v-if="loading" role="status">{{ t('dashboard.loading') }}</p>
    <UAlert
        v-else-if="failed"
        role="alert"
        color="error"
        :title="t('dashboard.error')"
        :actions="[{label: t('dashboard.retry'), onClick: retry}]"
    />
    <div v-else-if="empty">
        <h2>{{ t('dashboard.emptyTitle') }}</h2>
        <p>{{ t('dashboard.emptyText') }}</p>
        <UButton to="/costs" :label="t('costs.add')" class="pill" />
    </div>
    <template v-else>
        <section aria-labelledby="this-month-title">
            <UCard variant="subtle" class="card card-hero">
                <span class="hero-ring" aria-hidden="true" />
                <h2 id="this-month-title">{{ thisMonth.title }}</h2>
                <p class="hero-total">{{ thisMonth.total }}</p>
                <p class="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1">
                    <UIcon :name="thisMonth.icon" aria-hidden="true" />
                    {{ thisMonth.comparison }}
                </p>
                <div class="mt-10 flex flex-wrap items-center justify-between gap-3">
                    <dl class="flex flex-wrap gap-x-8 gap-y-2">
                        <div>
                            <dt class="text-sm">{{ t('month.recurring') }}</dt>
                            <dd class="font-semibold tabular-nums">{{ thisMonth.recurringTotal }}</dd>
                        </div>
                        <div>
                            <dt class="text-sm">{{ t('month.purchases') }}</dt>
                            <dd class="font-semibold tabular-nums">{{ thisMonth.purchasesTotal }}</dd>
                        </div>
                    </dl>
                    <div v-if="thisMonth.empty" class="flex flex-wrap items-center gap-3">
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
                <ul v-if="thisMonth.largest.length" aria-labelledby="largest-title" class="flex flex-col gap-1.5">
                    <li v-for="row in thisMonth.largest" :key="row.key" class="flex items-center gap-3 rounded-[1.125rem] bg-muted px-3 py-2.5">
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
            <h2 id="categories-title">{{ t('dashboard.categories.title', { year: shownYear }) }}</h2>
            <UCard variant="subtle" class="card">
                <ul>
                    <li v-for="row in categoryRows" :key="row.category"
                        class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-1 sm:grid-cols-[7rem_minmax(0,1fr)_5rem]">
                        <CategoryBadge :category="row.category" :size="36"/>
                        <span class="break-words">{{ row.label }}</span>
                        <span class="text-right sm:order-3">{{ row.amount }}</span>
                        <span class="col-span-2 h-2.5 rounded bg-accented sm:order-2 sm:col-span-1" aria-hidden="true">
                            <span class="block h-full rounded bg-primary" :style="{ width: row.width }" />
                        </span>
                    </li>
                </ul>
            </UCard>
        </section>
        <section aria-labelledby="split-title" class="mt-6">
            <h2 id="split-title">{{ t('dashboard.split.title', { year: shownYear } )}}</h2>
            <UCard variant="subtle" class="card">
                <div class="flex h-3 overflow-hidden rounded bg-accented" role="img" :aria-label="t('dashboard.split.alt', { household: split.household, business: split.business })">
                    <div v-if="split.household > 0" class="bg-primary" :style="{ width: `${split.household}%` }" />
                    <div v-if="split.business > 0" class="bg-secondary" :style="{ width: `${split.business}%` }" />
                </div>
                <ul class="mt-3 flex flex-wrap gap-x-6 gap-y-1">
                    <li class="flex items-center gap-2">
                        <span class="size-3 rounded-sm bg-primary" aria-hidden="true" />
                        {{ t('dashboard.split.household') }} {{ split.household }}%
                    </li>
                    <li class="flex items-center gap-2">
                        <span class="size-3 rounded-sm bg-secondary" aria-hidden="true" />
                        {{ t('business.label') }} {{ split.business }}%
                    </li>
                </ul>
            </UCard>
        </section>
        <section aria-labelledby="months-title" class="mt-6">
            <h2 id="months-title">{{ t('dashboard.months.title', { year: shownYear }) }}</h2>
            <UCard variant="subtle" class="card">
                <div class="relative overflow-x-auto p-1">
                    <ol class="grid grid-cols-[repeat(12,minmax(1.5rem,1fr))] gap-1">
                        <li v-for="row in monthRows" :key="row.month" class="min-w-0">
                            <NuxtLink :to="row.to"  class="flex flex-col items-center gap-1 rounded focus-visible:outline-2 focus-visible:outline-primary">
                                <span class="sr-only">{{ row.text }}</span>
                                <span class="flex h-32 w-full items-end" aria-hidden="true" :title="row.text">
                                    <span class="block min-h-0.5 w-full rounded-t bg-primary" :style="{ height: row.height }" />
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
