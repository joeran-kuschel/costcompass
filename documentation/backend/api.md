# API reference

All routes of the Costcompass API. Written for: developers. The API has no authentication (single user) and sends JSON.

Two resources, same shape:

| Resource | Base path |
| --- | --- |
| Recurring costs | `/api/recurring-costs` |
| Purchases | `/api/purchases` |

| Method | Path | Purpose | Success |
| --- | --- | --- | --- |
| `GET` | `/api/<resource>` | List all, ordered by `id` | 200, array |
| `POST` | `/api/<resource>` | Create | 200, created item |
| `PATCH` | `/api/<resource>/{id}` | Change fields | 200, updated item |
| `DELETE` | `/api/<resource>/{id}` | Delete | 204, no body |

`POST` returns 200, not 201.

Routes validate with the Zod schemas in `shared/utils/validation.ts` and call `server/utils/costs.ts`. There are no routes for totals; the core in `shared/` computes them from the lists ([calculation-core.md](calculation-core.md)).

## Shared fields

| Field | Type | Rule |
| --- | --- | --- |
| `name` | string | Trimmed, 1 to 200 characters |
| `amount` | number | Greater than 0 (euros, e.g. `49.9`) |
| `category` | string | One of `housing`, `insurance`, `appliances`, `food`, `mobility` |
| `business` | boolean | Required on create |

## Recurring costs

### Create: `POST /api/recurring-costs`

Extra fields depend on `interval`.

| `interval` | `dueMonth` |
| --- | --- |
| `monthly` | Not sent (an unknown field is ignored) |
| `quarterly` | Required, integer 1 to 12. First month; repeats every 3 months. |
| `yearly` | Required, integer 1 to 12 |

```bash
curl -X POST http://localhost:3000/api/recurring-costs \
  -H 'content-type: application/json' \
  -d '{"name":"Liability insurance","amount":84,"category":"insurance","business":false,"interval":"yearly","dueMonth":3}'
```

Response (200). The server adds `id` and `kind`:

```json
{ "id": 7, "name": "Liability insurance", "amount": 84, "category": "insurance",
  "business": false, "interval": "yearly", "dueMonth": 3, "kind": "recurring" }
```

For a monthly cost `dueMonth` is absent from the response (`null` in the database is mapped to `undefined`).

### Update: `PATCH /api/recurring-costs/{id}`

Body: any subset of `name`, `amount`, `category`, `business`, `interval`, `dueMonth`. An empty object is rejected.

The server loads the stored row, merges your fields, validates the result as a full create body and writes it. So:

- Changing `interval` to `yearly` on a monthly cost needs `dueMonth` in the same request, or the response is 400.
- Changing a yearly cost to `monthly` clears `due_month` in the database.

```bash
curl -X PATCH http://localhost:3000/api/recurring-costs/7 \
  -H 'content-type: application/json' -d '{"amount":90}'
```

### List and delete

`GET /api/recurring-costs` returns an array of items as above. `DELETE /api/recurring-costs/{id}` returns 204.

## Purchases

### Create: `POST /api/purchases`

Fields: the shared fields plus `date`, a calendar date `YYYY-MM-DD`. The API accepts any date; the form in the month page limits the date field to the month, the API does not.

```bash
curl -X POST http://localhost:3000/api/purchases \
  -H 'content-type: application/json' \
  -d '{"name":"Laptop","amount":1200,"category":"appliances","business":true,"date":"2026-10-14"}'
```

Response (200):

```json
{ "id": 1, "name": "Laptop", "amount": 1200, "category": "appliances",
  "business": true, "date": "2026-10-14", "kind": "purchase" }
```

### Update: `PATCH /api/purchases/{id}`

Body: any subset of the create fields; an empty object is rejected. The update is written as sent, with no merge step.

### List and delete

`GET /api/purchases` returns an array. `DELETE /api/purchases/{id}` returns 204.

## Status codes

| Code | When |
| --- | --- |
| 200 | `GET`, `POST`, `PATCH` succeeded |
| 204 | `DELETE` succeeded, no body |
| 400 | Invalid body, invalid `id` in the path, empty patch, or a merged recurring cost that is invalid |
| 404 | No row with that `id` (`PATCH` and `DELETE`) |
| 500 | Unexpected error, for example the database is unreachable |

An error response looks like this (404):

```json
{ "error": true, "url": "http://localhost:3000/api/purchases/999999",
  "statusCode": 404, "statusMessage": "Not found", "message": "Not found" }
```

A 400 has `statusMessage` `"Validation Error"`. The details are in `data`. For a body rejected by the route, `data` is the Zod error (its `message` field holds the list of issues as JSON text); for a merge rejected inside `PATCH /api/recurring-costs/{id}`, `data` is the array of Zod issues. In development the response also includes a `stack`.

The `id` must be a positive integer; `abc` gives 400.

## Checked against

Run against the dev server and the local database: `GET /api/purchases` (200, array), `POST` with an invalid body (400, "Validation Error"), `PATCH /api/purchases/abc` (400), `DELETE /api/purchases/999999` (404). Not run, to keep the local data unchanged: successful `POST`, `PATCH` and `DELETE`. Their behaviour is read from the code and covered on a mocked database in `tests/nuxt/server-costs.test.ts`.
