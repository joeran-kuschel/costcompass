export function useCostLists() {
    const { data: recurring, status: recurringStatus, error: recurringError, refresh: refreshRecurring }
        = useFetch<Stored<RecurringCost>[]>('/api/recurring-costs', { lazy: true })
    const { data: purchases, status: purchasesStatus, error: purchasesError, refresh: refreshPurchases }
        = useFetch<Stored<Purchase>[]>('/api/purchases', { lazy: true })
    const failed = computed(() => !!recurringError.value || !!purchasesError.value)
    const loading = computed(() => !failed.value && (!recurring.value || !purchases.value))

    async function retry() {
        await Promise.all([refreshRecurring(), refreshPurchases()])
    }

    return { recurring, purchases, failed, loading, retry }
}
