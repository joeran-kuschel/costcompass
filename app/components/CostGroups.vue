<script lang="ts" setup>
import { totalAnnualRecurring, totalAnnualPurchases } from '~~/shared/utils/costs';
const props = defineProps<{ costs: Stored<Cost>[], year: number}>()
const emit = defineEmits<{ edit: [cost: Stored<Cost>], delete: [cost: Stored<Cost>] }>()

const { toRow } = useMonth()
const euros = useMoney()
const { t } = useI18n()
const { kindIcon } = useKind()

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
</script>
<template>
    <div>
        <section v-for="section in sections" :key="section.id" :aria-labelledby="`${section.id}-title`" class="card px-6 py-5">
            <div class="flex items-baseline justify-between gap-4">
                <h2 :id="`${section.id}-title`" class="flex items-center gap-2">
                    <UIcon :name="kindIcon(section.kind)" class="text-muted" aria-hidden="true" />
                    {{ section.title }}
                </h2>
                <p class="font-extrabold tabular-nums">{{ section.total }}</p>
            </div>
            <ul class="mt-3 flex flex-col gap-1.5">
                <li v-for="row in section.rows" :key="row.key" class="flex items-center gap-3 rounded-[18px] bg-muted px-3 py-2.5">
                    <CategoryBadge :category="row.category" :size="40" />
                    <div class="min-w-0 flex-1">
                        <p class="flex flex-wrap items-center gap-1.5 break-words font-bold">
                            {{ row.name }}
                            <BusinessBadge v-if="row.business" />
                        </p>
                        <p class="text-sm text-muted">{{ row.subline }}</p>
                    </div>
                    <p class="shrink-0 text-right font-extrabold tabular-nums">{{ row.amount }}</p>
                </li>
            </ul>
        </section>
    </div>
</template>
