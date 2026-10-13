#!/usr/bin/env sh
# Полный цикл демо: проект → билд1 (new) → approve → билд2 (unchanged/diff)
set -eu

BASE="${DRIFTWATCH_URL:-http://localhost:3000}"
APP_URL="${DEMO_APP_URL:-http://localhost:8080}"

json() {
  python3 -c "import json,sys; d=json.load(sys.stdin); print(eval(sys.argv[1]))" "$1"
}

echo '== 1. создаю проект (demo-%RANDOM%)'
KEY=$(curl -fsS -X POST "$BASE/api/v1/projects" \
  -H 'content-type: application/json' \
  -d '{"name":"demo-'"$(date +%s)"'"}' | json 'd["apiKey"]')
echo "   api key: $KEY"

create_build() {
  curl -fsS -X POST "$BASE/api/v1/builds" \
    -H 'content-type: application/json' -H "x-api-key: $KEY" \
    -d "{\"captures\":[{\"name\":\"home\",\"url\":\"$APP_URL\",\"maskSelectors\":[\".timestamp\"]}]}" \
    | json 'd["build"]["id"]'
}

echo '== 2. билд №1 (все снапшоты -> new)'
B1=$(create_build)
echo "   build: $B1  (ждём захвата ~5с)"
sleep 5
SNAP=$(curl -fsS -H "x-api-key: $KEY" "$BASE/api/v1/builds/$B1" | json 'd["snapshots"][0]["id"]')
echo "   snapshot: $SNAP"

echo '== 3. approve -> это baseline'
curl -fsS -X POST -H 'content-type: application/json' -H "x-api-key: $KEY" \
  -d '{"review":"approved"}' "$BASE/api/v1/snapshots/$SNAP/review"
echo

echo '== 4. билд №2 (должен быть unchanged, diff 0%)'
B2=$(create_build)
echo "   build: $B2  (ждём ~5с)"
sleep 5
curl -fsS -H "x-api-key: $KEY" "$BASE/api/v1/builds/$B2" |
  python3 -c 'import json,sys
d=json.load(sys.stdin); s=d["snapshots"][0]
print("   build=%-8s snapshot=%-10s diff=%s" % (d["build"]["status"], s["status"], s["diffPercent"]))
print("   смотрите картинки:", s["screenshotUrl"])'

echo '== готово. теперь поменяйте --accent в demo-app/style.css и запустите smoke ещё раз (билд №2 станет changed)'