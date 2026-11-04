<script lang="ts" setup>
    const { t } = useI18n()
    const { items } = useNavItems()
</script>
<template>
    <div class="fixed inset-x-4 bottom-7 z-40 flex items-center gap-2.5 lg:hidden">
        <nav :aria-label="t('nav.label')" class="mobile-tabs">
            <NuxtLink v-for="item in items" :key="item.to" :to="item.to" class="mobile-tab">
                <UIcon :name="item.icon" class="size-5" />
                {{ item.shortLabel }}
            </NuxtLink>
        </nav>
    </div>
</template>
