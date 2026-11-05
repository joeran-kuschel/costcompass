<script setup lang="ts">
const year = defineModel<number>({ required: true })
defineProps<{ years: number []}>()
const { t } = useI18n()
</script>
<template>
    <UFormField :label="t('year.label')" orientation="horizontal" :ui="{ root: 'items-center gap-2.5', wrapper: 'mb-0', label: 'text-sm font-semibold text-muted' }">
        <USelect :ui="{ base: 'min-h-11 rounded-full font-semibold bg-muted ring-transparent dark:bg-accented dark:ring-accented' }"
            v-model="year"
            :items="years"
        />
    </UFormField>
</template>
