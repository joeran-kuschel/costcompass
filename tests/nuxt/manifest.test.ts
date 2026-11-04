import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// The manifest is a static file in public/, so nothing else checks that it matches the project.
const publicDir = resolve(import.meta.dirname, '../../public')
const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf-8'))
const manifest = readJson(resolve(publicDir, 'manifest.webmanifest'))
// The locale files are read as plain JSON: importing them would give compiled message objects, not strings.
const en = readJson(resolve(import.meta.dirname, '../../i18n/locales/en.json'))
const de = readJson(resolve(import.meta.dirname, '../../i18n/locales/de.json'))

describe('web manifest', () => {
  it('has the app name, which is the same in English and German', () => {
    expect(en.app.name).toBe(de.app.name)
    expect(manifest.name).toBe(en.app.name)
    expect(manifest.short_name).toBe(en.app.name)
  })
  it('lists the 192, 512 and maskable icons, and every icon file exists in public/', () => {
    const sizes = manifest.icons.map((icon: { sizes: string, purpose?: string }) => `${icon.sizes}${icon.purpose ? ` ${icon.purpose}` : ''}`)
    expect(sizes).toEqual(['192x192', '512x512', '512x512 maskable'])
    for (const icon of manifest.icons) {
      expect(existsSync(resolve(publicDir, icon.src.slice(1))), icon.src).toBe(true)
    }
  })
  it('has the cobalt theme colour and the light background, and no display mode yet', () => {
    expect(manifest.theme_color).toBe('#2D4BD8')
    expect(manifest.background_color).toBe('#F7F7FB')
    expect(manifest).not.toHaveProperty('display')
  })
  it('starts at the dashboard', () => {
    expect(manifest.start_url).toBe('/')
  })
})

describe('icon files in public/', () => {
  it('has the favicon, the Apple touch icon and the manifest that the head links to', () => {
    for (const file of ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'manifest.webmanifest']) {
      expect(existsSync(resolve(publicDir, file)), file).toBe(true)
    }
  })
  it('contains no embedded content-credentials (C2PA) data', () => {
    for (const file of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) {
      const content = readFileSync(resolve(publicDir, file)).toString('latin1')
      expect(content, file).not.toMatch(/c2pa|jumb|caBX/)
    }
  })
})
