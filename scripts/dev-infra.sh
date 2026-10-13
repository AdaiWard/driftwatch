#!/usr/bin/env sh
# (Re)starts local dev infra without docker/sudo:
#  - Postgres 17 cluster owned by the user, .data/pg, port 5433
#  - redis-server extracted from Debian .debs into /tmp/dw-redis (port 6379)
# Safe to run repeatedly.
set -eu
cd "$(dirname "$0")/.."
ROOT="$PWD"
PGBIN=/usr/lib/postgresql/17/bin

# ── postgres ────────────────────────────────────────────────────────────
[ -d .data/pg ] || {
  mkdir -p .data
  "$PGBIN/initdb" -D .data/pg -U driftwatch --auth=trust -E UTF8 > .data/initdb.log
}
"$PGBIN/pg_ctl" -D "$ROOT/.data/pg" -l "$ROOT/.data/pg.log" \
  -o "-p 5433 -k $ROOT/.data" start >/dev/null 2>&1 || \
  echo "[infra] postgres already running (5433)"

"$PGBIN/psql" -h localhost -p 5433 -U driftwatch -d postgres -tc \
  "select 1 from pg_database where datname = 'driftwatch'" | grep -q 1 || \
  "$PGBIN/createdb" -h localhost -p 5433 -U driftwatch driftwatch

# ── redis (extracted from apt debs, no root) ────────────────────────────
REDIS=/tmp/dw-redis/root/usr/bin/redis-server
if [ ! -x "$REDIS" ]; then
  echo "[infra] extracting redis from .debs..."
  mkdir -p /tmp/dw-redis
  ( cd /tmp/dw-redis &&
    apt-get download redis-tools liblzf1 >/dev/null &&
    dpkg -x redis-tools*.deb root && dpkg -x liblzf1*.deb root )
fi
REDISLIB=/tmp/dw-redis/root/usr/lib/x86_64-linux-gnu
if ! LD_LIBRARY_PATH="$REDISLIB" /tmp/dw-redis/root/usr/bin/redis-cli ping 2>/dev/null | grep -q PONG; then
  LD_LIBRARY_PATH="$REDISLIB" "$REDIS" --port 6379 --save '' --appendonly no --daemonize yes
  echo "[infra] redis started (6379)"
else
  echo "[infra] redis already running (6379)"
fi

echo "[infra] ready:  postgres :5433/driftwatch  ·  redis :6379"