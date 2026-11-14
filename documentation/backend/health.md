# Health and readiness endpoints

What the two status routes do, how to call them and what was checked. Written for: developers and operators.

Costcompass has two routes for a platform that watches the app, such as Kubernetes. Neither needs a body or parameters. There is no authentication (single user), so both are open.

| Route | Question it answers | Touches the database | Success | Failure |
| --- | --- | --- | --- | --- |
| `GET /api/health` | Is the process running? (liveness) | No | 200 `{ "status": "ok" }` | none |
| `GET /api/ready` | Can the app serve requests? (readiness) | Yes, `select 1` | 200 `{ "status": "ok" }` | 503, "Database not reachable" |

## Why there are two

Liveness decides whether a platform restarts the app. Readiness decides whether it sends traffic to it.

`/api/health` does not check the database on purpose. If it did, a database outage would make Kubernetes restart the app pods for nothing, because a restart does not bring the database back. `/api/ready` does check it: while the database is down, the app can run but cannot answer, so it should not receive requests.

## Call the routes

Start the app (see [getting-started.md](getting-started.md)), then:

```bash
curl -i http://localhost:3000/api/health
curl -i http://localhost:3000/api/ready
```

With the database up, both answer `200` with this body:

```json
{ "status": "ok" }
```

With the database down, `/api/ready` answers `503` and `/api/health` still answers `200`. The error body has the usual Nitro shape, with the fixed message "Database not reachable" as `statusMessage`. The original error, its text and the connection string never appear in the response; look in the server log for the cause.

## How `/api/ready` works

The route runs `db.execute(sql\`select 1\`)` through the Drizzle client from `server/utils/db.ts`. Any error becomes a 503 with the fixed message. There is no state: every call asks the database again, so the route answers `200` as soon as the pool can connect again.

The logic is in the route file, `server/api/ready.get.ts` (three lines), not in `server/utils/`. `server/api/health.get.ts` is one line.

## Timeout decision

There is no timeout inside the readiness route. Issue #40 asked for one. The decision is to set the timeout in the probe configuration in Kubernetes (`timeoutSeconds`, issue #46), where the platform owns it.

Consequence: if the database host drops packets instead of refusing the connection, `pg` has no default connection timeout, so the request can hang. The probe's own timeout then fails it. Called by hand, `curl` waits until you stop it or pass `--max-time`:

```bash
curl --max-time 5 -i http://localhost:3000/api/ready
```

Docker's own `HEALTHCHECK` is not set in the `Dockerfile` (see [docker.md](docker.md)). The probes are set in `k8s/app.yaml`, see [kubernetes.md](kubernetes.md#probes).

## Tests

`tests/nuxt/health-routes.test.ts` has 6 tests; see [testing.md](testing.md#core-and-server-tests). They use no database.

## Verification status

Checked by hand against the real dev server with the local Postgres container:

- Database up: `/api/ready` gives 200.
- Database stopped: `/api/ready` gives 503 after about 0.05 s (connection refused, no hang).
- Database started again: the next call gives 200 without restarting the app, so the pool recovers.

Checked by mutation: swallowing the error in `ready` and making `health` query the database make 4 of the 6 tests fail.

Not checked: a database that hangs instead of refusing the connection, and the exact probe timing under load. The probes in Kubernetes were checked, see [kubernetes.md](kubernetes.md#app).
