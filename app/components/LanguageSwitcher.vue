<script setup lang="ts">
const { t, locale, locales, setLocale } = useI18n()
const items = computed(() => locales.value.map(l => ({ label: l.name, value: l.code })))
</script>
<template>
    <USelect
        :model-value="locale"
        :items="items"
        :aria-label="t('language.label')"
        @update:model-value="setLocale"
    />
</template>
