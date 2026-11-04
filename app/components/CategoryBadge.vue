<script lang="ts" setup>
import type { Category } from '~~/shared/types/calculation'
defineProps<{ category: Category, size: CategorySize }>()
const { categoryIcon, categoryClass, categoryStyle } = useCategory()
</script>
<template>
    <span
        :class="['category-disc', categoryClass(category)]"
        :style="categoryStyle(size)"
        aria-hidden="true"
    >
        <UIcon :name="categoryIcon(category)" />
    </span>
</template>
