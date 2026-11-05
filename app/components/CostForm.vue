<script lang="ts" setup>
import type { FormSubmitEvent } from '@nuxt/ui'
import type { CreatePurchase, CreateRecurringCost } from '~~/shared/utils/validation'
import { monthDateRange } from '~~/shared/utils/dates'

const props = defineProps<{
    cost?: Stored<Cost> | null,
    month?: MonthRef | null
}>()
const emit = defineEmits<{ saved: [], cancel: [] }>()
const { t, locale } = useI18n()
const { monthYear } = useMonth()
const toast = useToast()
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
const kindItems = computed(() => [
    { label: t('kind.recurring'), value: 'recurring' },
    { label: t('kind.purchase'), value: 'purchase' },
])
const schema = computed(() => kind.value === 'recurring' ? createRecurringCostSchema : createPurchaseSchema)
const categoryItems = computed(() => CATEGORIES.map(c => ({label: t(`category.${c}`), value: c})))
const intervalItems = computed(() => INTERVALS.map(i => ({ label: t(`interval.${i}`), value: i })))
const monthItems = computed(() => MONTHS.map(m => ({
    label: new Intl.DateTimeFormat(locale.value, { month: 'long', timeZone: 'UTC' })
        .format(new Date(Date.UTC(2000, m - 1, 1))),
    value: m,
})))
const range = computed(() => props.month ? monthDateRange(props.month) : null)

if (props.cost) {
    kind.value = props.cost.kind
    Object.assign(state, props.cost)
} else if (props.month) {
    state.date = monthDateRange(props.month).first
    state.dueMonth = props.month.month as Month
}

async function onSubmit(event: FormSubmitEvent<CreateRecurringCost | CreatePurchase>) {
    const base = kind.value === 'recurring' ? '/api/recurring-costs' : '/api/purchases'
    try {
        if (props.cost) {
            await $fetch(`${base}/${props.cost.id}`, { method: 'PATCH', body: event.data })
        } else {
            await $fetch(base, { method: 'POST', body: event.data })
        }
        emit('saved')
    } catch {
        toast.add({ title: t('form.error'), color: 'error'})
    }
}
</script>
<template>
    <UForm :schema="schema" :state="state" class="grid grid-cols-[auto_auto_1fr] gap-x-3 gap-y-[18px] [&>[data-slot=root]]:col-span-full" @submit="onSubmit">
        <UFormField :label="t('form.kind')">
            <URadioGroup :disabled="!!cost" v-model="kind" :items="kindItems" />
        </UFormField>
        <UFormField :label="t('form.name')" name="name">
            <UInput class="w-full" :ui="{ base: 'min-h-12 rounded-[1rem] font-semibold bg-muted ring-transparent dark:bg-accented dark:ring-accented' }" v-model="state.name" />
        </UFormField>
        <UFormField :label="t('form.amount')" name="amount">
            <UInput class="w-full" :ui="{ base: 'min-h-12 rounded-[1rem] font-semibold bg-muted ring-transparent dark:bg-accented dark:ring-accented' }" v-model="state.amount" type="number" step="0.01" />
        </UFormField>
        <UFormField :label="t('form.category')" name="category">
            <USelect class="w-full" :ui="{ base: 'min-h-12 rounded-[1rem] font-semibold bg-muted ring-transparent dark:bg-accented dark:ring-accented' }" v-model="state.category" :items="categoryItems" />
        </UFormField>
        <UFormField name="business">
            <UCheckbox v-model="state.business" :label="t('form.business')" />
        </UFormField>
        <UFormField v-if="kind === 'purchase'" :label="t('form.date')" name="date" :hint="month ? t('form.dateHint', { month: monthYear(month.year, month.month) }) : undefined">
            <UInput class="w-full" :ui="{ base: 'min-h-12 rounded-[1rem] font-semibold bg-muted ring-transparent dark:bg-accented dark:ring-accented' }" v-model="state.date" type="date" :min="range?.first" :max="range?.last" />
        </UFormField>
        <UFormField v-if="kind === 'recurring'" :label="t('form.interval')" name="interval">
            <USelect class="w-full" :ui="{ base: 'min-h-12 rounded-[1rem] font-semibold bg-muted ring-transparent dark:bg-accented dark:ring-accented' }" v-model="state.interval" :items="intervalItems" />
        </UFormField>
        <UFormField v-if="kind === 'recurring' && state.interval !== 'monthly'" :label="t('form.dueMonth')" name="dueMonth">
            <USelect class="w-full" :ui="{ base: 'min-h-12 rounded-[1rem] font-semibold bg-muted ring-transparent dark:bg-accented dark:ring-accented' }" v-model="state.dueMonth" :items="monthItems" />
        </UFormField>
        <UButton type="submit" class="pill">{{ cost ? t('common.save') : t('form.submit') }}</UButton>
        <UButton color="neutral" variant="outline" :label="t('common.cancel')" class="pill" @click="emit('cancel')" />
    </UForm>
</template>
