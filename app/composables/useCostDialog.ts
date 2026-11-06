import type { Cost, MonthRef, Stored } from '~~/shared/types/calculation'

/**
 * The state of the one add and edit dialog, which `layouts/default.vue` renders for all pages.
 *
 * @remarks
 * The state is global (`useState`), so any page or the sidebar can open the dialog.
 *
 * @returns `open`, the `cost` being edited (null when adding) and the `month` to pre-fill a
 * purchase date with (null when there is none); `openAdd(forMonth?)` opens an empty form,
 * `openEdit(cost)` a filled one, and `close()` resets all three.
 */
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
