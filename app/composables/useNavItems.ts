export function useNavItems() {
    const { t } = useI18n()
    const { currentYear, currentMonth} = useYear()
    const { monthPath } = useMonth()
    const items = computed(() => [
        {'label': t('nav.dashboard'), 'shortLabel': t('nav.dashboard'), to: '/', icon: 'i-lucide-layout-dashboard'},
        {'label': t('nav.costs'), 'shortLabel': t('nav.costs'), to: '/costs', icon: 'i-lucide-list'},
        {'label': t('nav.thisMonth'), 'shortLabel': t('nav.month'), to: monthPath(currentYear.value, currentMonth.value), icon: 'i-lucide-calendar'}
    ])
    return { items }
}
