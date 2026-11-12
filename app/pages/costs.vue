<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

type SortableColumn = {
    getIsSorted: () => false | 'asc' | 'desc'
    toggleSorting: (desc?: boolean) => void
}

const { t, n, locale } = useI18n()
const { openEdit } = useCostDialog()
const { recurring, purchases, failed, loading, retry } = useCostLists()
const toast = useToast()
const { kindIcon } = useKind()
const yearSummary = useYearSummary()
const euros = useMoney()
const cents = useMoney({ cents: true })
const { formatDate } = useMonth()
const cancelButton = useTemplateRef<{ $el: HTMLElement }>('cancel')
const allChip = useTemplateRef<{ $el: HTMLElement }>('allChip')
const categoryGroup = useTemplateRef<HTMLElement>('categoryGroup')
const searchField = useTemplateRef<{ inputRef: HTMLInputElement | null }>('searchField')
const heading = useTemplateRef<HTMLElement>('heading')

const UButton = resolveComponent('UButton')
const search = ref('')
const toDelete = ref<Stored<Cost> | null>(null)
const categoryFilter = ref<Category | null>(null)
const searchOpen = ref(false)
const sorting = ref<{ id: string, desc: boolean }[]>([])
const sortColumn = ref('')
const sortOrder = ref('sortedAsc')
let focusAfterClose: HTMLElement | null = null
const dialogContent = { role: 'alertdialog', onOpenAutoFocus: focusCancel, onCloseAutoFocus: restoreFocus }
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
const kindFilter = ref<'all' | Cost['kind']>('all')
const shownCosts = computed(() => {
    const term = normalize(search.value.trim())
    return costs.value.filter(cost =>
        (kindFilter.value === 'all' || cost.kind === kindFilter.value)
        && (categoryFilter.value === null || cost.category === categoryFilter.value)
        && (term === '' || normalize(`${cost.name} ${t(`category.${cost.category}`)}`).includes(term))
    )
})

useHead({ title: () => t('costs.title') })
watch(() => sorting.value, (value) => {
    if (!value[0]) return
    sortColumn.value = value[0].id ?? ''
    sortOrder.value = value[0].desc === true ? 'sortedDesc' : 'sortedAsc'
})

async function onDelete (cost: Stored<Cost>) {
    const url = cost.kind === 'recurring' ? '/api/recurring-costs' : '/api/purchases'
    try {
        await $fetch(`${url}/${cost.id}`, { method: 'DELETE' })
        await retry()
        toast.add({ title: t('costs.deleted', { name: cost.name }) })
        return true
    } catch {
        toast.add({ title: t('costs.deleteError'), color: 'error'})
        return false
    }
}

