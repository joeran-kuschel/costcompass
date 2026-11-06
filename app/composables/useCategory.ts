import type { Category } from "~~/shared/types/calculation"

/** The badge sizes in px that `CategoryBadge` accepts. */
export const CATEGORY_SIZES = [28, 32, 36, 40, 44, 56] as const
export type CategorySize = (typeof CATEGORY_SIZES)[number]

const CATEGORY_ICONS: Record<Category, string> = {
    housing: 'i-lucide-house',
    insurance: 'i-lucide-shield-check',
    appliances: 'i-lucide-washing-machine',
    food: 'i-lucide-shopping-basket',
    mobility: 'i-lucide-car'
}
const CATEGORY_CLASSES: Record<Category, string> = {
    housing: 'bg-[var(--category-housing)]',
    insurance: 'bg-[var(--category-insurance)]',
    appliances: 'bg-[var(--category-appliances)]',
    food: 'bg-[var(--category-food)]',
    mobility: 'bg-[var(--category-mobility)]'
}
/**
 * The icon, colour and size of a category badge.
 *
 * @returns `categoryIcon(category)` the Lucide icon name; `categoryClass(category)` the background
 * class, which reads the `--category-*` colour from `main.css` (light and dark); `categoryStyle(size)`
 * sets `--category-size` for the badge.
 */
export function useCategory() {
    const categoryIcon = (category: Category) => CATEGORY_ICONS[category]
    const categoryClass = (category: Category) => CATEGORY_CLASSES[category]
    const categoryStyle = (size: CategorySize) => ({ '--category-size': `${size}px` })
    return {
        categoryIcon, categoryClass, categoryStyle
    }
}
