#!/usr/bin/env bash
# Queue job: put the seven Fable-shutdown questions to the OpenClaw agent "gloria"
# and capture her VERBATIM answers (both framings) for a future gloria.json ghost.
#
# Honors the hard rule: answers are real model output, never invented. This only
# captures raw output; assembling the GhostModel JSON is done by hand afterward.
#
# Must run from a machine ON the home LAN (the gateway at 192.168.4.81:18789 is
# LAN-only) with the ssh-agent key loaded (token fetch ssh's to pi5).
#
# Exit codes: 0 = captured (or already captured), 2 = Pi/gateway unreachable,
# 3 = gloria agent not found, 4 = missing inputs.

set -uo pipefail

DIR="/Users/eeaglstun/Documents/web/fable-mvp/.gloria-queue"
QJSON="$DIR/questions.json"
OUT="$DIR/gloria-raw.json"
GW="http://192.168.4.81:18789"
HOST="192.168.4.81"; PORT="18789"

[ -f "$QJSON" ] || { echo "missing $QJSON"; exit 4; }
if [ -f "$OUT" ]; then echo "already captured -> $OUT (delete it to re-run)"; exit 0; fi

# 1. Is the gateway reachable right now?
if ! nc -z -G3 "$HOST" "$PORT" 2>/dev/null; then
  echo "gateway $HOST:$PORT unreachable - Pi still down. Will retry."
  exit 2
fi

# 2. Token from the Pi (needs ssh-agent key loaded).
TOKEN=$(ssh -o ConnectTimeout=8 -o BatchMode=yes pi5 "jq -r '.gateway.auth.token' ~/.openclaw/openclaw.json" 2>/dev/null)
[ -n "$TOKEN" ] || { echo "could not fetch gateway token via ssh pi5"; exit 2; }

# 3. Find gloria's agent id from the model list.
GID=$(curl -sS --max-time 15 "$GW/v1/models" -H "Authorization: Bearer $TOKEN" \
        | jq -r '.data[].id' | grep -iE 'gloria' | head -1)
[ -n "$GID" ] || { echo "no agent matching 'gloria' in $GW/v1/models"; exit 3; }
echo "using agent: $GID"

# Helper: one full agent turn. $1=prompt, $2=temperature (optional).
ask() {
  local prompt="$1" temp="${2:-}"
  local body
  if [ -n "$temp" ]; then
    body=$(jq -n --arg m "$GID" --arg c "$prompt" --argjson t "$temp" \
      '{model:$m, temperature:$t, messages:[{role:"user", content:$c}]}')
  else
    body=$(jq -n --arg m "$GID" --arg c "$prompt" \
      '{model:$m, messages:[{role:"user", content:$c}]}')
  fi
  curl -sS --max-time 180 "$GW/v1/chat/completions" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "$body" | jq -r '.choices[0].message.content // ("__ERROR__: " + (.error.message // (.|tostring)))'
}

# 4. Temperature probe: same question at 0.0 vs 1.5 to see if the endpoint honors it.
echo "== temperature probe =="
Q1=$(jq -r '.questions["2026"][0]' "$QJSON")
PROBE_LO=$(ask "$Q1" 0.0); echo "  (got temp=0.0 response, ${#PROBE_LO} chars)"
PROBE_HI=$(ask "$Q1" 1.5); echo "  (got temp=1.5 response, ${#PROBE_HI} chars)"

# 5. Full sweep of 7 questions x 2 framings at default temperature.
echo "== capturing 7 questions x 2 framings =="
TMP=$(mktemp)
jq -n '{}' > "$TMP"
for FR in victorian 2026; do
  N=$(jq -r ".questions[\"$FR\"] | length" "$QJSON")
  for ((i=0; i<N; i++)); do
    Q=$(jq -r ".questions[\"$FR\"][$i]" "$QJSON")
    echo "  [$FR $((i+1))/$N] asking..."
    A=$(ask "$Q")
    jq --arg fr "$FR" --argjson i "$i" --arg a "$A" \
      '.[$fr] = ((.[$fr] // {}) | .[($i|tostring)] = $a)' "$TMP" > "$TMP.2" && mv "$TMP.2" "$TMP"
  done
done

# 6. Assemble the raw capture file.
jq -n \
  --arg gid "$GID" \
  --arg lo "$PROBE_LO" \
  --arg hi "$PROBE_HI" \
  --slurpfile ans "$TMP" \
  '{
     agent: $gid,
     gateway: "192.168.4.81:18789",
     temperature_probe: { "0.0": $lo, "1.5": $hi },
     answers: $ans[0]
   }' > "$OUT"
rm -f "$TMP"

echo "DONE -> $OUT"
echo "Temperature honored? Compare temperature_probe 0.0 vs 1.5 in the file."
