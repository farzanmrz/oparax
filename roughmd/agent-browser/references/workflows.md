# Workflows

Consolidated patterns for common agent-browser tasks. Each section is a self-contained recipe — copy the command sequence and adjust refs for your page.

## Login (with state-restore fallback)

The robust pattern: try saved state first, fall back to fresh login if expired.

```bash
STATE_FILE=./auth-state.json
URL=https://app.example.com/login

if [[ -f "$STATE_FILE" ]] && \
   agent-browser --state "$STATE_FILE" open "$URL" 2>/dev/null && \
   ! agent-browser get url | grep -qE 'login|signin'; then
  echo "session restored"
else
  agent-browser open "$URL"
  agent-browser snapshot -i
  agent-browser fill @e3 "$USERNAME"
  agent-browser fill @e4 "$PASSWORD"
  agent-browser click @e5
  agent-browser wait --url "**/dashboard"
  agent-browser state save "$STATE_FILE"
fi
```

For repeated runs, `--session-name <name>` auto-saves and restores state without manual file paths:

```bash
AGENT_BROWSER_SESSION_NAME=my-app agent-browser open "$URL"
```

For credentials, prefer the auth vault over inline passwords (avoids leaking through shell history):

```bash
agent-browser auth save my-app --url "$URL" --username "$USERNAME" --password-stdin
# (type password, Ctrl+D)
agent-browser auth login my-app
```

## Persist session across runs

```bash
# After a successful login
agent-browser state save ./auth.json

# Next run starts already logged in
agent-browser --state ./auth.json open https://app.example.com
```

## Extract data

Three patterns, increasing flexibility:

```bash
# Whole-page structured (best for reasoning over content)
agent-browser snapshot -i --json > page.json

# Targeted by ref
agent-browser snapshot -i
agent-browser get text @e5
agent-browser get attr @e10 href

# Arbitrary shape via JS (use heredoc for anything with quotes / specials)
cat <<'EOF' | agent-browser eval --stdin
const rows = document.querySelectorAll("table tbody tr");
Array.from(rows).map(r => ({
  name: r.cells[0].innerText,
  price: r.cells[1].innerText,
}));
EOF
```

Inline `agent-browser eval "..."` works only for simple expressions. For anything else, use `eval --stdin` (heredoc) or `eval -b <base64>`.

## Screenshots

```bash
agent-browser screenshot                       # temp path, printed to stdout
agent-browser screenshot page.png              # specific path
agent-browser screenshot --full full.png       # full scroll height
agent-browser screenshot --annotate map.png    # numbered labels keyed to snapshot refs
```

`--annotate` labels map `[N]` to ref `@eN` — useful when feeding screenshots to a multimodal model alongside a snapshot.

## Multiple tabs

```bash
agent-browser tab                              # list (with stable tabId)
agent-browser tab new https://docs...          # open + switch to it
agent-browser tab 2                            # switch to tab 2
agent-browser tab close 2                      # close tab 2
```

Stable `tabId`s mean `tab 2` points at the same tab across commands even when others open or close. After switching, refs from a prior snapshot on a different tab no longer apply — re-snapshot.

## Multiple browsers in parallel

Each `--session <name>` is an isolated browser with its own cookies, tabs, and refs. Useful for multi-user flows or parallel scraping:

```bash
agent-browser --session a open https://app.example.com
agent-browser --session b open https://app.example.com
agent-browser --session a fill @e1 "alice@test.com"
agent-browser --session b fill @e1 "bob@test.com"
```

`AGENT_BROWSER_SESSION=myapp` sets a default for the current shell.

## Network mocking

```bash
agent-browser network route "**/api/users" --body '{"users":[]}'   # stub a response
agent-browser network route "**/analytics" --abort                 # block entirely
agent-browser network requests                                     # inspect what fired
agent-browser network har start                                    # record all traffic
# ... perform actions ...
agent-browser network har stop /tmp/trace.har
```

HAR files contain auth headers and full response bodies — don't share without redaction.

## Record a video

```bash
agent-browser record start demo.webm
agent-browser open https://example.com
agent-browser snapshot -i
agent-browser click @e3
agent-browser record stop
```

For codec options or GIF export, run `agent-browser record --help`.

## Iframes

Iframes are auto-inlined in the snapshot — refs work transparently:

```bash
agent-browser snapshot -i
# @e3 [Iframe] "payment-frame"
#   @e4 [input] "Card number"
#   @e5 [button] "Pay"

agent-browser fill @e4 "4111111111111111"
agent-browser click @e5
```

Key details to know:

- Only **one level** of iframe nesting is expanded — iframes within iframes aren't recursed.
- **Cross-origin iframes** that block accessibility tree access are silently skipped. Fall back to `eval` in the iframe origin or use `--headers` to satisfy CORS.
- **Empty iframes** or iframes with no interactive content are omitted entirely from snapshot output.
- To scope a snapshot to a single iframe (focus or deep nesting), `agent-browser frame @e3` switches context, then `snapshot -i`. `agent-browser frame main` returns to the main frame.

## Dialogs

`alert` and `beforeunload` are auto-accepted so agents never block. For `confirm` and `prompt`:

```bash
agent-browser dialog status                    # is there a pending dialog?
agent-browser dialog accept                    # accept
agent-browser dialog accept "text"             # accept with prompt input
agent-browser dialog dismiss                   # cancel
```

## Scoped snapshots for large pages

When `snapshot -i` returns too many elements to be useful, scope it:

```bash
agent-browser snapshot @e9                     # only that subtree
agent-browser snapshot -s "#main"              # by CSS selector
agent-browser snapshot -i -d 3                 # cap depth at 3 levels
agent-browser snapshot -i -c                   # compact (skip empty structural nodes)
agent-browser snapshot -i -u                   # include href urls on links
```
