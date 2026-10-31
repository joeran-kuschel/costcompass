<script lang="ts" setup>
const { t } = useI18n()
const { data: recurring, status: recurringStatus, error: recurringError, refresh: refreshRecurring }
    = useFetch<Stored<RecurringCost>[]>('/api/recurring-costs', { lazy: true })
const { data: purchases, status: purchasesStatus, error: purchasesError, refresh: refreshPurchases }
    = useFetch<Stored<Purchase>[]>('/api/purchases', { lazy: true })
const failed = computed(() => !!recurringError.value || !!purchasesError.value)
const loading = computed(() => !failed.value && (!recurring.value || !purchases.value))
const empty = computed(() => !failed.value && !loading.value && recurring.value?.length === 0 && purchases.value?.length === 0)

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
</template>
