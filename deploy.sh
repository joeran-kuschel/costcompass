#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
NAMESPACE=costcompass
APP_IMAGE=costcompass
MIGRATE_IMAGE=costcompass-migrate
CONTEXT=$(kubectl config current-context)

echo "Deploying to context '$CONTEXT', namespace '$NAMESPACE'"

if [ "$CONTEXT" != "docker-desktop" ]; then
    echo "Refusing to deploy: the context is not docker-desktop" >&2
    exit 1
fi

TAG=$(git rev-parse --short HEAD)

if [ -n "$(git status --porcelain)" ]; then
    TAG="$TAG-dirty-$(date +%s)"
fi

echo "Image tag: $TAG"

echo "Building images"
docker build -t "$APP_IMAGE:$TAG" .
docker build --target migrate -t "$MIGRATE_IMAGE:$TAG" .

echo "Loading images into the cluster node"
for IMAGE in "$APP_IMAGE" "$MIGRATE_IMAGE"; do
    docker save "$IMAGE:$TAG" | docker exec -i desktop-control-plane ctr -n k8s.io images import -
done

echo "Running migrations"
kubectl delete job costcompass-migrate -n "$NAMESPACE" --ignore-not-found
sed "s/IMAGE_TAG/$TAG/" k8s/migrate-job.yaml | kubectl apply -f -
echo "Waiting for the migrations"
for _ in $(seq 1 60); do
    CONDITIONS=$(kubectl get job costcompass-migrate -n "$NAMESPACE" -o jsonpath='{.status.conditions[*].type}')

    if [[ "$CONDITIONS" == *Failed* ]]; then
        echo "The migration failed. Log:" >&2
        kubectl logs job/costcompass-migrate -n "$NAMESPACE" -c costcompass-migrate >&2
        exit 1
    fi

    if [[ "$CONDITIONS" == *Complete* ]]; then
        break
    fi

    sleep 2

done

if [[ "$CONDITIONS" != *Complete* ]]; then
    echo "The migration did not finish in time" >&2
    exit 1
fi

echo "Updating the app"
sed "s/IMAGE_TAG/$TAG/" k8s/app.yaml | kubectl apply -f -
kubectl rollout status deployment/costcompass -n "$NAMESPACE" --timeout=120s

echo "Deployed $APP_IMAGE:$TAG"
