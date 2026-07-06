#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8001}"

PID="$(lsof -ti tcp:"$PORT" || true)"
if [ -z "$PID" ]; then
  echo "Nothing listening on port ${PORT}."
  exit 0
fi

kill "$PID"
echo "Stopped server on port ${PORT} (pid ${PID})."
