# Database

The PostgreSQL schema and how to change it. Written for: developers.

Access goes through [Drizzle ORM](https://orm.drizzle.team) (`drizzle-orm` with the `pg` driver); migrations come from `drizzle-kit`. Only `server/utils/costs.ts` queries the tables.

## Schema

Defined in `server/db/schema.ts`. Two enums and two tables.

**Enums**

| Enum | Values | Source |
| --- | --- | --- |
| `category` | `housing`, `insurance`, `appliances`, `food`, `mobility` | `CATEGORIES` in `shared/types/calculation.ts` |
| `recurring_interval` | `monthly`, `quarterly`, `yearly` | `INTERVALS` in the same file |

Both enums are built from the shared arrays, so the list lives in one place.

**Table `recurring_costs`**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `serial` | Primary key |
| `name` | `text` | Not null |
| `amount` | `numeric(10, 2)` | Not null; read as a JavaScript number |
| `category` | `category` | Not null |
| `business` | `boolean` | Not null, default `false` |
| `interval` | `recurring_interval` | Not null |
| `due_month` | `integer` | Nullable; 1 to 12 for yearly and quarterly, `null` for monthly |

**Table `purchases`**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `serial` | Primary key |
| `name` | `text` | Not null |
| `amount` | `numeric(10, 2)` | Not null |
| `category` | `category` | Not null |
| `business` | `boolean` | Not null, default `false` |
| `date` | `date` | Not null; read as a `YYYY-MM-DD` string |

The database does not check `due_month` (range or presence). The Zod schemas in `shared/utils/validation.ts` do, so write only through the API.

## Change the schema

1. Edit `server/db/schema.ts`.
2. Generate a migration:

   ```bash
   pnpm drizzle-kit generate
   ```

   A new `.sql` file appears in `server/db/migrations/`, and `meta/` is updated. Commit all of it.
3. Read the generated SQL before you apply it.
4. Apply it:

   ```bash
   pnpm drizzle-kit migrate
   ```

`drizzle.config.ts` reads `NUXT_DATABASE_URL` from `.env`; see [getting-started.md](getting-started.md). The only migration today is `0000_silent_midnight.sql`.

If you add a category, edit `CATEGORIES`, generate a migration for the enum, and add the name to `category.*` in both locale files. *(Not tried; follows from the setup above.)*

## Migrations in production

Planned: a Kubernetes Job or init container runs migrations before the app starts, never on a request. Not built yet.
