import { pgEnum, pgTable, serial, text, numeric, boolean, date, integer } from 'drizzle-orm/pg-core'
import { CATEGORIES, INTERVALS } from '../../shared/types/calculation'

export const categoryEnum = pgEnum('category', CATEGORIES)
export const intervalEnum = pgEnum('recurring_interval', INTERVALS)

export const recurringCosts = pgTable('recurring_costs', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    amount: numeric('amount', { precision: 10, scale: 2, mode: 'number' }).notNull(),
    category: categoryEnum('category').notNull(),
    business: boolean('business').notNull().default(false),
    interval: intervalEnum('interval').notNull(),
    dueMonth: integer('due_month')
})
export const purchases = pgTable('purchases', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    amount: numeric('amount', { precision: 10, scale: 2, mode: 'number' }).notNull(),
    category: categoryEnum('category').notNull(),
    business: boolean('business').notNull().default(false),
    date: date('date', { mode: 'string' }).notNull(),
})
