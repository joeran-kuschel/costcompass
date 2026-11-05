export function useMoney(options: { cents?: boolean } = {}) {
    const { n } = useI18n()
    const digits = options.cents ? 2 : 0
    return (value: number) => n(value, { style: 'currency', currency: 'EUR', minimumFractionDigits: digits, maximumFractionDigits: digits })
}

// An amount with cents in three pieces, so the cents can be styled on their own: "€2,081" ".00" "" in English, "2.081" ",00" " €" in German.
export function useMoneyParts() {
    const { locale } = useI18n()
    return (value: number) => {
        const parts = new Intl.NumberFormat(locale.value, { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).formatToParts(value)
        const start = parts.findIndex(part => part.type === 'decimal')
        const end = parts.findIndex(part => part.type === 'fraction') + 1
        const join = (list: Intl.NumberFormatPart[]) => list.map(part => part.value).join('')
        return { whole: join(parts.slice(0, start)), cents: join(parts.slice(start, end)), after: join(parts.slice(end)) }
    }
}
