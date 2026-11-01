<script lang="ts" setup>
const route = useRoute()

const parsed = monthParamsSchema.safeParse(route.params)
if (!parsed.success) {
    throw createError({ status: 404, fatal: true, data: { reason: 'month' }})
}
const { year, month } = parsed.data

</script>
<template>
    <h1>{{ year }}-{{ month }}</h1>
</template>
