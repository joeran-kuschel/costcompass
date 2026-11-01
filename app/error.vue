<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const { t } = useI18n()
useAppHead()
const notFound = computed(() => props.error.status === 404)
const title = computed(() => t(notFound.value ? 'error.notFoundTitle' : 'error.genericTitle'))
const text = computed(() => t(notFound.value ? 'error.notFoundText' : 'error.genericText'))

useHead({ title: () => title.value })
function back() {
    clearError({ redirect: '/' })
}
</script>
<template>
    <UApp>
        <NuxtRouteAnnouncer />
        <NuxtLayout>
            <UCard variant="subtle" class="mt-6 text-center">
                <UIcon :name="notFound ? 'i-lucide-search-x' : 'i-lucide-triangle-alert'" class="size-8" aria-hidden="true" />
                <h1>{{ title }}</h1>
                <p>{{ text }}</p>
                <UButton :label="t('error.back')" class="mt-4" @click="back" />
            </UCard>
        </NuxtLayout>
    </UApp>
</template>
