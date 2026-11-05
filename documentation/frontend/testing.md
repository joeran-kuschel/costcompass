# Testing the frontend

What the component, page, composable and app-level tests check and how each is set up. Written for: developers. The general conventions, the commands and the tests of the calculation core and the server are in [the backend testing page](../backend/testing.md). The tests live in `tests/nuxt/`; today there are 29 files and 713 tests.

## Setup that all of these tests share

- Tests run in the Nuxt environment (`@nuxt/test-utils`). Components and pages are mounted with `mountSuspended` from `@nuxt/test-utils/runtime`, which needs the dev dependency `@vue/test-utils`.
- `$fetch` is an auto-import in this project, so a test mocks it with `mockNuxtImport('$fetch', ...)`. `vi.stubGlobal` has no effect.
- That mock also replaces what `useFetch` uses. The page tests therefore register fake API endpoints with `registerEndpoint` instead. The endpoints can be slow or fail.
- `useFetch` caches by URL, so page tests call `clearNuxtData()` before each test.
- `useState` outlives a test. Tests for `useState` call `clearNuxtState()` before each test, and every file that touches the dialog closes its state after each test.
- Modal content is teleported to `document.body`, so page tests query it there.
- `UForm` validates asynchronously, so tests wait for the outcome with `vi.waitFor`.
- The vitest `include` pattern is `tests/**/*.test.ts`, so every file ending in `.test.ts` runs as a test. A helper file must not end in `.test.ts`; that is why the shared dashboard helper is `tests/nuxt/helpers/dashboard.ts`.
- A page test does not render `app.vue`, so a title has no "– Costcompass" suffix.

## What each file checks

### Pages

