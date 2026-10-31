<script setup lang="ts">

const { t, n, locale } = useI18n()
const { data: recurring, refresh: refreshRecurring } = await useFetch<Stored<RecurringCost>[]>('/api/recurring-costs')
const { data: purchases, refresh: refreshPurchases } = await useFetch<Stored<Purchase>[]>('/api/purchases')
const costs = computed<Stored<Cost>[]>(() => [
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
    { id: 'actions', header: t('costs.columns.actions') },
])
const toast = useToast()
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
const toDelete = ref<Stored<Cost> | null>(null)
const toEdit = ref<Stored<Cost> | null>(null)

watch(open, (isOpen) => { if (!isOpen) toEdit.value = null })
async function onSaved() {
    await refreshAll()
    open.value = false
}
async function onDelete (cost: Stored<Cost>) {
    const url = cost.kind === 'recurring' ? '/api/recurring-costs' : '/api/purchases'
    try {
        await $fetch(`${url}/${cost.id}`, { method: 'DELETE' })
        await refreshAll()
    } catch {
        toast.add({ title: t('costs.deleteError'), color: 'error'})
    }
}
async function confirmDelete() {
    if (!toDelete.value) return
    await onDelete(toDelete.value)
    toDelete.value = null
}
</script>
<template>
    <h1>{{ t('costs.title') }}</h1>
    <UModal v-model:open="open" :title="toEdit ? t('costs.edit', { name: toEdit.name }) : t('costs.add')">
        <UButton :label="t('costs.add')" />
        <template #body>
            <CostForm :cost="toEdit" @saved="onSaved" @cancel="open = false" />
        </template>
    </UModal>
    <UTable :data="costs" :columns="columns">
        <template #category-cell="{ row }">{{ t(`category.${row.original.category}`) }}</template>
        <template #kind-cell="{ row }">{{ t(`kind.${row.original.kind}`) }}</template>
        <template #amount-cell="{ row }">{{ n(row.original.amount, { style: 'currency', currency: 'EUR' }) }}</template>
        <template #when-cell="{ row }">{{ whenLabel(row.original) }}</template>
        <template #business-cell="{ row }">{{ row.original.business ? t('common.yes') : t('common.no') }}</template>
        <template #actions-cell="{ row }">
            <UButton icon="i-lucide-trash-2" color="error" variant="ghost" @click="toDelete = row.original" :aria-label="t('costs.delete', { name: row.original.name })"/>
            <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" @click="toEdit = row.original; open=true" :aria-label="t('costs.edit', { name: row.original.name })"/>
        </template>
    </UTable>
    <UModal
        :open="toDelete !== null"
        :title="t('costs.confirmTitle')"
        :description="t('costs.confirmText', { name: toDelete?.name ?? '' })"
        @update:open="(isOpen: boolean) => { if (!isOpen) toDelete = null }"
    >
        <template #footer>
            <UButton color="neutral" variant="outline" :label="t('common.cancel')" @click="toDelete = null" />
            <UButton color="error" :label="t('common.delete')" @click="confirmDelete" />
        </template>
    </UModal>

</template>
