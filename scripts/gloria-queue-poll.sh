#!/usr/bin/env bash
# launchd poller for the gloria seance capture. Runs the capture script; once it
# succeeds (raw output exists), notifies and unloads its own LaunchAgent so it
# stops polling. While the Pi is down the capture exits 2 and we just try again
# next interval.

LABEL="com.eric.gloria-seance"
DIR="/Users/eeaglstun/Documents/web/fable-mvp/.gloria-queue"
LOG="$DIR/poll.log"
OUT="$DIR/gloria-raw.json"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] poll" >> "$LOG"
/Users/eeaglstun/Documents/web/fable-mvp/scripts/gloria-seance-capture.sh >> "$LOG" 2>&1
rc=$?
echo "[$(date '+%Y-%m-%d %H:%M:%S')] capture exit=$rc" >> "$LOG"

if [ "$rc" -eq 0 ] && [ -f "$OUT" ]; then
  osascript -e 'display notification "Gloria answered the seven questions. Ready to build the ghost." with title "fable-mvp queue"' 2>/dev/null
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] success - unloading $LABEL" >> "$LOG"
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null
fi
