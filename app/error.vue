<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const { t } = useI18n()
const { currentYear, currentMonth } = useYear()
const { monthYear, monthPath } = useMonth()
useAppHead()
const notFound = computed(() => props.error.status === 404)
const monthMissing = computed(() => (props.error.data as { reason?: string } | undefined)?.reason === 'month')
const variant = computed(() => {
    if (monthMissing.value) return 'month'
    if (notFound.value) return 'notFound'
    return 'generic'
})
const title = computed(() => t(`error.${variant.value}Title`))
const text = computed(() => t(`error.${variant.value}Text`))

useHead({ title: () => title.value })
function back() {
    clearError({ redirect: '/' })
}
</script>
<template>
    <UApp>
        <NuxtRouteAnnouncer />
        <NuxtLayout>
            <UCard variant="subtle" class="card mt-6 text-center">
                <UIcon :name="notFound ? 'i-lucide-search-x' : 'i-lucide-triangle-alert'" class="size-8" aria-hidden="true" />
                <h1>{{ title }}</h1>
                <p>{{ text }}</p>
                <UButton :label="t('error.back')" class="pill mt-4" @click="back" />
                <UButton v-if="monthMissing" :to="monthPath(currentYear, currentMonth)" :label="t('error.goToMonth', { month: monthYear(currentYear, currentMonth) })" class="pill" />
            </UCard>
        </NuxtLayout>
    </UApp>
</template>
