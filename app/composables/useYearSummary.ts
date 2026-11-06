import { annualSummary } from "~~/shared/utils/costs"
/**
 * The year the dashboard and the costs page show, with its totals and the counts of all costs.
 *
 * @remarks
 * Year fallback (#30): when the selected `year` has no purchases and is not the current year, the
 * current year is shown instead, so a stale selection never shows an empty year. While the lists
 * are loading, everything is computed from empty lists.
 *
 * @returns A computed with `year` (the shown year, not always the selected one), `years` (from
 * `availableYears`, newest first), the `annualSummary` fields in euros as numbers, and
 * `recurringCount` and `purchasesCount`, which count all stored costs, not only those of the year.
 */
export function useYearSummary() {
    const { year, currentYear } = useYear()
    const { recurring, purchases } = useCostLists()

    return computed(() => {
        const years = availableYears(purchases.value ?? [], currentYear.value)
        const shownYear = years.includes(year.value) ? year.value : currentYear.value
        return {
            year: shownYear,
            years,
            ...annualSummary(recurring.value ?? [], purchases.value ?? [], shownYear),
            recurringCount: recurring.value?.length ?? 0,
            purchasesCount: purchases.value?.length ?? 0
        }
    })
}

