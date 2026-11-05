import { monthSummary } from "~~/shared/utils/costs"
export function useMonthSummary() {
    const route = useRoute()
    const { t } = useI18n()
    const { currentYear, currentMonth } = useYear()
    const { recurring, purchases } = useCostLists()
    const { toRow, monthName } = useMonth()
    const cents = useMoney({ cents: true })

    const monthRef = computed(() => {
        const parsed = monthParamsSchema.safeParse(route.params)
        return parsed.success
            ? { year: parsed.data.year, month: parsed.data.month as Month }
            : { year: currentYear.value, month: currentMonth.value }
    })

    return computed(() => {
        const { year, month } = monthRef.value
        const summary = monthSummary(recurring.value ?? [], purchases.value ?? [], year, month)
        const percent = summary.change.percent
        const direction = percent === null ? 'none' : percent < 0 ? 'less' : percent > 0 ? 'more' : 'same'
        return {
            year, month,
            total: summary.groups.total,
            percent: percent,
            direction,
            recurringTotal: summary.groups.recurringTotal,
            purchasesTotal: summary.groups.purchasesTotal,
            empty: summary.empty,
            recurringRows: summary.groups.recurring.map(cost => toRow(cost, 'long')),
            purchaseRows: summary.groups.purchases.map(cost => toRow(cost, 'long')),
            largestRows: summary.largest.map(cost => toRow(cost)),
            comparison: t(`dashboard.thisMonth.${direction}`, {
                percent: Math.abs(percent ?? 0),
                previous: monthName(month === 1 ? 12 : month - 1),
            }),
            comparisonShort: t(`month.changeShort.${direction}`, { percent: Math.abs(percent ?? 0)}),
            icon: { less: 'i-lucide-trending-down', more: 'i-lucide-trending-up', same: 'i-lucide-minus', none: 'i-lucide-minus' }[direction],
            count: summary.count,
            businessCount: summary.businessCount,
            categoryRows: summary.categories.map(({ category, total }) => ({
                category,
                label: t(`category.${category}`),
                amount: cents(total)
            })),
            householdTotal: cents(summary.householdTotal),
            businessTotal: cents(summary.businessTotal),
        }
    })
}

