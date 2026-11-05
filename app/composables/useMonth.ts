import type { Stored, RecurringCost, Purchase } from '~~/shared/types/calculation'
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
