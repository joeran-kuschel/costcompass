export function useYear() {
    const currentYear = useState('currentYear', () => new Date().getUTCFullYear())
    const year = useState('year', () => currentYear.value)
    return { year, currentYear }
}
