import type { Stored, RecurringCost, Purchase } from '~~/shared/types/calculation'
/**
 * Month and date formatting in the current language, and the list row of a cost.
 *
 * @remarks
 * Every date is formatted in UTC, like the core reads it, so a purchase on the 1st never shows as
 * the last day of the month before.
 *
 * @returns
 * - `monthName(month, style?)`: "March" or "Mar"; `month` is 1-12.
 * - `monthYear(year, month)`: "March 2026".
 * - `monthPath(year, month)`: the month page URL with a two-digit month, `/months/2026/03`.
 * - `formatDate(date, form?)`: day and month without the year: "Mar 14" or "March 14", in German "14. März".
 * - `toRow(cost, form?)`: name, category subline, formatted amount with cents and a `key` unique
 *   across both lists (`recurring-1`, `purchase-1`). The `'long'` form adds the due month to yearly costs.
 */
export function useMonth() {
    const { t, locale } = useI18n()
    const euros = useMoney({ cents: true })
    const monthName = (month: number, style: 'long' | 'short' = 'long' ) => new Intl.DateTimeFormat(locale.value, { month: style, timeZone: 'UTC'}).format(new Date((Date.UTC(2000, month - 1, 1))))
    const monthYear = (year: number, month: number) => new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)))
    const monthPath = (year: number, month: number) => `/months/${year}/${String(month).padStart(2, '0')}`
    const formatDate = (date: string, form: 'short' | 'long' = 'short') => new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: form === 'long' ? 'long' : 'short', timeZone: 'UTC'}).format(new Date(date))

    function toRow(cost: Stored<RecurringCost> | Stored<Purchase>, form: 'short' | 'long' = 'short') {
        const detail = cost.kind === 'purchase'
            ? formatDate(cost.date, form)
            : form === 'long' && cost.interval === 'yearly' && cost.dueMonth
            ? t('interval.yearlyIn', { month: monthName(cost.dueMonth) })
            : t(`interval.${cost.interval}`)
        return {
            key: `${cost.kind}-${cost.id}`,
            name: cost.name,
            subline: `${t(`category.${cost.category}`)} · ${detail}`,
            business: cost.business,
            amount: euros(cost.amount),
            category: cost.category
        }
    }
    return { monthName, monthYear, monthPath, toRow, formatDate}
}
