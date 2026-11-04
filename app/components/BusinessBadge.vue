<script lang="ts" setup>
    const { t } = useI18n()
</script>

<template>
    <UBadge :label="t('business.label')" icon="i-lucide-briefcase" color="secondary" class="business-badge" :ui="{ base: 'font-bold', leadingIcon: 'size-3.5'} " variant="soft"/>
</template>
