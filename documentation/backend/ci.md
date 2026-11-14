# Continuous integration

How GitHub Actions checks every pull request, and how to run the same checks on your machine. For developers and contributors. The workflows are `.github/workflows/ci.yml` (jobs `test`, `docker`, `manifests`) and `.github/workflows/codeql.yml`.

## When it runs

- On every pull request and on every push to `main`.
- A new run for the same ref cancels the older one (concurrency group `ci-<ref>`).
- The workflow has read-only access to the repository (`permissions: contents: read`).
- The three jobs run in parallel and do not depend on each other.

## The jobs

| Job | What it does | What it catches |
| --- | --- | --- |
| `test` | On Node 26: `pnpm install --frozen-lockfile`, `pnpm vitest run`, `pnpm build` | Failing tests, a lockfile that does not match `package.json`, a build error |
| `docker` (#186) | Builds the app image and the migrations image, then checks what each one starts | A broken Dockerfile stage, a wrong `COPY` path, a file missing from the build context, a wrong stage order |
| `manifests` (#186) | Validates the YAML files in `k8s/` with kubeconform | Misspelled or unknown fields, wrong types, a wrong `apiVersion` or `kind` |

### Job `docker`

1. `docker build -t costcompass:ci .` builds the last stage, `runtime`.
2. `docker build --target migrate -t costcompass-migrate:ci .` builds the migrations image.
3. `docker inspect --format '{{json .Config.Cmd}}'` must print `["node",".output/server/index.mjs"]` for the app image and `["node","server/db/migrate.ts"]` for the migrations image.

Nothing is pushed. Check 3 exists because a plain `docker build` uses the last stage in the Dockerfile. If someone moves the `migrate` stage to the end, the default build would produce the migration image and the app would never start; the check fails in that case. Image contents and stages: [docker.md](docker.md).

### Job `manifests`

The job downloads kubeconform v0.8.0 (linux-amd64), checks the archive against a pinned sha256 checksum with `sha256sum -c`, and runs:

```bash
./kubeconform -strict -summary k8s/*.yaml k8s/secret.yaml.example
```

- `-strict` rejects fields that the schema does not know.
- `k8s/secret.yaml` is git-ignored, so CI never sees a real secret. `secret.yaml.example` is listed on its own because its name does not end in `.yaml`.
- kubeconform loads the Kubernetes JSON schemas from `raw.githubusercontent.com` while it runs. The job needs that network access.
- It checks structure only. It does not know whether an image exists, whether a Secret key is referenced correctly, or whether the apply order works. Manifests and apply order: [kubernetes.md](kubernetes.md).

## Run the checks locally

The Docker checks (from the project root):

```bash
docker build -t costcompass:ci .
docker build --target migrate -t costcompass-migrate:ci .
docker inspect --format '{{json .Config.Cmd}}' costcompass:ci
docker inspect --format '{{json .Config.Cmd}}' costcompass-migrate:ci
```

The first `inspect` prints `["node",".output/server/index.mjs"]`, the second `["node","server/db/migrate.ts"]`.

The manifest check needs [kubeconform](https://github.com/yannh/kubeconform) installed:

```bash
kubeconform -strict -summary k8s/*.yaml k8s/secret.yaml.example
```

Locally the glob `k8s/*.yaml` also matches your real `k8s/secret.yaml`, so it is validated too.
The tests and the build: see [getting-started.md](getting-started.md) and [testing.md](testing.md).

## Update kubeconform

1. Open the release page of the new version and take the download URL for `kubeconform-linux-amd64.tar.gz`.
2. Take the sha256 checksum for that file from the `CHECKSUMS` file, an asset of the same release.
3. Change the version in the URL and the checksum in the step "Install kubeconform" in `.github/workflows/ci.yml`. Change both together; a new version with the old checksum fails the `sha256sum -c` step.

## CodeQL

`.github/workflows/codeql.yml` runs CodeQL code scanning for `javascript-typescript`. It runs on pull requests, on pushes to `main` and every Monday at 04:17 UTC (`cron: '17 4 * * 1'`). It has the extra permission `security-events: write` to report findings.

The job runs only if the repository is public (`if: github.event.repository.private == false`), because code scanning is free for public repositories only. In a private repository it is skipped.

## What was checked

- The first run on the pull request was green for all three jobs: `docker` 60 s, `test` 96 s, `manifests` 4 s (they run in parallel).
- A deliberately wrong `COPY` path in the Dockerfile turned only `docker` red.
- A deliberately misspelled field (`containerPortt`) in `k8s/app.yaml` turned only `manifests` red, with the log line `additional properties 'containerPortt' not allowed`.
- Both changes were reverted and the run was green again.
- The `docker` commands and the `CMD` checks were run locally before pushing. kubeconform was run locally on all 9 files (11 resources valid).

Not checked or not set up:

- The jobs are not required checks for merging. That is a branch protection setting on GitHub and the author's decision.
- No image scanning and no manifest scanning.
- No cluster in CI (see issue #187).
- No build cache: the `docker` job builds everything on each run.
- CodeQL: runs on this repository's pull requests (the repository is public).
