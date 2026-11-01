export function useAppHead() {
    const { t, locale } = useI18n()
    useHead({
        htmlAttrs: { lang: () => locale.value, dir: 'ltr' },
        titleTemplate: title => title ? `${title} – ${t('app.name')}` : t('app.name')
    })
}
