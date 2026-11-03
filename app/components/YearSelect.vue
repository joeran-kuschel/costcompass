<script setup lang="ts">
const { t } = useI18n()
const year = defineModel<number>({ required: true })
defineProps<{ years: number []}>()
</script>
<template>
    <UFormField :label="t('year.label')">
        <USelect :ui="{ base: 'min-h-12 rounded-[1rem] font-semibold bg-muted ring-transparent dark:bg-accented dark:ring-accented' }"
            v-model="year"
            :items="years"
        />
    </UFormField>
</template>
