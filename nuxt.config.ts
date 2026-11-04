// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/eslint', '@nuxtjs/i18n'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
      ],
      meta: [
        // viewport-fit=cover lets the page use the whole screen of a notched phone, so env(safe-area-inset-bottom) has a value for the tab bar.
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#2D4BD8', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#3B5BEB', media: '(prefers-color-scheme: dark)' },
      ],
    },
  },
  i18n: {
    defaultLocale: 'en',
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'de', language: 'de-DE', name: 'Deutsch', file: 'de.json' },
    ],
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      fallbackLocale: 'en',
    }
  },
  runtimeConfig: {
    databaseUrl: '',
  }
})
