<script setup lang="ts">
const { t, locale, locales, setLocale } = useI18n()
const items = computed(() => locales.value.map(l => ({ label: l.name, value: l.code })))
</script>
<template>
    <UFormField :label="t('language.label')">
        <USelect :ui="{ base: 'min-h-12 rounded-[1rem] font-semibold bg-muted ring-transparent dark:bg-accented dark:ring-accented' }"
            :model-value="locale"
            :items="items"
            @update:model-value="setLocale"
        />
    </UFormField>
</template>
