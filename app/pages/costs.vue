<script setup lang="ts">
const { t, n, locale } = useI18n()
const { data: recurring, refresh: refreshRecurring } = await useFetch<RecurringCost[]>('/api/recurring-costs')
const { data: purchases, refresh: refreshPurchases } = await useFetch<Purchase[]>('/api/purchases')
const costs = computed<Cost[]>(() => [
    ...(recurring.value ?? []),
    ...(purchases.value ?? []),
])
const columns = computed(() => [
    { accessorKey: 'name', header: t('costs.columns.name') },
    { accessorKey: 'category', header: t('costs.columns.category') },
    { accessorKey: 'kind', header: t('costs.columns.kind') },
    { id: 'when', header: t('costs.columns.when') },
    { accessorKey: 'amount', header: t('costs.columns.amount') },
    { accessorKey: 'business', header: t('costs.columns.business') },
])

function monthName(month: number): string {
    return new Intl.DateTimeFormat(locale.value, { month: 'long', timeZone: 'UTC' })
        .format(new Date(Date.UTC(2000, month - 1, 1)))
}

function whenLabel(cost: Cost): string {
    if (cost.kind === 'purchase') {
        return new Date(cost.date).toLocaleDateString(locale.value, { timeZone: 'UTC' })
    }
    const interval = t(`interval.${cost.interval}`)
    if (cost.dueMonth === undefined) return interval
    return `${interval}, ${monthName(cost.dueMonth)}`
}
async function refreshAll() {
    await Promise.all([refreshRecurring(), refreshPurchases()])
}
const open = ref(false)
async function onSaved() {
    await refreshAll()
    open.value = false
}
</script>
<template>
    <h1>{{ t('costs.title') }}</h1>
    <UModal v-model:open="open" :title="t('costs.add')">
        <UButton :label="t('costs.add')" />
        <template #body>
            <CostForm @saved="onSaved" />
        </template>
    </UModal>
    <UTable :data="costs" :columns="columns">
        <template #category-cell="{ row }">{{ t(`category.${row.original.category}`) }}</template>
        <template #kind-cell="{ row }">{{ t(`kind.${row.original.kind}`) }}</template>
        <template #amount-cell="{ row }">{{ n(row.original.amount, { style: 'currency', currency: 'EUR' }) }}</template>
        <template #when-cell="{ row }">{{ whenLabel(row.original) }}</template>
        <template #business-cell="{ row }">{{ row.original.business ? t('common.yes') : t('common.no') }}</template>
    </UTable>
</template>
