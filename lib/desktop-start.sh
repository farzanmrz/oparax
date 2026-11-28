#!/usr/bin/env bash
set -euo pipefail
umask 077
export DISPLAY=:99
state="$HOME/.oparax"
mkdir -p "$state/chrome"
# Serialize duplicate opens within one machine, including requests served from other functions.
exec 9>"$state/desktop-start.lock"
flock -w 180 9
scripts=$(dirname "$(realpath "${BASH_SOURCE[0]}")")
origin=$1
destination=$2
case "$destination" in
  about:blank|https://www.linkedin.com/feed/|https://www.linkedin.com/sales/home) ;;
  *) exit 2 ;;
esac
if ! command -v google-chrome-stable >/dev/null || ! command -v x11vnc >/dev/null || ! test -f /usr/share/novnc/vnc.html || ! test -d /usr/share/nodejs/ws; then
  sudo apt-get -qq update
  sudo env DEBIAN_FRONTEND=noninteractive apt-get -qq install -y --no-install-recommends xvfb xauth x11-utils x11vnc openbox novnc node-ws ca-certificates curl openssl
  if ! command -v google-chrome-stable >/dev/null; then
    package=$(mktemp --suffix=.deb)
    trap 'rm -f -- "$package"' EXIT
    curl --fail --silent --show-error --location --proto '=https' --proto-redir '=https' 'https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb' -o "$package"
    sudo env DEBIAN_FRONTEND=noninteractive apt-get -qq install -y --no-install-recommends "$package"
  fi
fi
# Chrome watches managed policies on Linux. Apply this on cold and warm opens,
# independently of the one-time OS package install. The Web Store verifies and
# updates the signed extension; the owner interacts with it in Chrome.
policy_dir=/etc/opt/chrome/policies/managed
policy_path="$policy_dir/oparax-1password.json"
password_manager_policy=$(cat <<'POLICY'
{
  "ExtensionSettings": {
    "aeblfdkhhhdcdjpifhhbdiojplfjncoa": {
      "installation_mode": "force_installed",
      "update_url": "https://clients2.google.com/service/update2/crx",
      "toolbar_pin": "force_pinned"
    }
  }
}
POLICY
)
if ! cmp -s "$policy_path" <(printf '%s\n' "$password_manager_policy"); then
  sudo install -d -o root -g root -m 0755 "$policy_dir"
  printf '%s\n' "$password_manager_policy" | sudo tee "$policy_dir/.oparax-1password.next" >/dev/null
  sudo chmod 0644 "$policy_dir/.oparax-1password.next"
  sudo mv -fT "$policy_dir/.oparax-1password.next" "$policy_path"
fi
export XAUTHORITY="$state/xauthority"
if ! xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; then
  touch "$XAUTHORITY"
  xauth -f "$XAUTHORITY" add "$DISPLAY" . "$(openssl rand -hex 16)"
  nohup Xvfb "$DISPLAY" -nolisten tcp -auth "$XAUTHORITY" -screen 0 1280x800x24 </dev/null >/dev/null 2>&1 9>&- &
  for _ in {1..45}; do xdpyinfo -display "$DISPLAY" >/dev/null 2>&1 && break; sleep .2; done
  xdpyinfo -display "$DISPLAY" >/dev/null
  nohup openbox </dev/null >/dev/null 2>&1 9>&- &
fi
# X traffic is local, and the RFB socket has no public route. Only the authenticated gateway is exposed.
if ! timeout 2 bash -c 'exec 3<>/dev/tcp/127.0.0.1/5900; IFS= read -r banner <&3; [[ $banner == RFB* ]]' 2>/dev/null; then
  nohup x11vnc -display "$DISPLAY" -auth "$XAUTHORITY" -listen 127.0.0.1 -localhost -rfbport 5900 -forever -shared -nopw -noxdamage </dev/null >/dev/null 2>&1 9>&- &
fi
# Only fixed provider landing URLs are passed to the standard browser. Browser confinement remains enabled.
# A restored private disk can retain Chromium's lock from the previous VM hostname.
# Remove stale launcher locks only when this VM has no process using its browser profile.
if [[ -L "$state/chrome/SingletonLock" ]] && ! pgrep -f -- "--user-data-dir=$state/chrome( |$)" >/dev/null; then
  rm -f -- "$state/chrome/SingletonLock" "$state/chrome/SingletonSocket" "$state/chrome/SingletonCookie"
fi
nohup google-chrome-stable --user-data-dir="$state/chrome" --disable-dev-shm-usage --no-first-run --no-default-browser-check --start-maximized "$destination" </dev/null >/dev/null 2>&1 9>&- &
# Chrome presents a native, owner-visible window. Refuse success if it dies during launch.
for _ in {1..60}; do
  if xwininfo -root -tree 2>/dev/null | grep -i 'google-chrome' >/dev/null; then break; fi
  sleep .25
done
if ! xwininfo -root -tree 2>/dev/null | grep -i 'google-chrome' >/dev/null; then exit 3; fi
if ! curl --silent --fail --max-time 2 http://127.0.0.1:6080/healthz >/dev/null; then
  nohup env OPARAX_DESKTOP_ORIGIN="$origin" node "$scripts/desktop-proxy.cjs" </dev/null >/dev/null 2>&1 9>&- &
fi
for _ in {1..30}; do
  if curl --silent --fail --max-time 2 http://127.0.0.1:6080/healthz >/dev/null && timeout 2 bash -c 'exec 3<>/dev/tcp/127.0.0.1/5900; IFS= read -r banner <&3; [[ $banner == RFB* ]]' 2>/dev/null; then exit 0; fi
  sleep .25
done
exit 4
