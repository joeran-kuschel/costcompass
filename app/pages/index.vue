<script lang="ts" setup>
import { annualSummary } from '~~/shared/utils/costs'

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
const tiles = computed(() => (['total', 'household', 'business', 'averagePerMonth'] as const).map(key => ({
    key,
    label: t(`dashboard.summary.${key}`),
    value: euros(summary.value[key]),
})))


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
    <section v-else aria-labelledby="summary-title">
        <h2 id="summary-title">{{ t('dashboard.summary.title', { year }) }}</h2>
        <div class="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-3">
            <UCard v-for="tile in tiles" :key="tile.key" variant="subtle" :title="tile.label">
                <p class="text-2xl font-medium">{{ tile.value }}</p>
            </UCard>
        </div>
    </section>
</template>
