#!/usr/bin/env bash
set -euo pipefail
NAMESPACE=costcompass
APP_IMAGE=costcompass
MIGRATE_IMAGE=costcompass-migrate
CONTEXT=$(kubectl config current-context)

echo "Cleaning images, context '$CONTEXT', namespace '$NAMESPACE'"

if [ "$CONTEXT" != "docker-desktop" ]; then
    echo "Refusing to clean: The context is not docker-desktop" >&2
    exit 1
fi

KEEP=${KEEP:-3}

DRY_RUN=false
if [ "${1:-}" = "--dry-run" ]; then
    DRY_RUN=true
fi

REVISION_TAGS=$(kubectl get rs -n "$NAMESPACE" -l app=costcompass \
    -o 'custom-columns=REV:.metadata.annotations.deployment\.kubernetes\.io/revision,IMAGE:.spec.template.spec.containers[0].image' \
    --no-headers | sort -rn | head -n "$KEEP" | sed 's/.*://')

POD_TAGS=$(kubectl get pods -n "$NAMESPACE" \
    -o jsonpath='{.items[*].spec.containers[*].image} {.items[*].spec.initContainers[*].image}' \
    | tr ' ' '\n' | grep '^costcompass' | sed 's/.*://')

KEEP_TAGS=$(printf '%s\n%s\n' "$REVISION_TAGS" "$POD_TAGS" | sort -u)

echo "Keeping these tags:"
echo "$KEEP_TAGS"

HOST_IMAGES=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep -E "^($APP_IMAGE|$MIGRATE_IMAGE):" | grep -v '<none>' || true)

for REF in $HOST_IMAGES; do
    TAG=${REF#*:}

    if echo "$KEEP_TAGS" | grep -qxF "$TAG"; then
        continue
    fi

    if [ "$DRY_RUN" = true ]; then
        echo "Would remove $REF"
    else
        echo "Removing $REF"
        docker rmi "$REF"
    fi
done

NODE_IMAGES=$(docker exec desktop-control-plane ctr -n k8s.io images ls -q | grep -E "^docker.io/library/($APP_IMAGE|$MIGRATE_IMAGE):" || true)

for NODE_REF in $NODE_IMAGES; do
    TAG=${NODE_REF#*:}

    if echo "$KEEP_TAGS" | grep -qxF "$TAG"; then
        continue
    fi

    if [ "$DRY_RUN" = true ]; then
        echo "Would remove $NODE_REF from the cluster node"
    else
        echo "Removing $NODE_REF from the cluster node"
        docker exec desktop-control-plane ctr -n k8s.io images rm --sync "$NODE_REF"
    fi
done
