import { describe, it, expect } from 'vitest'
import { CATEGORIES } from '~~/shared/types/calculation'

// useKind has no i18n or component state, so it can be called directly.
const { kindIcon } = useKind()
const KINDS = ['recurring', 'purchase'] as const

describe('kindIcon', () => {
  it('has the repeat icon for recurring costs and the shopping bag for purchases', () => {
    expect(kindIcon('recurring')).toBe('i-lucide-repeat')
    expect(kindIcon('purchase')).toBe('i-lucide-shopping-bag')
  })
  it('gives each kind its own icon, different from every category icon', () => {
    const { categoryIcon } = useCategory()
    const categoryIcons = CATEGORIES.map(category => categoryIcon(category))
    const icons = KINDS.map(kind => kindIcon(kind))
    expect(new Set(icons).size).toBe(KINDS.length)
    for (const icon of icons) expect(categoryIcons).not.toContain(icon)
  })
})
