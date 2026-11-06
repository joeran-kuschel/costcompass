<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

type SortableColumn = {
    getIsSorted: () => false | 'asc' | 'desc'
    toggleSorting: (desc?: boolean) => void
}

const { t, n, locale } = useI18n()
const { openAdd, openEdit } = useCostDialog()
const { recurring, purchases, failed, loading, retry } = useCostLists()
const toast = useToast()
const { kindIcon } = useKind()
const yearSummary = useYearSummary()
const euros = useMoney()
const cents = useMoney({ cents: true })
const { formatDate } = useMonth()
const cancelButton = useTemplateRef<{ $el: HTMLElement }>('cancel')

const UButton = resolveComponent('UButton')
const toDelete = ref<Stored<Cost> | null>(null)
const dialogContent = { role: 'alertdialog', onOpenAutoFocus: focusCancel }
const costs = computed<Stored<Cost>[]>(() => [
    ...(recurring.value ?? []),
    ...(purchases.value ?? []),
].sort((a, b) => a.name.localeCompare(b.name, locale.value)))
const columns = computed<TableColumn<Stored<Cost>>[]>(()  => [
    { accessorKey: 'name', header: sortableHeader(t('costs.columns.name')), sortingFn: (a, b) => a.original.name.localeCompare(b.original.name, locale.value) },
    { accessorKey: 'kind', header: sortableHeader(t('costs.columns.kind')), sortingFn: (a, b) => t(`kind.${a.original.kind}`).localeCompare(t(`kind.${b.original.kind}`), locale.value) },
    { id: 'when', header: t('costs.columns.when') },
    { accessorKey: 'amount', header: sortableHeader(t('costs.columns.amount')) },
    { id: 'actions', header: t('costs.columns.actions') },
])
const confirmText = computed(() => {
    const cost = toDelete.value
    if (!cost) return ''
    const amount = cents(cost.amount)
    return cost.kind === 'recurring'
        ? t('costs.confirmRecurring', { name: cost.name, amount, interval: t(`interval.${cost.interval}`).toLocaleLowerCase(locale.value) })
        : t('costs.confirmPurchase', { name: cost.name, amount, date: formatDate(cost.date, 'long') })
})
useHead({ title: () => t('costs.title') })

async function onDelete (cost: Stored<Cost>) {
    const url = cost.kind === 'recurring' ? '/api/recurring-costs' : '/api/purchases'
    try {
        await $fetch(`${url}/${cost.id}`, { method: 'DELETE' })
        await retry()
    } catch {
        toast.add({ title: t('costs.deleteError'), color: 'error'})
    }
}

async function confirmDelete() {
    if (!toDelete.value) return
    await onDelete(toDelete.value)
    toDelete.value = null
}
function focusCancel(event: Event) {
    event.preventDefault()
    cancelButton.value?.$el.focus()
}
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
const kindFilter = ref<'all' | Cost['kind']>('all')

const shownCosts = computed(() =>
    kindFilter.value === 'all'
        ? costs.value
        : costs.value.filter(cost => cost.kind === kindFilter.value)
)

