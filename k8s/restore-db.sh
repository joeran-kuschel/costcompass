#!/usr/bin/env bash
set -euo pipefail
#shellcheck source=db-common.sh
source "$(dirname "$0")/db-common.sh"

FILE=${1:-}
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
    echo "Usage: $0 <backup file>" >&2
    exit 1
fi

gunzip -t "$FILE"

DB=$(kubectl exec -n "$NAMESPACE" "$POD" -- printenv POSTGRES_DB)
# shellcheck disable=SC2016
RECURRING=$(kubectl exec -n "$NAMESPACE" "$POD" -- sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "select count(*) from recurring_costs"')
# shellcheck disable=SC2016
PURCHASES=$(kubectl exec -n "$NAMESPACE" "$POD" -- sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "select count(*) from purchases"')

echo "This replaces ALL data in the database '$DB' (namespace '$NAMESPACE')."
echo "What is there now will be deleted: $RECURRING recurring costs, $PURCHASES one-off costs."
echo "It will be replaced by the contents of: $FILE"
read -r -p "Type 'restore' to continue: " ANSWER

if [ "$ANSWER" != "restore" ]; then
    echo "Aborted, nothing changed"
    exit 1
fi

start_app() {
    echo "Starting the app"
    kubectl scale deployment/costcompass -n "$NAMESPACE" --replicas=1
    kubectl rollout status deployment/costcompass -n "$NAMESPACE" --timeout=120s
}
trap start_app EXIT

echo "Stopping the app"
kubectl scale deployment/costcompass -n "$NAMESPACE" --replicas=0
kubectl wait --for=delete pod -l app=costcompass -n "$NAMESPACE" --timeout=60s

echo "Restoring from $FILE"
# shellcheck disable=SC2016  # the variables are meant to be expanded inside the pod
gunzip -c "$FILE" | kubectl exec -i -n "$NAMESPACE" "$POD" -- sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 --single-transaction -q' > /dev/null
echo "Restored."
