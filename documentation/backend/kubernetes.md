# Kubernetes manifests

What is in `k8s/`, how to create the Secret and how to apply the manifests. Written for: developers and operators, on the local Docker Desktop cluster (context `docker-desktop`).

The manifests are plain YAML files applied with `kubectl apply -f`. There is no Kustomize or Helm (decision #43, see [decisions.md](decisions.md)). So far `k8s/` holds the namespace, the configuration and the credentials. Postgres, the app and the migrations Job come with later issues.

## What is in `k8s/`

| File | Object | Committed | What it holds |
| --- | --- | --- | --- |
| `namespace.yaml` | Namespace `costcompass` | Yes | The namespace for everything of the app |
| `configmap.yaml` | ConfigMap `costcompass-config` | Yes | `NODE_ENV=production` and `NITRO_PORT="3000"` |
| `secret.yaml.example` | none (template) | Yes | Template of the Secret `costcompass-db` with `change-me` values |
| `secret.yaml` | Secret `costcompass-db`, type Opaque | No, listed in `.gitignore` | Your real credentials |

All ConfigMap values are strings, so the port is written in quotes.

### Keys in the Secret

| Key | Read by |
| --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | The Postgres pod (#45) |
| `NUXT_DATABASE_URL` | The app (#46) and the migrations Job (#47) |

The app reads `NUXT_DATABASE_URL` as its `runtimeConfig` override (see [architecture.md](architecture.md)).

### Why the example is called `secret.yaml.example`

`kubectl apply -f k8s/` reads only `.yaml`, `.yml` and `.json` files. With the name `secret.example.yaml`, both files defined the same Secret, and the example (applied first) could be applied with `change-me` values. The dry run listed the Secret twice. With the current name it lists three objects.

## Create the Secret

1. Copy the template. The copy is ignored by git.

   ```bash
   cp k8s/secret.yaml.example k8s/secret.yaml
   ```

2. Generate a password without special characters:

   ```bash
   openssl rand -hex 16
   ```

3. In `k8s/secret.yaml`, replace every `change-me` with the password. It appears twice: in `POSTGRES_PASSWORD` and inside `NUXT_DATABASE_URL`. Both must be identical. If you pick a password with special characters, percent-encode it inside the URL.

4. Keep user and database name in step. `POSTGRES_USER` and `POSTGRES_DB` must match the user and the database name in the URL, which has this form:

   ```text
   postgresql://USER:PASSWORD@postgres:5432/DB
   ```

   - Host `postgres` is the name of the Postgres Service. #45 must create a Service with this name.
   - Port 5432 is the port inside the cluster. It is not 5434, which is only the published port of the local dev container (see [getting-started.md](getting-started.md)).

Never commit `k8s/secret.yaml`. Do not paste its content into issues, pull requests or chats.

## Apply and check

The namespace must exist first, because the other objects name it.

1. Apply the namespace:

   ```bash
   kubectl apply -f k8s/namespace.yaml
   ```

2. Apply the rest of the folder:

   ```bash
   kubectl apply -f k8s/
   ```

3. Check the result:

   ```bash
   kubectl get configmap,secret -n costcompass
   ```

   Expected: `configmap/costcompass-config` with DATA 2, `configmap/kube-root-ca.crt` (added by Kubernetes itself) and `secret/costcompass-db` of type Opaque with DATA 4.

Applying again is safe: unchanged objects report "unchanged", changed ones are updated. To preview without changing the cluster, run `kubectl apply --dry-run=client -f k8s/`.

If the Secret is missing from the output, check that `k8s/secret.yaml` exists; the example is not applied by design.

## Secrets are not encrypted

Kubernetes stores Secret values as base64, which is an encoding, not encryption. Anyone who can read the Secret in the namespace can decode it:

```bash
kubectl get secret costcompass-db -n costcompass -o jsonpath='{.data.POSTGRES_USER}' | base64 -d
```

This is acceptable for a local cluster. Do not reuse these values anywhere else.

## Later additions

A second, restricted database user will need further Secret keys (#169). Postgres (#45), the app (#46) and the migrations Job (#47) will each get a section here when they exist.

## Verification status

Checked on Docker Desktop (context `docker-desktop`): `kubectl apply --dry-run=client -f k8s/` lists three objects; the apply order above creates the ConfigMap with 2 entries and the Secret with 4; applying twice is safe.

Not checked: that a pod uses the objects (that comes with #45 to #47), that the password in the URL works against a real Postgres, deleting and re-creating the namespace.
