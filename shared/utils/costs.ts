export function totalAnnualCost(items: CostItem[]): number {
    var total = 0
    items.forEach((item) => {
        if (item.interval === 'monthly') {
            total += item.amount*12
        } else {
            total += item.amount
        }
    })
    return total;
}
