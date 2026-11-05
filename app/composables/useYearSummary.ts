import { annualSummary } from "~~/shared/utils/costs"
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

