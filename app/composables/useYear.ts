/**
 * Today's year and month, and the year selected on the dashboard and the costs page.
 *
 * @remarks
 * Today is read once per app load, in UTC, and then kept in state, so every page agrees on it
 * even across midnight. On the first visit the server reads the date and the client reuses it.
 * Month pages take their year from the URL and ignore `year`.
 *
 * @returns `year` is writable and starts at the current year; `currentYear` and `currentMonth` (1-12) are read-only.
 */
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
