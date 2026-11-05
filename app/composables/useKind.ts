const KIND_ICONS: Record<Cost['kind'], string> = {
    recurring: 'i-lucide-repeat',
    purchase: 'i-lucide-shopping-bag'
}
export function useKind() {
    const kindIcon = (kind: Cost['kind']) => KIND_ICONS[kind]
    return {
        kindIcon
    }
}
