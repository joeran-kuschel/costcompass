<script lang="ts" setup>
import type { Category } from '~~/shared/types/calculation'
defineProps<{ rows: { category: Category, label: string, amount: string, percent?: string }[] }>()
</script>
<template>
    <ul class="grid grid-cols-[repeat(auto-fill,minmax(13.75rem,1fr))] gap-x-6 gap-y-1.5">
        <li v-for="row in rows" :key="row.category" class="flex items-center gap-3 py-2">
            <CategoryBadge :category="row.category" :size="36" />
            <span class="min-w-0 flex-1 break-words font-bold">{{ row.label }}</span>
            <span class="shrink-0 text-right tabular-nums">
                <b class="block font-extrabold">{{ row.amount }}</b>
                <span v-if="row.percent" class="text-xs text-muted">{{ row.percent }}</span>
            </span>
        </li>
    </ul>
</template>
