#!/usr/bin/env bash
# Close the plan gate: put the approved plan on the issue and land on ft/<issue>.
#
# Usage:
#   start.sh "<issue title>" [<plan-body-file>]
#   start.sh --issue <N> [<plan-body-file>]   # plan an existing issue
#
# With no plan file (or "-"), the approved plan is read from stdin. stdout is one
# machine-readable line: the issue number. All Git/GitHub chatter goes to stderr.
#
# Feature slices always run on ft/<issue#> (app code never lands directly on
# beta — owner instruction-file micro-edits are the one carve-out; see
# feature/SKILL.md) and there is no persisted run state. A slice is
# identified by its branch, which is the only marker QC needs
# (`origin/beta...ft/<N>`). ship.sh always lands on beta; the terminal release
# target (beta or main) lives only in the conversation and is applied by
# feature-ship/SKILL.md's promotion step after ship.sh returns — it is never
# passed into this script or into ship.sh.
#
# ADOPTION-AWARE (2026-08-04): the owner routinely pre-cuts a branch and a stub
# issue before /feature-plan, so create-only behavior sent every session into
# workaround mode. Branch resolution now goes, in order: already on ft/N →
# adopt in place; local or remote ft/N exists → switch to it; current branch is
# ft/N-<anything> (cut for this issue, off-convention) → rename it to ft/N
# local+remote; nothing exists → create from fetched origin/beta. An adopted
# branch with ZERO commits unique against origin/beta is fast-forwarded onto
# it; one with unique commits keeps its base untouched (said on stderr). The
# clean-tree requirement applies ONLY when the resolution must switch or
# create — updating an issue body needs no clean tree.
#
# UNWRAP (2026-08-04): GitHub renders every newline in an issue body as a hard
# break, so hard-wrapped prose reads ragged at half width. Paragraph lines are
# joined before posting; fences, tables, headings, and list structure are kept.
set -euo pipefail

usage() {
  echo 'usage: start.sh "<title>" [<plan-body-file>]' >&2
  echo '       start.sh --issue <N> [<plan-body-file>]   # plan an existing issue' >&2
  exit 2
}

graduate_issue=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --issue)
      shift
      graduate_issue="${1:-}"
      [ -n "$graduate_issue" ] || { echo "start: --issue needs a number" >&2; usage; }
      shift
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "start: unknown option: $1" >&2
      usage
      ;;
    *)
      break
      ;;
  esac
done

# Graduating an existing issue: title comes from the issue itself, so args are
# just the optional plan file. New issue: title is the first arg.
if [ -n "$graduate_issue" ]; then
  [ "$#" -le 1 ] || usage
  title=""
  body="${1:--}"
else
  [ "$#" -ge 1 ] && [ "$#" -le 2 ] || usage
  title="$1"
  body="${2:--}"
fi

bodyfile_is_temp="false"
if [ "$body" = "-" ]; then
  bodyfile="$(mktemp "${TMPDIR:-/tmp}/oparax-feature-plan.XXXXXX")"
  bodyfile_is_temp="true"
  cat > "$bodyfile"
  [ -s "$bodyfile" ] || {
    rm -f "$bodyfile"
    echo "start: empty approved plan on stdin." >&2
    exit 1
  }
else
  [ -f "$body" ] || {
    echo "start: plan body file not found: $body" >&2
    exit 1
  }
  bodyfile="$body"
fi

# Join hard-wrapped paragraph prose into single lines for GitHub's issue
# renderer. Structure survives untouched: fenced code blocks, tables, headings,
# horizontal rules, and list items (a list item plus its indented continuation
# lines joins into ONE line, preserving the marker).
unwrapped="$(mktemp "${TMPDIR:-/tmp}/oparax-feature-plan-unwrapped.XXXXXX")"
python3 - "$bodyfile" "$unwrapped" <<'PYEOF'
import re, sys
src, dst = sys.argv[1], sys.argv[2]
lines = open(src).read().split("\n")
out, buf, fence = [], [], False
STRUCT = re.compile(r"^(#{1,6} |>|\||[-*+] |\d+[.)] |---\s*$|===\s*$|```|~~~)")
LIST = re.compile(r"^(\s*)([-*+] |\d+[.)] )")

def flush():
    if buf:
        out.append(" ".join(s.strip() for s in buf))
        buf.clear()

i = 0
while i < len(lines):
    line = lines[i]
    if line.lstrip().startswith(("```", "~~~")):
        flush(); fence = not fence; out.append(line); i += 1; continue
    if fence:
        out.append(line); i += 1; continue
    if line.strip() == "":
        flush(); out.append(line); i += 1; continue
    if LIST.match(line):
        flush()
        item = [line.rstrip()]
        while i + 1 < len(lines):
            nxt = lines[i + 1]
            if nxt.strip() == "" or LIST.match(nxt) or STRUCT.match(nxt.strip()) or not nxt.startswith((" ", "\t")):
                break
            item.append(nxt.strip()); i += 1
        out.append(" ".join(item)); i += 1; continue
    if STRUCT.match(line.strip()) and not LIST.match(line):
        flush(); out.append(line); i += 1; continue
    buf.append(line); i += 1
flush()
open(dst, "w").write("\n".join(out))
PYEOF

cleanup_bodyfile() {
  if [ "$bodyfile_is_temp" = "true" ]; then
    rm -f "$bodyfile"
  fi
  rm -f "$unwrapped"
}
trap cleanup_bodyfile EXIT

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[ -n "$repo_root" ] || {
  echo "start: run from inside the repository." >&2
  exit 1
}
cd "$repo_root"