| File | Checks |
| --- | --- |
| `dashboard-states.test.ts` | The loading state (with the nested `skeleton` describe), the empty state and the error state. See the list below |
| `dashboard-summary.test.ts` | The summary tiles, the category rows and the household versus business split |
| `dashboard-months.test.ts` | The costs per month chart and the month bar links |
| `dashboard-month-cards.test.ts` | The this-month card (also its empty month and its subtotals), the "Largest this month" card, the "View month" link and the year selector |
| `helpers/dashboard.ts` | Not a test file. The shared fake API (`api`, `registerDashboardEndpoints()`), the `rent` fixture, `sleep`, `setLanguage()` and `resetDashboardState()`, which resets the fake endpoints, calls `clearNuxtData()` and `clearNuxtState(['year', 'today'])` and runs in `beforeEach` |
| `month-page.test.ts` | The states; that its add buttons ask for the dialog with the month; the year check; the content with its sums, checked against `monthlyTotals`; the hero's comparison pill (more, less, same, nothing to compare with, the short text and the icon hidden from screen readers, not shown while loading or after a failed load, German) and its counts line (all and business costs, matching the rows below, singular for one cost, hidden in an empty month, German); the decorative kind icon in each group heading, with the heading text unchanged; the rows (#76): a 40 px category badge first in every row, hidden from screen readers, the due month after a yearly interval but not after a quarterly or monthly one, the full purchase date ("October 20", German "20. Oktober" and "Jährlich, Oktober"); the "By category" card (#77, `describe('month page "By category" card')`): an `aside` named by its heading, the rows with cents largest first, categories without costs left out, the sum equal to the month's total, a 36 px badge hidden from screen readers in every row, not shown in an empty month, while loading or after a failed load, German; the household and business totals below it (#78, `describe('month page household and business totals')`): the two rows with cents, their sum equal to the hero total, "€0.00" business in a month without business costs, decorative icons, the divider line (`border-t`), not shown in an empty month, German "Haushalt" and "Geschäftlich"; the navigation (`describe('month page navigation')`): the previous and next links and their targets, hidden where the neighbouring year has no data, 44 px (`pill-icon`), the keyboard order, German names, and the heading row on phones (#118): a three-column grid that becomes a flex row from `sm`, the title and the badge in the middle column (`col-start-2`), also when the previous arrow is hidden (`/months/2025/01`) or the next one (`/months/2026/12`), the source order previous, title, next, and `tabindex="-1"` on the `h1`; jsdom has no layout, so these check the markup only. The aside holds two lists, so the "By category" tests read only its first `ul` and the split tests its second; the business badge test looks only at the rows of the two groups. The content test expects four `ul` (the two groups, the categories and the split) and the `h2` list including "By category". Same fake endpoints as the dashboard tests, `mountSuspended` with the `route` option, `showError` mocked with `mockNuxtImport` |
| `error-page.test.ts` | `error.vue` mounted with an `error` prop, `clearError` mocked with `mockNuxtImport` |
| `costs-page.test.ts` | `costs.vue`: its add and edit buttons only check the dialog state; the page shows new numbers after `refreshNuxtData()`; the kind column (#85, `describe('costs page kind column')`): the repeat icon for recurring costs and the shopping bag for purchases, the icons hidden from screen readers with the kind word as the only cell text, the same icons as `useKind()`, German "Wiederkehrend" and "Anschaffung" next to the icons (the test switches the locale with `useNuxtApp().$i18n.setLocale` and resets it in a `finally`); the kind is the second cell of a row (index 1) since #84; the row actions (#84): Edit before Delete in every row, both with the same classes (neutral icon buttons), and every row's buttons named after the cost; the name column (`describe('costs page name column')`): the badge, the name and the category caption, the business badge only on business costs, and that the name line and the When text can wrap (`whitespace-normal`, `flex-wrap`; jsdom has no layout, so this checks classes only, the widths were checked in the browser); the summary line (#80, `describe('costs page summary line')`, 7 tests): the whole line for 2026 ("2 recurring costs and 1 purchase · €10,891 in 2026"), only the amount bold, the line in the `header` right below the `h1`, the year fallback (a stored year without data names the current year, the counts stay all costs), the update when a list changes, singular, plural and zero in English, and the German forms and the whole German line (locale switched in a `try`/`finally`). The file's `afterEach` also calls `clearNuxtState(['year'])` and `clearNuxtData()`, because these tests change the selected year and the cached lists. `useYearSummary()` has no test file of its own; these tests and the dashboard year selector tests cover it |
| `costs-page-sorting.test.ts` | The columns and the sorting of the costs table. Column positions are constants: `NAME` 0, `KIND` 1, `WHEN` 2, `AMOUNT` 3, `ACTIONS` 4. Checks the headers Name, Kind, When, Amount and Actions, without Category and Business (#84); sorting by name (also umlauts in German, "Äpfel" first), kind and amount; that a row's data stays together; no sort button on When and Actions; the sort button names of Name, Kind and Amount contain the visible text, and the German names ("Nach Art sortieren", "Art, aufsteigend sortiert"). It switches the locale with `useNuxtApp().$i18n.setLocale` and resets it after each test |

The four dashboard test files keep their own `wrapper`, `mountPage()`, `status()` and `alert()` helpers and their own `afterEach` (unmount, close the dialog, language back to English). Together they cover:

- The states (`dashboard-states.test.ts`): the loading skeleton (busy region with status text, `sr-only` status text, hidden from assistive technology with no alert inside, three cards, reduced motion class on every block, gone after load and after an error, keeps loading until both lists have arrived, German status text), the empty card (heading, text, tip, button, four decorative badges with different category classes, the button opens the empty add dialog and no link to `/costs` is left, German) and the error card (its structure, no API message, focus after a successful retry, no focus move after a failed one).
- The summary card with its four tiles and sub lines (`dashboard-summary.test.ts`).
- The household versus business ring (`dashboard-summary.test.ts`): label, centre text, rows with amounts, ring colours and gap as a style string, the full and empty rings, a 1% share.
- The category rows (`dashboard-summary.test.ts`): name, amount, percentage, sum 100, no bar per row, and the stacked bar (decorative and without text, widths in list order, category colour tokens, no visible segment for 0%, empty track in an empty year).
- The month bar links and the costs per month chart (`dashboard-months.test.ts`).
- The "View month" link, the this-month card, the "Largest this month" card and the year selector (`dashboard-month-cards.test.ts`).
- The subtotals of the this-month card (`dashboard-month-cards.test.ts`), checked against `monthlyTotals`.

The page test does not go through Nuxt's error handling. Whether a real unknown URL gives the 404 status was checked by hand against the dev server with `curl -H "Accept: text/html"`, so `error-page.test.ts` does not cover it.

### Components

| File | Checks |
| --- | --- |
| `CostForm.test.ts` | The form, including its `month` prop |
| `CostDialog.test.ts` | The central dialog, mounted on the layout: opens empty, pre-filled for an edit and for a month, Cancel and the close button clear the state, nothing leaks into the next dialog, focus returns to the element focused before, both lists are loaded again and the dialog closes after a save, German. Each test file that touches the dialog closes the state after every test, because `useState` outlives a test |
| `LanguageSwitcher.test.ts` | The language switcher |
| `YearSelect.test.ts` | The year select. The list is teleported to the body and an item is chosen with a `pointerup` event, not a click |
| `BusinessBadge.test.ts`, `CategoryBadge.test.ts`, `MobileBar.test.ts`, `DefaultLayout.test.ts` | See [Business badge](colour-scheme.md#business-badge), [Category badge](colour-scheme.md#category-badge), [Bottom tab bar](app-structure.md#bottom-tab-bar) and [Sidebar navigation](app-structure.md#sidebar-navigation) |
| `manifest.test.ts` | See [Favicon, app icons and web manifest](colour-scheme.md#favicon-app-icons-and-web-manifest) |

### Composables

| File | Checks |
| --- | --- |
| `useMoney.test.ts` | The money formatter and `useMoneyParts` (the three pieces in English and German, joined they equal `useMoney({ cents: true })`, rounding to the cent). Both are called from a small probe component, because they need the i18n context |
| `useYear.test.ts` | `clearNuxtState` before each test, because `useState` outlives a test. A test fakes the clock around New Year |
| `useMonth.test.ts` | Its time zone check only fails west of UTC. Run it with `TZ=America/Los_Angeles` to see it, as described on the [backend testing page](../backend/testing.md#good-to-know) |
| `useCategory.test.ts`, `useNavItems.test.ts` | See [Category badge](colour-scheme.md#category-badge) and [The items](app-structure.md#the-items) |
| `useKind.test.ts` | The icon per kind (repeat for recurring costs, shopping bag for purchases), and that each kind has its own icon, different from every category icon of `useCategory()`. Calls `useKind()` directly, because it needs no i18n or component state |

### App level

| File | Checks |
| --- | --- |
| `app-locale.test.ts` | The language behaviour of the app: built-in Nuxt UI texts, `<html lang>` and `dir`, and the page titles, each also after switching the language without a reload |
| `route-announcer.test.ts` | The hidden live region holds the new page title after a navigation, also in German |

## What the tests do not cover

- Layout widths and equal heights: jsdom has no layout. They were checked by hand in the browser, see the pages in [app-structure.md](app-structure.md).
- The current tab of the bottom bar (`aria-current`): the test environment's router does not report a `NuxtLink` as active.
- A real unknown URL giving the 404 status (see above).
