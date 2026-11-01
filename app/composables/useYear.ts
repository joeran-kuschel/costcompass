export function useYear() {
    const today = useState('today', () => {
        const now = new Date()
        return { year: now.getUTCFullYear(), month: (now.getUTCMonth() + 1) as Month }
    })
    const currentYear = computed(() => today.value.year)
    const currentMonth = computed(() => today.value.month)
    const year = useState('year', () => today.value.year)
    return { year, currentYear, currentMonth }
}
