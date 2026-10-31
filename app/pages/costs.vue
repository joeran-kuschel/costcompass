<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

type SortableColumn = {
    getIsSorted: () => false | 'asc' | 'desc'
    toggleSorting: (desc?: boolean) => void
}

const { t, n, locale } = useI18n()
const { data: recurring, refresh: refreshRecurring } = await useFetch<Stored<RecurringCost>[]>('/api/recurring-costs')
const { data: purchases, refresh: refreshPurchases } = await useFetch<Stored<Purchase>[]>('/api/purchases')
const toast = useToast()
const UButton = resolveComponent('UButton')
const costs = computed<Stored<Cost>[]>(() => [
    ...(recurring.value ?? []),
    ...(purchases.value ?? []),
].sort((a, b) => a.name.localeCompare(b.name, locale.value)))
const columns = computed<TableColumn<Stored<Cost>>[]>(()  => [
    { accessorKey: 'name', header: sortableHeader(t('costs.columns.name')), sortingFn: (a, b) => a.original.name.localeCompare(b.original.name, locale.value) },
    { accessorKey: 'category', header: sortableHeader(t('costs.columns.category')), sortingFn: (a, b) => t(`category.${a.original.category}`).localeCompare(t(`category.${b.original.category}`) , locale.value) },
    { accessorKey: 'kind', header: sortableHeader(t('costs.columns.kind')), sortingFn: (a, b) => t(`kind.${a.original.kind}`).localeCompare(t(`kind.${b.original.kind}`), locale.value) },
    { id: 'when', header: t('costs.columns.when') },
    { accessorKey: 'amount', header: sortableHeader(t('costs.columns.amount')) },
    { accessorKey: 'business', header: sortableHeader(t('costs.columns.business')) },
    { id: 'actions', header: t('costs.columns.actions') },
])
const open = ref(false)
const toDelete = ref<Stored<Cost> | null>(null)
const toEdit = ref<Stored<Cost> | null>(null)

watch(open, (isOpen) => { if (!isOpen) toEdit.value = null })
useHead({ title: () => t('costs.title') })

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

function sortableHeader(label: string) {
    return ({ column }: { column: SortableColumn }) => {
        const sorted = column.getIsSorted()
        return h(UButton, {
            color: 'neutral',
            variant: 'ghost',
            label,
            'aria-label': t(`costs.sort.${sorted || 'none'}`, { column: label }),
            icon: sorted === 'asc' ? 'i-lucide-arrow-up' : sorted === 'desc' ? 'i-lucide-arrow-down' : 'i-lucide-arrow-up-down',
            onClick: () => column.toggleSorting(sorted === 'asc'),
        })
    }
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
