<script setup lang="ts">
const { t } = useI18n()
const year = defineModel<number>({ required: true })
defineProps<{ years: number []}>()
</script>
<template>
    <UFormField :label="t('year.label')">
        <USelect
            v-model="year"
            :items="years"
        />
    </UFormField>
</template>