async function confirmDelete() {
    if (!toDelete.value) return
    const key = `${toDelete.value.kind}-${toDelete.value.id}`
    const index = visibleRowButtons().findIndex(b => b.dataset.row === key)
    const deleted = await onDelete(toDelete.value)
    if (deleted) {
        await nextTick()
        const buttons = visibleRowButtons()
        focusAfterClose = buttons[Math.min(index, buttons.length - 1)] ?? heading.value
    }
    toDelete.value = null
}
// The button disappears with the card, so the focus moves to the "All" chip instead of getting lost;
// below sm the kind chips are hidden (#86), so it moves to the first category chip there.
async function clearFilters() {
    kindFilter.value = 'all'
    categoryFilter.value = null
    search.value = ''
    await nextTick()
    const all = allChip.value?.$el
    const target = all?.checkVisibility?.() === false ? categoryGroup.value?.querySelector('button') : all
    target?.focus()
}
async function toggleSearch() {
    searchOpen.value = !searchOpen.value
    if (!searchOpen.value) {
        search.value = ''
        return
    }
    await nextTick()
    searchField.value?.inputRef?.focus()

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
function normalize(text: string): string {
    return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase(locale.value)
}
function restoreFocus(event: Event) {
    if (!focusAfterClose) return   // Cancel and a failed delete: the dialog returns the focus to the opener
    event.preventDefault()
    focusAfterClose.focus()
    focusAfterClose = null
}
function visibleRowButtons() {
    return [...document.querySelectorAll<HTMLElement>('[data-row]')].filter(b => b.checkVisibility())
}
</script>
<template>
    <header>
        <div class="flex items-center justify-between gap-2">
            <h1 ref="heading" tabindex="-1">{{ t('costs.title') }}</h1>
            <UButton
                class="sm:hidden search-compact me-14 -mt-4 size-11 shrink-0 self-start justify-center"
                :ui="{ leadingIcon: 'size-5' }"
                color="neutral"
                variant="ghost"
                icon="i-lucide-search"
                :aria-label="t('costs.search.label')"
                :aria-expanded="searchOpen"
                aria-controls="cost-search"
                @click="toggleSearch"
            />
        </div>
        <i18n-t v-if="!loading" keypath="costs.summary.line" tag="p" class="mt-1 text-muted" scope="global">
            <template #recurring>{{ t('costs.summary.recurring', yearSummary.recurringCount) }}</template>
            <template #purchases>{{ t('costs.summary.purchases', yearSummary.purchasesCount) }}</template>
            <template #total><b class="font-extrabold tabular-nums text-default">{{ euros(yearSummary.total) }}</b></template>
            <template #year>{{ yearSummary.year }}</template>
        </i18n-t>
    </header>
    <section :class="searchOpen ? 'block' : 'hidden sm:block'" class="w-full self-end sm:w-80">
        <UInput
            ref="searchField"
            id="cost-search"
            type="search"
            class="w-full"
            v-model="search"
            icon="i-lucide-search"
            :placeholder="t('costs.search.label')"
            :aria-label="t('costs.search.label')"
            :ui="{ base: 'min-h-11 rounded-full bg-elevated font-semibold shadow-xs ring-transparent' }"
        />
    </section>
    <section class="flex w-full flex-wrap items-center gap-2">
        <!-- Phones see the kinds as the grouped lists (#86), so the kind chips start at sm. -->
        <div role="group" :aria-label="t('costs.filterLabel')" class="hidden sm:inline-flex gap-1 rounded-full bg-elevated p-1 shadow-xs">
            <UButton
                ref="allChip"
                color="neutral"
                :variant="kindFilter === 'all' ? 'solid' : 'ghost'"
                class="focus-visible:outline-2 focus-visible:outline-primary min-h-10 rounded-full px-4 text-sm font-bold aria-[pressed=false]:text-muted"
                @click="kindFilter= 'all'"
                :label="t('costs.all', yearSummary.recurringCount + yearSummary.purchasesCount)"
                :aria-pressed="kindFilter === 'all'"
                :icon="kindFilter === 'all' ? 'i-lucide-check' : undefined"
            />
            <UButton
                color="neutral"
                :variant="kindFilter === 'recurring' ? 'solid' : 'ghost'"
                class="focus-visible:outline-2 focus-visible:outline-primary min-h-10 rounded-full px-4 text-sm font-bold aria-[pressed=false]:text-muted"
                @click="kindFilter = 'recurring'"
                :label="t('costs.recurring', yearSummary.recurringCount)"
                :aria-pressed="kindFilter === 'recurring'"
                :icon="kindFilter === 'recurring' ? 'i-lucide-check' : undefined"
            />
            <UButton
                color="neutral"
                :variant="kindFilter === 'purchase' ? 'solid' : 'ghost'"
                class="focus-visible:outline-2 focus-visible:outline-primary min-h-10 rounded-full px-4 text-sm font-bold aria-[pressed=false]:text-muted"
                @click="kindFilter = 'purchase'"
                :label="t('costs.purchases', yearSummary.purchasesCount)"
                :aria-pressed="kindFilter === 'purchase'"
                :icon="kindFilter === 'purchase' ? 'i-lucide-check' : undefined"
            />
        </div>
        <span aria-hidden="true" class="mx-1 hidden h-7 w-px bg-accented sm:block" />
        <div ref="categoryGroup" role="group" :aria-label="t('costs.filterByCategoryLabel')" class="-my-1 flex w-full gap-2 overflow-x-auto py-1 [scrollbar-width:none] sm:my-0 sm:w-auto sm:flex-wrap sm:overflow-visible sm:py-0">
            <UButton
                v-for="category in CATEGORIES"
                :key="category"
                color="neutral"
                :variant="categoryFilter === category ? 'solid' : 'ghost'"
                :class="categoryFilter === category ? '' : 'bg-elevated shadow-xs hover:bg-muted'"
                class="min-h-10 shrink-0 gap-1.5 rounded-full pl-1.5 pr-3.5 text-sm font-bold focus-visible:outline-2 focus-visible:outline-primary"
                :aria-pressed="categoryFilter === category"
                @click="categoryFilter = categoryFilter === category ? null : category"
            >
                <CategoryBadge :category="category" :size="28" />
                {{ t(`category.${category}`) }}
                <UIcon v-if="categoryFilter === category" name="i-lucide-check" class="size-4" aria-hidden="true" />
            </UButton>
        </div>
        <p role="status" class="sr-only">{{ t('costs.shown', shownCosts.length) }}</p>
    </section>
    <UCard v-if="costs.length > 0 && shownCosts.length === 0" variant="subtle" class="card w-full text-center">
        <UIcon name="i-lucide-filter-x" class="size-8" aria-hidden="true" />
        <h2>{{ t('costs.noMatchTitle') }}</h2>
        <p>{{ t('costs.noMatchText') }}</p>
        <UButton :label="t('costs.clearFilters')" class="pill mt-4" @click="clearFilters" />
    </UCard>
    <!-- Hidden, not removed: the page layout in main.css finds this container by its table. UTable does not take v-show itself. -->
    <div v-show="costs.length === 0 || shownCosts.length > 0" class="hidden sm:block">
        <p class="sr-only" role="status">{{ sortColumn ? t('costs.sortedBy',{ column: t(`costs.columns.${sortColumn}`), order: t(`costs.${sortOrder}`) } ) : '' }}</p>
        <UTable v-model:sorting="sorting" :data="shownCosts" :columns="columns" class="card" :ui="{ root: 'overflow-x-auto px-5 pb-2 pt-1', th: 'px-2 pb-2.5 pt-3.5 text-[13px] font-extrabold uppercase tracking-wide text-muted', td: 'px-2 py-2.5 text-sm text-default' }">
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
                <UButton :data-row="`${row.original.kind}-${row.original.id}`" icon="i-lucide-trash-2" color="neutral" variant="ghost" class="pill-icon" @click="toDelete = row.original" :aria-label="t('costs.delete', { name: row.original.name })"/>
            </template>
        </UTable>
    </div>
    <CostGroups class="sm:hidden" :costs="shownCosts" :year="yearSummary.year" @edit="openEdit" @delete="toDelete = $event" />
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
