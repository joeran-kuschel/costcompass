<script setup lang="ts">
// `compact`: a round button with the language code that opens a small menu, for phones (#59).
// Without it: the select with a visible label, for the sidebar.
const props = defineProps<{ compact?: boolean }>()
const { t, locale, locales, setLocale } = useI18n()
const items = computed(() => locales.value.map(l => ({ label: l.name, value: l.code })))
const currentName = computed(() => items.value.find(item => item.value === locale.value)?.label ?? '')
const menuItems = computed(() => items.value.map(item => ({
    label: item.label,
    type: 'checkbox' as const,
    checked: item.value === locale.value,
    onSelect: () => setLocale(item.value),
})))
</script>
<template>
    <div v-if="props.compact">
        <UDropdownMenu :items="menuItems" :content="{ align: 'end' }">
            <UButton
                :label="locale.toUpperCase()"
                :aria-label="t('language.current', { language: currentName })"
                color="neutral"
                variant="ghost"
                class="language-compact"
            />
        </UDropdownMenu>
    </div>
    <UFormField v-else :label="t('language.label')">
        <USelect :ui="{ base: 'min-h-12 rounded-[1rem] font-semibold bg-muted ring-transparent dark:bg-accented dark:ring-accented' }"
            :model-value="locale"
            :items="items"
            @update:model-value="setLocale"
        />
    </UFormField>
</template>
