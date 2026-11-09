<script lang="ts" setup>
import { INTERVALS } from '~~/shared/types/calculation'
import type { Form, FormSubmitEvent, FormErrorEvent } from '@nuxt/ui'
import type { CreatePurchase, CreateRecurringCost } from '~~/shared/utils/validation'
import { monthDateRange } from '~~/shared/utils/dates'

const props = defineProps<{
    cost?: Stored<Cost> | null,
    month?: MonthRef | null
}>()
const emit = defineEmits<{ saved: [], cancel: [] }>()
const { t, locale } = useI18n()
const { monthYear } = useMonth()
const { currentMonth } = useYear()
const { kindIcon } = useKind()
const form = useTemplateRef<Form<typeof createPurchaseSchema>>('form')
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
const saveFailed = ref(false)

const kindItems = computed(() => [
    { label: t('kind.recurring'), value: 'recurring', icon: kindIcon('recurring') },
    { label: t('kind.purchase'), value: 'purchase', icon: kindIcon('purchase') },
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
// UFormField hides its help text whenever an error slot exists, so the due month gets its slot only while it is invalid.
const dueMonthInvalid = computed(() => !!form.value?.getErrors('dueMonth').length)
const repeatText = computed(() => {
    if (state.interval === 'monthly' || !state.dueMonth) return undefined
    const due = state.dueMonth
    const months = state.interval === 'quarterly' ? [0, 3, 6, 9].map(k => (due - 1 + k) % 12 + 1).sort((a, b) => a - b) : [due]
    const names = months.map(m => monthItems.value[m - 1]!.label)
    return t(`form.repeats.${state.interval}`, { months: new Intl.ListFormat(locale.value).format(names) })
})

watch(() => state.interval, (interval) => {
    if (interval !== 'monthly' && state.dueMonth === undefined) state.dueMonth = currentMonth.value
})
if (props.cost) {
    kind.value = props.cost.kind
    Object.assign(state, props.cost)
} else if (props.month) {
    state.date = monthDateRange(props.month).first
    state.dueMonth = props.month.month as Month
}

async function onSubmit(event: FormSubmitEvent<CreateRecurringCost | CreatePurchase>) {
    const base = kind.value === 'recurring' ? '/api/recurring-costs' : '/api/purchases'
    saveFailed.value = false
    try {
        if (props.cost) {
            await $fetch(`${base}/${props.cost.id}`, { method: 'PATCH', body: event.data })
        } else {
            await $fetch(base, { method: 'POST', body: event.data })
        }
        emit('saved')
    } catch {
        saveFailed.value = true
    }
}
async function onError(event: FormErrorEvent) {
    const id = event.errors[0]?.id
    if (id) setTimeout(() => document.getElementById(id)?.focus())
}
</script>
<template>
    <UForm ref="form" novalidate :validate-on="['input', 'change']" :schema="schema" :state="state" class="grid grid-cols-[auto_auto_1fr] gap-x-3 gap-y-[18px] [&>[data-slot=root]]:col-span-full" @submit="onSubmit" @error="onError">
        <UAlert v-if="saveFailed === true"
            color="error"
            variant="soft"
            role="alert"
            :title="t('form.notSaved.title')"
            :description="t('form.notSaved.description')"
            icon="i-lucide-circle-alert"
            :ui="{
                root: 'items-start gap-2.5 rounded-[18px] px-3.5 py-3 bg-[#FEF3F2] text-[#7A271A] dark:bg-[#3A1717] dark:text-[#FECACA]',
                icon: 'mt-px text-error',
                title: 'text-sm font-extrabold',
                description: 'text-sm opacity-100'
            }"
        />
        <UFormField required :label="t('form.amount')" :ui="{ labelWrapper: 'justify-center', error: 'mt-1.5 flex items-center justify-center gap-1.5 text-[13px] font-bold' }" name="amount">
            <div class="flex items-baseline justify-center gap-1">
                <span class="text-[28px] font-extrabold text-muted" aria-hidden="true">€</span>
                <UInputNumber required
                    v-model="state.amount" :increment="false" :decrement="false" :step="0.01" :locale="locale"
                    :format-options="{ useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 }"
                    variant="none" class="w-auto max-w-full min-w-0"
                    :ui="{ base: 'min-w-[2ch] field-sizing-content p-0 text-center text-[52px] md:text-[52px] leading-tight font-extrabold tabular-nums tracking-[-0.04em] aria-invalid:ring-0 aria-invalid:rounded-none aria-invalid:shadow-[0_3px_0_var(--ui-error)]' }"
                />
            </div>
            <template #error="{ error }">
                <template v-if="error">
                    <UIcon name="i-lucide-circle-alert" class="size-4 shrink-0" />
                    {{ t('form.amountError') }}
                </template>
            </template>
        </UFormField>
        <UFormField required>
            <URadioGroup required :disabled="!!cost" v-model="kind" :items="kindItems" :legend="t('form.kind')"
                variant="card" indicator="hidden" orientation="horizontal"
                :ui="{
                    legend: 'sr-only',
                    fieldset: 'flex-nowrap gap-1 rounded-full bg-muted p-1',
                    item: 'group flex-1 items-center justify-center min-h-10 py-0 rounded-full border-0 hover:bg-transparent has-data-[state=checked]:bg-inverted has-focus-visible:ring-2 has-focus-visible:ring-primary',
                    wrapper: 'flex-row gap-1.5 justify-center',
                    label: 'text-sm font-bold text-muted group-has-data-[state=checked]:text-inverted dark:group-has-data-[state=checked]:text-(--ui-bg-elevated)',
                    icon: 'size-[18px] text-muted group-has-data-[state=checked]:text-inverted dark:group-has-data-[state=checked]:text-(--ui-bg-elevated)'
                }"
            />
        </UFormField>
        <UFormField required :label="t('form.name')" name="name" :ui="{ error: 'mt-1.5 flex items-center gap-1.5 text-[13px] font-bold' }">
            <UInput required class="w-full" :ui="{ base: 'min-h-12 rounded-[1rem] font-semibold bg-muted ring-transparent dark:bg-accented dark:ring-accented aria-invalid:ring-2 aria-invalid:ring-error' }" v-model="state.name" />
            <template #error="{ error }">
                <template v-if="error">
                    <UIcon name="i-lucide-circle-alert" class="size-4 shrink-0" />
                    {{ t('form.nameError') }}
                </template>
            </template>
        </UFormField>
        <UFormField name="category" :ui="{ error: 'mt-1.5 flex items-center gap-1.5 text-[13px] font-bold' }">
            <URadioGroup
                required
                v-model="state.category"
                :items="categoryItems"
                :legend="t('form.category')"
                variant="card" indicator="hidden" orientation="horizontal"
                :ui ="{
                    legend: 'mb-2 text-sm font-medium text-default',
                    fieldset: 'gap-2',
                    item: 'group min-h-11 items-center py-0 rounded-full border-0 ps-1.5 pe-3.5 bg-muted hover:bg-accented has-data-[state=checked]:bg-inverted has-focus-visible:ring-2 has-focus-visible:ring-primary',
                    wrapper: 'flex-row',
                    label: 'text-sm font-bold text-default group-has-data-[state=checked]:text-inverted dark:group-has-data-[state=checked]:text-(--ui-bg-elevated)'
                }"
            >
                <template #label="{ item }">
                    <span class="flex items-center gap-2">
                        <CategoryBadge :category="item.value" :size="32" />
                        {{ item.label }}
                    </span>
                </template>
            </URadioGroup>
            <template #error="{ error }">
                <template v-if="error">
                    <UIcon name="i-lucide-circle-alert" class="size-4 shrink-0" />
                    {{ t('form.categoryError') }}
                </template>
            </template>
        </UFormField>
        <UFormField required v-if="kind === 'purchase'" :label="t('form.date')" name="date" :ui="{ error: 'mt-1.5 flex items-center gap-1.5 text-[13px] font-bold' }" :hint="month ? t('form.dateHint', { month: monthYear(month.year, month.month) }) : undefined">
            <UInput required class="w-full" :ui="{ base: 'min-h-12 rounded-[1rem] font-semibold bg-muted ring-transparent dark:bg-accented dark:ring-accented aria-invalid:ring-2 aria-invalid:ring-error' }" v-model="state.date" type="date" :min="range?.first" :max="range?.last" />
            <template #error="{ error }">
                <template v-if="error">
                    <UIcon name="i-lucide-circle-alert" class="size-4 shrink-0" />
                    {{ t('form.dateError') }}
                </template>
            </template>
        </UFormField>
        <div v-if="kind === 'recurring'" :class="['col-span-full grid gap-[18px]']" >
            <UFormField required name="interval" :label="t('form.interval')">
                <URadioGroup required v-model="state.interval" :items="intervalItems"
                    variant="card" indicator="hidden" orientation="horizontal"
                    :ui="{
                        legend: 'sr-only',
                        fieldset: 'flex-nowrap gap-1 rounded-full bg-muted p-1',
                        item: 'group flex-1 items-center justify-center min-h-10 py-0 rounded-full border-0 hover:bg-transparent has-data-[state=checked]:bg-inverted has-focus-visible:ring-2 has-focus-visible:ring-primary',
                        wrapper: 'flex-row justify-center gap-1.5',
                        label: 'text-sm font-bold text-muted group-has-data-[state=checked]:text-inverted dark:group-has-data-[state=checked]:text-(--ui-bg-elevated)'
                    }"
                />
            </UFormField>
            <UFormField required v-if="state.interval !== 'monthly'" :label="t('form.dueMonth')" name="dueMonth" :help="repeatText" :ui="{ error: 'mt-1.5 flex items-center gap-1.5 text-[13px] font-bold' }">
                <USelect required class="w-full" :ui="{ base: 'min-h-12 rounded-[1rem] font-semibold bg-muted ring-transparent dark:bg-accented dark:ring-accented aria-invalid:ring-2 aria-invalid:ring-error' }" v-model="state.dueMonth" :items="monthItems" />
                <template v-if="dueMonthInvalid" #error>
                    <UIcon name="i-lucide-circle-alert" class="size-4 shrink-0" />
                    {{ t('form.dueMonthError') }}
                </template>
            </UFormField>
        </div>
        <UFormField name="business">
            <UCheckbox
                v-model="state.business" :label="t('form.business')" :description="t('form.businessHint')"
                variant="card" indicator="end" color="secondary"
                :ui="{
                    root: 'min-h-14 items-center gap-3 rounded-2xl border-0 px-4 py-2 bg-(--business-tint) has-focus-visible:ring-2 has-focus-visible:ring-primary',
                    wrapper: 'ms-0',
                    base: 'size-[22px] ring-secondary',
                    label: 'flex items-center gap-3 font-extrabold text-secondary',
                    description: 'ps-8 text-[13px] font-semibold text-secondary'
                }"
            >
                <template #label>
                    <UIcon name="i-lucide-briefcase" class="size-5" />
                    {{ t('form.business') }}
                </template>
            </UCheckbox>
        </UFormField>
        <div class="col-span-full flex justify-end gap-3 pt-2">
            <UButton
                :label="t('common.cancel')" variant="soft"
                class="min-h-12 rounded-full bg-accented px-6 font-extrabold text-primary-600 max-sm:hidden dark:text-[#afc0ff]"
                @click="emit('cancel')"
            />
            <UButton
                type="submit" :label="cost ? t('common.save') : t('form.submit')"
                class="pill-shadow min-h-12 justify-center rounded-full px-7 font-extrabold max-sm:min-h-14 max-sm:w-full max-sm:text-base"
            />
        </div>
    </UForm>
</template>