</script>
<template>
    <header>
        <h1>{{ t('costs.title') }}</h1>
        <i18n-t v-if="!loading" keypath="costs.summary.line" tag="p" class="mt-1 text-muted" scope="global">
            <template #recurring>{{ t('costs.summary.recurring', yearSummary.recurringCount) }}</template>
            <template #purchases>{{ t('costs.summary.purchases', yearSummary.purchasesCount) }}</template>
            <template #total><b class="font-extrabold tabular-nums text-default">{{ euros(yearSummary.total) }}</b></template>
            <template #year>{{ yearSummary.year }}</template>
        </i18n-t>
    </header>
    <section class="w-full">
        <div role="group" :aria-label="t('costs.filterLabel')" class="inline-flex gap-1 rounded-full bg-elevated p-1 shadow-xs">
            <p role="status" class="sr-only">{{ t('costs.shown', shownCosts.length) }}</p>
            <UButton
                :color="kindFilter === 'all' ? 'neutral' : 'neutral'"
                :variant="kindFilter === 'all' ? 'solid' : 'ghost'"
                class="focus-visible:outline-2 focus-visible:outline-primary min-h-10 rounded-full px-4 text-sm font-bold aria-[pressed=false]:text-muted"
                @click="kindFilter= 'all'"
                :label="t('costs.all', yearSummary.recurringCount + yearSummary.purchasesCount)"
                :aria-pressed="kindFilter === 'all'"
                :icon="kindFilter === 'all' ? 'i-lucide-check' : undefined"
            />
            <UButton
                :color="kindFilter === 'recurring' ? 'neutral' : 'neutral'"
                :variant="kindFilter === 'recurring' ? 'solid' : 'ghost'"
                class="focus-visible:outline-2 focus-visible:outline-primary min-h-10 rounded-full px-4 text-sm font-bold aria-[pressed=false]:text-muted"
                @click="kindFilter = 'recurring'"
                :label="t('costs.recurring', yearSummary.recurringCount)"
                :aria-pressed="kindFilter === 'recurring'"
                :icon="kindFilter === 'recurring' ? 'i-lucide-check' : undefined"
            />
            <UButton
                :color="kindFilter === 'purchase' ? 'neutral' : 'neutral'"
                :variant="kindFilter === 'purchase' ? 'solid' : 'ghost'"
                class="focus-visible:outline-2 focus-visible:outline-primary min-h-10 rounded-full px-4 text-sm font-bold aria-[pressed=false]:text-muted"
                @click="kindFilter = 'purchase'"
                :label="t('costs.purchases', yearSummary.purchasesCount)"
                :aria-pressed="kindFilter === 'purchase'"
                :icon="kindFilter === 'purchase' ? 'i-lucide-check' : undefined"
            />
        </div>
    </section>
    <UTable :data="shownCosts" :columns="columns" class="card" :ui="{ root: 'overflow-x-auto px-5 pb-2 pt-1', th: 'px-2 pb-2.5 pt-3.5 text-[13px] font-extrabold uppercase tracking-wide text-muted', td: 'px-2 py-2.5 text-sm text-default' }">
        <template #name-cell="{ row }">
            <div class="flex min-w-48 items-center gap-3 whitespace-normal">
                <CategoryBadge :category="row.original.category" :size="40" />
                <div class="min-w-0">
                    <p class="flex flex-wrap items-center gap-x-2 gap-y-1 break-words font-bold">
                        {{ row.original.name }}
                        <BusinessBadge v-if="row.original.business" />
                    </p>
                    <p class="text-sm text-muted">{{ t(`category.${row.original.category}`) }}</p>
                </div>
            </div>
        </template>
        <template #kind-cell="{ row }">
            <span class="flex items-center gap-2">
                <UIcon :name="kindIcon(row.original.kind)" class="size-4 shrink-0 text-muted" aria-hidden="true" />
                {{ t(`kind.${row.original.kind}`) }}
            </span>
        </template>
        <template #amount-cell="{ row }">{{ n(row.original.amount, { style: 'currency', currency: 'EUR' }) }}</template>
        <template #when-cell="{ row }"><span class="whitespace-normal">{{ whenLabel(row.original) }}</span></template>
        <template #actions-cell="{ row }">
            <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" class="pill-icon" @click="openEdit(row.original)" :aria-label="t('costs.edit', { name: row.original.name })"/>
            <UButton icon="i-lucide-trash-2" color="neutral" variant="ghost" class="pill-icon" @click="toDelete = row.original" :aria-label="t('costs.delete', { name: row.original.name })"/>
        </template>
    </UTable>
    <UModal
        :open="toDelete !== null"
        :title="t('costs.confirmTitle')"
        :description="confirmText"
        :close="false"
        :content="dialogContent"
        :ui="{ content: 'rounded-[2rem] bg-elevated', header: 'flex-col items-center gap-2 text-center', footer: 'flex-col items-stretch gap-2.5 lg:flex-row' }"
        @update:open="(isOpen: boolean) => { if (!isOpen) toDelete = null }"
    >
        <template #title>
            <span class="mx-auto mb-1.5 flex size-15 items-center justify-center rounded-full bg-error/10 text-error" aria-hidden="true">
                <UIcon name="i-lucide-trash-2" class="size-6.5" />
            </span>
            <span class="block text-[1.375rem] font-extrabold">{{ t('costs.confirmTitle') }}</span>
        </template>
        <template #footer>
            <UButton loading-auto color="error" :label="t('common.delete')" class="pill justify-center" block @click="confirmDelete" />
            <UButton ref="cancel" color="primary" variant="soft" :label="t('common.cancel')" class="pill justify-center" block @click="toDelete = null" />
        </template>
    </UModal>


</template>
