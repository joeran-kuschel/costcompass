<script lang="ts" setup>
import { totalAnnualRecurring, totalAnnualPurchases } from '~~/shared/utils/costs';
const props = defineProps<{ costs: Stored<Cost>[], year: number}>()
const emit = defineEmits<{ edit: [cost: Stored<Cost>], delete: [cost: Stored<Cost>] }>()

const { toRow } = useMonth()
const euros = useMoney()
const { t } = useI18n()
const { kindIcon } = useKind()
const root = useTemplateRef<HTMLElement>('root')

const recurring = computed(() => props.costs.filter((cost): cost is Stored<RecurringCost> => cost.kind === 'recurring'))
const purchases = computed(() => props.costs.filter((cost): cost is Stored<Purchase> => cost.kind === 'purchase'))
const recurringRows = computed(() => recurring.value.map(cost => ({ ...toRow(cost, 'long'), cost })))
const purchaseRows = computed(() => purchases.value.map(cost => ({ ...toRow(cost, 'long'), cost })))
const recurringTotal = computed(() => euros(totalAnnualRecurring(recurring.value)))
const purchasesTotal = computed(() => euros(totalAnnualPurchases(purchases.value, props.year)))

const sections = computed(() => [
    { id: 'recurring', title: `${t('month.recurring')} · ${recurringRows.value.length}`, total: recurringTotal.value, rows: recurringRows.value, kind: 'recurring' as const },
    { id: 'purchases', title: `${t('month.purchases')} · ${purchaseRows.value.length}`, total: purchasesTotal.value, rows: purchaseRows.value, kind: 'purchase' as const },
].filter(section => section.rows.length > 0))

// A chosen action waits until the menu has closed and then puts the focus back on the menu button
// itself (the menu leaves it on the removed item), so the dialog returns the focus there when it closes.
let pending: { key: string, run: () => void } | null = null
function actions(row: { key: string, cost: Stored<Cost> }) {
  return [
    { label: t('costs.actions.edit'), icon: 'i-lucide-pencil', onSelect: () => { pending = { key: row.key, run: () => emit('edit', row.cost) } } },
    { label: t('costs.actions.delete'), icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => { pending = { key: row.key, run: () => emit('delete', row.cost) } } },
  ]
}
function runPending() {
  if (!pending) return
  const { key, run } = pending
  pending = null
  root.value?.querySelector<HTMLElement>(`[data-row="${CSS.escape(key)}"]`)?.focus()
  run()
}
</script>
<template>
    <div ref="root">
        <section v-for="section in sections" :key="section.id" :aria-labelledby="`${section.id}-title`" class="card px-6 py-5">
            <div class="flex items-baseline justify-between gap-4">
                <h2 :id="`${section.id}-title`" class="flex items-center gap-2">
                    <UIcon :name="kindIcon(section.kind)" class="text-muted" aria-hidden="true" />
                    {{ section.title }}
                </h2>
                <p class="font-extrabold tabular-nums">{{ section.total }} <span class="sr-only">{{ section.kind === 'recurring' ? t('costs.per') : t('costs.in', { year: props.year }) }}</span></p>
            </div>
            <ul class="mt-3 flex flex-col gap-1.5">
                <!-- Below 400 px the amount moves under the name (column 2, row 2), so the name keeps its width. -->
                <li v-for="row in section.rows" :key="row.key" class="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-[18px] bg-muted px-3 py-2.5 min-[400px]:grid-cols-[40px_minmax(0,1fr)_auto_auto]">
                    <CategoryBadge :category="row.category" :size="40" class="max-[399px]:row-span-2" />
                    <div class="min-w-0 flex-1">
                        <p class="flex flex-wrap items-center gap-1.5 break-words font-bold">
                            {{ row.name }}
                            <BusinessBadge v-if="row.business" />
                        </p>
                        <p class="text-sm text-muted">{{ row.subline }}</p>
                    </div>
                    <p class="col-start-2 row-start-2 font-extrabold tabular-nums min-[400px]:col-start-auto min-[400px]:row-start-auto min-[400px]:text-right">{{ row.amount }}</p>
                    <UDropdownMenu
                        :items="actions(row)"
                        :content="{ align: 'end', onCloseAutoFocus: runPending }"
                        :ui="{ item: 'min-h-11 items-center' }"
                    >
                        <UButton :data-row="row.key" icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" class="size-11 justify-center focus-visible:outline-2 focus-visible:outline-primary"
                            :aria-label="t('costs.actions.label', { name: row.name })" />
                    </UDropdownMenu>
                </li>
            </ul>
        </section>
    </div>
</template>
