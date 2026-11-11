# Costcompass

Track your household and business costs in one place and see what they add up to.

Costcompass records recurring costs (rent, insurance) and one-off costs (appliances), sorted by category and optionally marked as business. It then shows the totals per year, month and category, and the split between household and business.

## Features

- Recurring costs (monthly, quarterly, yearly) and one-off costs
- Categories and a household/business split
- Dashboard for the year, a costs table with search and filters, and a page for every month
- English and German UI, light and dark mode
- Keyboard and screen reader support

## Tech stack

Nuxt 4, Nuxt UI, `@nuxtjs/i18n`, Drizzle ORM, PostgreSQL, Vitest.

## Quick start

You need Node.js, [pnpm](https://pnpm.io) and a running PostgreSQL.

```bash
pnpm install
```

Create a `.env` file in the project root with the database URL:

```bash
NUXT_DATABASE_URL=postgres://user:password@localhost:5432/costcompass
```

```bash
pnpm drizzle-kit migrate
pnpm dev
```

Open `http://localhost:3000`. Run the tests with `pnpm vitest run` (no database needed).

Details, including a PostgreSQL container example: [Get started](documentation/backend/getting-started.md).

## Documentation

- [User guide](documentation/frontend/user-guide.md): how to use the app
- [Frontend](documentation/frontend/index.md): pages, components, design
- [Backend and development](documentation/backend/index.md): architecture, API, database, tests

## Status

In development. Cost tracking and its UI work. A Docker image and Kubernetes manifests are planned.

## License

[MIT](LICENSE)
