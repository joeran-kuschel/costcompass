export type Interval = 'monthly' | 'yearly';
export type CostItem = {
    name: string;
    amount: number;
    interval: Interval;
}
