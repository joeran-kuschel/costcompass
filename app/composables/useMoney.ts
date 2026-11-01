export function useMoney(options: { cents?: boolean } = {}) {
    const { n } = useI18n()
    const digits = options.cents ? 2 : 0
    return (value: number) => n(value, { style: 'currency', currency: 'EUR', minimumFractionDigits: digits, maximumFractionDigits: digits })
}
