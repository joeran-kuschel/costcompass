/**
 * All recurring costs and purchases from the API, shared by every page.
 *
 * @remarks
 * `useFetch` keys the requests by URL, so every caller gets the same data and only one request per
 * list is sent. `lazy` lets a page render at once and show its loading state.
 *
 * @returns `recurring` and `purchases` (null until loaded); `loading` until both lists are there;
 * `failed` when either request failed; `retry()` fetches both lists again, also after a save or a delete.
 */
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