require_clean_tree() {
  # `git diff` alone misses untracked files, which could otherwise hitchhike
  # into the slice.
  if [ -n "$(git status --porcelain --untracked-files=all)" ]; then
    echo "start: working tree is not clean (including untracked files) — commit or stash it before a branch switch/create." >&2
    exit 1
  fi
}

# Refresh only the base ref. Never checkout local beta: it may legitimately be
# checked out in another worktree.
git fetch --prune origin beta >&2
git rev-parse --verify --quiet refs/remotes/origin/beta >/dev/null || {
  echo "start: origin/beta is unavailable after fetch." >&2
  exit 1
}
fetched_beta_sha="$(git rev-parse refs/remotes/origin/beta)"

# ---- Resolve the branch action BEFORE touching the issue, so a precondition
# failure leaves GitHub untouched. Actions: stay | switch-local | switch-remote
# | rename-current | create.
branch_action="create"
current_branch="$(git branch --show-current || true)"
if [ -n "$graduate_issue" ]; then
  target="ft/${graduate_issue}"
  git fetch --prune origin "+refs/heads/${target}:refs/remotes/origin/${target}" >/dev/null 2>&1 || true
  if [ "$current_branch" = "$target" ]; then
    branch_action="stay"
  elif git show-ref --verify --quiet "refs/heads/${target}"; then
    branch_action="switch-local"
  elif git rev-parse --verify --quiet "refs/remotes/origin/${target}" >/dev/null; then
    branch_action="switch-remote"
  elif [ -n "$current_branch" ] && [[ "$current_branch" == "${target}-"* ]]; then
    branch_action="rename-current"
  fi
  case "$branch_action" in
    switch-local|switch-remote|create) require_clean_tree ;;
  esac
else
  require_clean_tree
fi

# Graduating an existing issue: overwrite its body with the approved plan, no
# new issue created. Otherwise create the issue only after every local/base
# precondition passes — if branch setup then fails, the newly-created issue is
# closed below so a failed kickoff leaves no orphan tracker record.
if [ -n "$graduate_issue" ]; then
  gh issue view "$graduate_issue" --json number >/dev/null 2>&1 || {
    echo "start: issue #$graduate_issue not found." >&2
    exit 1
  }
  gh issue edit "$graduate_issue" --body-file "$unwrapped" >&2 || {
    echo "start: could not update issue #$graduate_issue with the plan." >&2
    exit 1
  }
  issue="$graduate_issue"
else
  url="$(gh issue create --title "$title" --body-file "$unwrapped")"
  issue="$(printf '%s\n' "$url" | grep -oE '/issues/[0-9]+' | head -n1 | grep -oE '[0-9]+' || true)"
  [ -n "$issue" ] || {
    echo "start: could not parse issue number from: $url" >&2
    exit 1
  }
fi

branch="ft/${issue}"
case "$branch_action" in
  stay)
    echo "start: already on $branch — adopted in place." >&2
    ;;
  switch-local)
    git switch "$branch" >&2
    echo "start: adopted existing local $branch." >&2
    ;;
  switch-remote)
    git switch --track "origin/${branch}" >&2 || git switch -c "$branch" "origin/${branch}" >&2
    echo "start: adopted existing remote $branch." >&2
    ;;
  rename-current)
    git branch -m "$current_branch" "$branch" >&2
    echo "start: renamed $current_branch -> $branch (off-convention cut for this issue)." >&2
    if git rev-parse --verify --quiet "refs/remotes/origin/${current_branch}" >/dev/null; then
      git push origin ":refs/heads/${current_branch}" >&2 || \
        echo "start: could not delete origin/${current_branch} — remove it manually." >&2
    fi
    ;;
  create)
    if ! git switch --create "$branch" --no-track "$fetched_beta_sha" >&2; then
      # Only auto-close an issue THIS run created — never a pre-existing graduated one.
      if [ -z "$graduate_issue" ]; then
        close_note="Feature kickoff could not create $branch from origin/beta. Closing this automatically-created issue so it is not orphaned."
        if ! gh issue close "$issue" --reason "not planned" --comment "$close_note" >&2; then
          echo "start: branch setup failed, and issue #$issue could not be closed automatically." >&2
        fi
      fi
      echo "start: failed to create $branch from origin/beta." >&2
      exit 1
    fi
    ;;
esac

# An adopted branch with no unique commits is really just "old beta" — bring it
# to the fetched base so the slice starts current. Unique commits = base stays.
if [ "$branch_action" != "create" ]; then
  if [ "$(git rev-list --count "origin/beta..${branch}" 2>/dev/null || echo 1)" = "0" ]; then
    if [ -z "$(git status --porcelain --untracked-files=all)" ]; then
      git merge --ff-only "$fetched_beta_sha" >&2 && \
        echo "start: fast-forwarded $branch onto origin/beta (no unique commits)." >&2 || true
    else
      echo "start: $branch has no unique commits but the tree is dirty — skipped the fast-forward onto origin/beta." >&2
    fi
  else
    echo "start: $branch has unique commits — base left untouched." >&2
  fi
  # Ensure the branch exists on origin so QC/hop-anywhere can see it.
  if ! git rev-parse --verify --quiet "refs/remotes/origin/${branch}" >/dev/null; then
    git push -u origin "$branch" >&2 || echo "start: could not push $branch — push it manually." >&2
  elif [ -z "$(git for-each-ref --format='%(upstream:short)' "refs/heads/${branch}")" ]; then
    git branch --set-upstream-to="origin/${branch}" "$branch" >&2 || true
  fi
fi

echo "$issue"
