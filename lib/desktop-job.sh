#!/usr/bin/env bash
# The SDK runs "boot" detached. State belongs to the workspace's private computer.
set -euo pipefail
umask 077
mode=$1
request=$2
origin=$3
destination=$4
attempt=${5:-0}
[[ $request =~ ^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$ ]] || exit 2
[[ $attempt =~ ^[0-9]+$ ]] || exit 2
case "$destination" in
  about:blank|https://www.linkedin.com/feed/|https://www.linkedin.com/sales/home) ;;
  *) exit 2 ;;
esac
root=${OPARAX_DESKTOP_STATE_DIR:-"$HOME/.oparax"}
jobs="$root/desktop-jobs"
job="$jobs/$request"
scripts=$(dirname "$(realpath "${BASH_SOURCE[0]}")")
release=$(basename "$scripts")
mkdir -p "$jobs"
exec 8>"$jobs/lock"
flock -w 4 8
now=$(date +%s)
boot_id=$(cat /proc/sys/kernel/random/boot_id)
get() { if [[ -f $1 ]]; then cat "$1"; fi; }
put() { printf '%s\n' "$2" > "$1.tmp"; mv -f "$1.tmp" "$1"; }
in_flight() {
  local dir=$1 phase changed age pid
  [[ $(get "$dir/machine") == "$boot_id" ]] || return 1
  phase=$(get "$dir/phase")
  changed=$(get "$dir/changed")
  [[ $changed =~ ^[0-9]+$ ]] || return 1
  age=$((now - changed))
  if [[ $phase == queued ]]; then (( age >= 0 && age < 18 )); return; fi
  [[ $phase == running ]] && (( age >= 0 && age < 1220 )) || return 1
  pid=$(get "$dir/pid")
  [[ $pid =~ ^[1-9][0-9]*$ ]] && kill -0 "$pid" 2>/dev/null &&
    tr '\0' '\n' < "/proc/$pid/cmdline" | grep -Fx "$(basename "$dir")" >/dev/null
}
healthy() {
  curl --fail --silent --max-time 2 http://127.0.0.1:6080/healthz >/dev/null &&
    timeout 2 bash -c 'exec 3<>/dev/tcp/127.0.0.1/5900; IFS= read -r b <&3; [[ $b == RFB* ]]' 2>/dev/null &&
    DISPLAY=:99 XAUTHORITY="$root/xauthority" xwininfo -root -tree 2>/dev/null | grep -i 'google-chrome' >/dev/null
}
active=$(get "$jobs/active")

if [[ $mode == inspect ]]; then
  if [[ -d $job && $active != "$request" ]]; then echo superseded; exit 0; fi
  if [[ ! -d $job ]]; then
    if [[ -n $active ]] && in_flight "$jobs/$active"; then echo starting; exit 0; fi
    mkdir "$job"
    put "$jobs/active" "$request"
    put "$job/destination" "$destination"
    put "$job/attempt" 0
  fi
  [[ $(get "$job/destination") == "$destination" ]] || { echo superseded; exit 0; }
  phase=$(get "$job/phase")
  if [[ $(get "$job/origin") == "$origin" && $(get "$job/machine") == "$boot_id" ]]; then
    if [[ $phase == ready && $(get "$job/release") == "$release" ]] && healthy; then echo ready; exit 0; fi
    if in_flight "$job"; then echo starting; exit 0; fi
  fi
  count=$(get "$job/attempt")
  # Existing warm machines can have a ready marker written by an older release.
  # Once its worker finishes, install the new policy without touching the profile.
  if [[ $(get "$job/release") != "$release" ]]; then count=0; fi
  if (( count >= 2 )); then put "$job/phase" failed; echo failed; exit 0; fi
  count=$((count+1))
  put "$job/release" "$release"
  put "$job/origin" "$origin"
  put "$job/machine" "$boot_id"
  put "$job/changed" "$now"
  put "$job/attempt" "$count"
  put "$job/phase" queued
  echo "launch $count"
  exit 0
fi

[[ $mode == boot && $active == "$request" && $(get "$job/attempt") == "$attempt" &&
   $(get "$job/phase") == queued && $(get "$job/release") == "$release" && $(get "$job/destination") == "$destination" &&
   $(get "$job/origin") == "$origin" && $(get "$job/machine") == "$boot_id" ]] || exit 0
put "$job/pid" "$$"
put "$job/changed" "$now"
put "$job/phase" running
flock -u 8
exec 8>&-
result=failed
if timeout -k 5s 1200s bash "$scripts/desktop-start.sh" "$origin" "$destination" >/dev/null 2>&1 && healthy; then result=ready; fi
exec 8>"$jobs/lock"
flock -w 5 8
if [[ $(get "$jobs/active") == "$request" && $(get "$job/attempt") == "$attempt" && $(get "$job/release") == "$release" ]]; then
  put "$job/changed" "$(date +%s)"
  put "$job/phase" "$result"
fi
