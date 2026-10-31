export function useMoney() {
    const { n } = useI18n()
    return (value: number) => n(value, { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
