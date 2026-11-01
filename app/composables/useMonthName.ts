export function useMonthName() {
    const { locale } = useI18n()
    const monthName = (month: number, style: 'long' | 'short' = 'long' ) => new Intl.DateTimeFormat(locale.value, { month: style, timeZone: 'UTC'}).format(new Date((Date.UTC(2000, month - 1, 1))))
    const monthYear = (year: number, month: number) => new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)))
    return { monthName, monthYear}
}
