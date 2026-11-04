<script lang="ts" setup>
import { annualSummary, categoryBreakDown, splitPercentages, monthBreakdown, monthChange, costsInMonth} from '~~/shared/utils/costs'

const { t } = useI18n()
const { year, currentYear, currentMonth } = useYear()
const { monthName, monthYear, monthPath } = useMonth()
const { recurring, purchases, failed, loading, retry } = useCostLists()
const years = computed(() => availableYears(purchases.value ?? [], currentYear.value))
const shownYear = computed(() => years.value.includes(year.value) ? year.value : currentYear.value)
const empty = computed(() => !failed.value && !loading.value && recurring.value?.length === 0 && purchases.value?.length === 0)
const summary = computed (() => annualSummary(recurring.value ?? [], purchases.value ?? [], shownYear.value))
const euros = useMoney()
const categoryRows = computed (() => categoryBreakDown(recurring.value ?? [], purchases.value ?? [], shownYear.value).map(({ category, total, share}) => ({
    category,
    label: t(`category.${category}`),
    amount: euros(total),
    width: `${share*100}%`,
})))
const tiles = computed(() => (['total', 'household', 'business', 'averagePerMonth'] as const).map(key => ({
    key,
    label: key === 'business' ? t('business.label') : t(`dashboard.summary.${key}`),
    value: euros(summary.value[key]),
})))
const split = computed(() => splitPercentages(summary.value))
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
    return {
        title: t('dashboard.thisMonth.title', { month: monthName(currentMonth.value), year: currentYear.value}),
        total: euros(change.current),
        comparison: t(`dashboard.thisMonth.${direction}`, { percent: Math.abs(percent ?? 0), previous: monthName (currentMonth.value === 1 ? 12 : currentMonth.value - 1) }),
        icon: { less: 'i-lucide-trending-down', more: 'i-lucide-trending-up', same: 'i-lucide-minus', none: 'i-lucide-minus'}[direction],
                listLabel: t('dashboard.thisMonth.list', { month: monthName(currentMonth.value) }),
        rows: costsInMonth(recurring.value ?? [], purchases.value ?? [], currentYear.value, currentMonth.value).map(cost => ({
            key: `${cost.kind}-${cost.id}`,
            name: cost.name,
            kind: t(`kind.${cost.kind}`),
            business: cost.business,
            amount: euros(cost.amount),
        }))
    }
})
const open = ref(false)

useHead({ title: () => t('nav.dashboard') })
async function onSaved() {
    await retry()
    open.value = false
}
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
        <YearSelect :model-value="shownYear" @update:model-value="year = $event" :years="years"/>
        <section aria-labelledby="this-month-title">
            <UCard variant="subtle" class="card">
                <h2 id="this-month-title">{{ thisMonth.title }}</h2>
                <p class="text-5xl font-extrabold tracking-tight tabular-nums">{{ thisMonth.total }}</p>
                <p class="flex items-center gap-2">
                    <UIcon :name="thisMonth.icon" aria-hidden="true" />
                    {{ thisMonth.comparison }}
                </p>
                <ul v-if="thisMonth.rows.length" :aria-label="thisMonth.listLabel" class="mt-4 divide-y divide-default">
                    <li v-for="row in thisMonth.rows" :key="row.key" class="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                        <span class="min-w-0 flex-[1_1_8rem] break-words">{{ row.name }}</span>
                        <UBadge :label="row.kind" color="neutral" variant="subtle" />
                        <BusinessBadge v-if="row.business" />
                        <span class="w-24 text-right">{{ row.amount }}</span>
                    </li>
                </ul>
                <div v-else class="mt-4">
                    <p>{{ t('dashboard.thisMonth.empty') }}</p>
                    <UButton :label="t('costs.add')" class="pill mt-2" @click="open = true" />
                </div>
                <UButton
                    :to="monthPath(currentYear, currentMonth)"
                    :label="t('dashboard.thisMonth.view', { month: monthYear(currentYear, currentMonth) })"
                    trailing-icon="i-lucide-arrow-right"
                    variant="link"
                    class="mt-4 px-0"
                />
            </UCard>
        </section>
        <section aria-labelledby="add-cost-title">
            <UCard variant="subtle" class="card">
                <h2 id="add-cost-title">{{ t('dashboard.addCost.title') }}</h2>
                <p class="font-medium">{{ t('dashboard.addCost.text') }}</p>
                <p>
                    <UModal :ui="{ content: 'rounded-[2rem] bg-elevated' }" v-model:open="open" :title="t('costs.add')">
                        <UButton :label="t('costs.add')" class="pill" />
                        <template #body>
                            <CostForm @saved="onSaved" @cancel="open = false" />
                        </template>
                    </UModal>
                </p>
            </UCard>
        </section>
        <section aria-labelledby="summary-title">
            <h2 id="summary-title">{{ t('dashboard.summary.title', { year: shownYear }) }}</h2>
            <div class="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-3">
                <UCard v-for="tile in tiles" :key="tile.key" variant="subtle" :title="tile.label" class="card">
                    <p class="text-2xl font-medium">{{ tile.value }}</p>
                </UCard>
            </div>
        </section>
        <section aria-labelledby="categories-title">
            <h2 id="categories-title">{{ t('dashboard.categories.title', { year: shownYear }) }}</h2>
            <UCard variant="subtle" class="card">
                <ul>
                    <li v-for="row in categoryRows" :key="row.category"
                        class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-1 sm:grid-cols-[7rem_minmax(0,1fr)_5rem]">
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
