import { describe, it, expect } from 'vitest'
import { CATEGORIES } from '~~/shared/types/calculation'

// useCategory has no i18n or component state, so it can be called directly.
const { categoryIcon, categoryClass, categoryStyle } = useCategory()

describe('categoryIcon', () => {
  it('has a Lucide icon for every category, so a new category without one fails here', () => {
    for (const category of CATEGORIES) {
      expect(categoryIcon(category), category).toMatch(/^i-lucide-[a-z-]+$/)
    }
  })
  it('gives every category its own icon', () => {
    const icons = CATEGORIES.map(category => categoryIcon(category))
    expect(new Set(icons).size).toBe(CATEGORIES.length)
  })
})

describe('categoryClass', () => {
  it('fills the disc with the colour token of the category', () => {
    for (const category of CATEGORIES) {
      expect(categoryClass(category), category).toBe(`bg-[var(--category-${category})]`)
    }
  })
})

describe('categoryStyle', () => {
  it('sets the size as a CSS variable in pixels', () => {
    expect(categoryStyle(40)).toEqual({ '--category-size': '40px' })
  })
  it('works for every size the design uses', () => {
    for (const size of CATEGORY_SIZES) {
      expect(categoryStyle(size)).toEqual({ '--category-size': `${size}px` })
    }
  })
})
