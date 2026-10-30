<script lang="ts" setup>
import type { FormSubmitEvent } from '@nuxt/ui'
import type { CreatePurchase, CreateRecurringCost } from '~~/shared/utils/validation'

const { t, locale } = useI18n()
const kindItems = computed(() => [
    { label: t('kind.recurring'), value: 'recurring' },
    { label: t('kind.purchase'), value: 'purchase' },
])
const kind = ref<'recurring' | 'purchase'>('purchase')
const state = reactive({
    name: '',
    amount: undefined as number | undefined,
    category: undefined as Category | undefined,
    business: false,
    interval: 'monthly' as Interval,
    dueMonth: undefined as Month | undefined,
    date: ''
})
const schema = computed(() => kind.value === 'recurring' ? createRecurringCostSchema : createPurchaseSchema)
const categoryItems = computed(() => CATEGORIES.map(c => ({label: t(`category.${c}`), value: c})))
const intervalItems = computed(() => INTERVALS.map(i => ({ label: t(`interval.${i}`), value: i })))
const monthItems = computed(() => MONTHS.map(m => ({
    label: new Intl.DateTimeFormat(locale.value, { month: 'long', timeZone: 'UTC' })
        .format(new Date(Date.UTC(2000, m - 1, 1))),
    value: m,
})))
const emit = defineEmits<{ saved: [] }>()
const toast = useToast()
async function onSubmit(event: FormSubmitEvent<CreateRecurringCost | CreatePurchase>) {
    const url = kind.value === 'recurring' ? '/api/recurring-costs' : '/api/purchases'
    try {
        await $fetch(url, { method: 'POST', body: event.data })
        emit('saved')
    } catch {
        toast.add({ title: t('form.error'), color: 'error'})
    }
}
</script>
<template>
    <UForm :schema="schema" :state="state" @submit="onSubmit">
        <UFormField :label="t('form.kind')">
            <URadioGroup v-model="kind" :items="kindItems" />
        </UFormField>
        <UFormField :label="t('form.name')" name="name">
            <UInput v-model="state.name" />
        </UFormField>
        <UFormField :label="t('form.amount')" name="amount">
            <UInput v-model="state.amount" type="number" step="0.01" />
        </UFormField>
        <UFormField :label="t('form.category')" name="category">
            <USelect v-model="state.category" :items="categoryItems" />
        </UFormField>
        <UFormField name="business">
            <UCheckbox v-model="state.business" :label="t('form.business')" />
        </UFormField>
        <UFormField v-if="kind === 'purchase'" :label="t('form.date')" name="date">
            <UInput v-model="state.date" type="date" />
        </UFormField>
        <UFormField v-if="kind === 'recurring'" :label="t('form.interval')" name="interval">
            <USelect v-model="state.interval" :items="intervalItems" />
        </UFormField>
        <UFormField v-if="kind === 'recurring' && state.interval !== 'monthly'" :label="t('form.dueMonth')" name="dueMonth">
            <USelect v-model="state.dueMonth" :items="monthItems" />
        </UFormField>
        <UButton type="submit">{{ t('form.submit') }}</UButton>
    </UForm>
</template>
