<script lang="ts" setup>
const route = useRoute()

const parsed = monthParamsSchema.safeParse(route.params)
if (!parsed.success) {
    throw createError({ status: 404, fatal: true, data: { reason: 'month' }})
}
const { year, month } = parsed.data
const { t } = useI18n()
const { currentYear } = useYear()
const { recurring, purchases, failed, loading, retry } = useCostLists()
const { monthName, monthYear } = useMonth()
const title = computed(() => monthYear(year, month))

useHead({ title: () => title.value })

watch([loading, failed], () => {
    if (loading.value || failed.value) return
    if (!availableYears(purchases.value ?? [], currentYear.value).includes(year)) {
        showError(createError({ status: 404, fatal: true, data: { reason: 'month' } }))
    }
}, { immediate: true })

</script>
<template>
    <h1>{{ title }}</h1>
    <div :aria-busy="loading">
        <template v-if="loading">
            <p role="status" class="sr-only">{{ t('month.loading', { month: title }) }}</p>
            <USkeleton aria-hidden="true" role="presentation" class="mt-4 h-10 w-40 motion-reduce:animate-none" />
            <USkeleton aria-hidden="true" role="presentation" class="mt-4 h-32 w-full motion-reduce:animate-none" />
        </template>
        <UAlert
            v-else-if="failed"
            role="alert"
            color="error"
            :title="t('month.error', { month: monthName(month) })"
            :description="t('month.errorText')"
            :actions="[{ label: t('dashboard.retry'), onClick: retry }]"
        />
        <!-- the month's content comes with #25 -->
    </div>
</template>
