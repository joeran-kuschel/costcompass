<script lang="ts" setup>
defineProps<{ householdTotal: string, businessTotal: string }>()
const { t } = useI18n()
</script>
<template>
    <ul class="flex flex-col gap-3">
        <li class="flex items-center gap-2.5">
            <UIcon name="i-lucide-house" class="size-5 shrink-0 text-primary" aria-hidden="true" />
            <span class="flex-1 font-bold">{{ t('dashboard.split.household') }}</span>
            <span class="font-extrabold tabular-nums">{{ householdTotal }}</span>
        </li>
        <li class="flex items-center gap-2.5">
            <UIcon name="i-lucide-briefcase" class="size-5 shrink-0 text-secondary" aria-hidden="true" />
            <span class="flex-1 font-bold">{{ t('business.label') }}</span>
            <span class="font-extrabold tabular-nums">{{ businessTotal }}</span>
        </li>
    </ul>
</template>
