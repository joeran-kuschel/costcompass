import type { Cost, MonthRef, Stored } from '~~/shared/types/calculation'

export function useCostDialog() {
    const open = useState('costDialogOpen', () => false)
    const cost = useState<Stored<Cost> | null>('costDialogCost', () => null)
    const month = useState<MonthRef | null>('costDialogMonth', () => null)

    function openAdd(forMonth: MonthRef | null = null) {
        cost.value = null,
        month.value = forMonth,
        open.value = true
    }
    function openEdit(toEdit: Stored<Cost>) {
        cost.value = toEdit,
        month.value = null,
        open.value = true
    }
    function close() {
        cost.value = null,
        month.value = null,
        open.value = false
    }

    return { open, cost, month, openAdd, openEdit, close }
}
