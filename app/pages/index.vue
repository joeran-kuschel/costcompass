<script lang="ts" setup>
import { annualSummary, categoryBreakDown, splitPercentages } from '~~/shared/utils/costs'

const { t } = useI18n()
const year = new Date().getUTCFullYear()
const { data: recurring, status: recurringStatus, error: recurringError, refresh: refreshRecurring }
    = useFetch<Stored<RecurringCost>[]>('/api/recurring-costs', { lazy: true })
const { data: purchases, status: purchasesStatus, error: purchasesError, refresh: refreshPurchases }
    = useFetch<Stored<Purchase>[]>('/api/purchases', { lazy: true })
const failed = computed(() => !!recurringError.value || !!purchasesError.value)
const loading = computed(() => !failed.value && (!recurring.value || !purchases.value))
const empty = computed(() => !failed.value && !loading.value && recurring.value?.length === 0 && purchases.value?.length === 0)
const summary = computed (() => annualSummary(recurring.value ?? [], purchases.value ?? [], year))
const euros = useMoney()
const categoryRows = computed (() => categoryBreakDown(recurring.value ?? [], purchases.value ?? [], year).map(({ category, total, share}) => ({
    category,
    label: t(`category.${category}`),
    amount: euros(total),
    width: `${share*100}%`,
})))
const tiles = computed(() => (['total', 'household', 'business', 'averagePerMonth'] as const).map(key => ({
    key,
    label: t(`dashboard.summary.${key}`),
    value: euros(summary.value[key]),
})))
const split = computed(() => splitPercentages(summary.value))


useHead({ title: () => t('nav.dashboard') })
async function retry() {
    await Promise.all([refreshRecurring(), refreshPurchases()])
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
        <UButton to="/costs" :label="t('costs.add')" />
    </div>
    <template v-else>
    <section aria-labelledby="summary-title">
        <h2 id="summary-title">{{ t('dashboard.summary.title', { year }) }}</h2>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-3">
            <UCard v-for="tile in tiles" :key="tile.key" variant="subtle" :title="tile.label">
                <p class="text-2xl font-medium">{{ tile.value }}</p>
            </UCard>
        </div>
    </section>
    <section aria-labelledby="categories-title">
        <h2 id="categories-title">{{ t('dashboard.categories.title', { year }) }}</h2>
        <UCard variant="subtle">
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
        <h2 id="split-title">{{ t('dashboard.split.title', { year } )}}</h2>
        <UCard variant="subtle">
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
                    {{ t('dashboard.split.business') }} {{ split.business }}%
                </li>
            </ul>
        </UCard>
    </section>
    </template>
</template>
