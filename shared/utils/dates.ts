import type { MonthRef } from '~~/shared/types/calculation'

export function monthDateRange({ year, month }: MonthRef): { first: string, last: string } {
    const pad = (value: number) => String(value).padStart(2, '0')
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
    return { first: `${year}-${pad(month)}-01`, last: `${year}-${pad(month)}-${pad(lastDay)}` }
}
