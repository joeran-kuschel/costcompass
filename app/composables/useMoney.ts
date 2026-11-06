/**
 * A formatter for euro amounts in the current language.
 *
 * @remarks
 * Whole euros are the default (the dashboard); amounts are rounded, not cut, so 1,200.50 shows as
 * €1,201. German puts the sign last with a non-breaking space before it ("1.201 €").
 *
 * @param options - `cents: true` always shows two decimals (lists, month totals).
 * @returns A function from euros to the formatted string.
 */
export function useMoney(options: { cents?: boolean } = {}) {
    const { n } = useI18n()
    const digits = options.cents ? 2 : 0
    return (value: number) => n(value, { style: 'currency', currency: 'EUR', minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/**
 * A formatter for euro amounts with cents in three pieces, so the cents can be styled on their own.
 *
 * @returns A function from euros to `{ whole, cents, after }`; `after` holds the currency sign
 * where the language puts it last.
 *
 * @example
 * ```ts
 * moneyParts(2081) // en: { whole: '€2,081', cents: '.00', after: '' }
 *                  // de: { whole: '2.081', cents: ',00', after: ' €' }
 * ```
 */
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
