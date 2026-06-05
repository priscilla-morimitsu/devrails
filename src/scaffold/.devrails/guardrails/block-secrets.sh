#!/usr/bin/env bash
#
# devrails :: block-secrets
#
# Usage: block-secrets.sh <file> [<file> ...]
# Scans the given files for hardcoded secrets and secrets leaking into
# client-reachable code. Reports every matching line with its line number.
# Exit 0 = clean, exit 1 = violations found.
#
# This runs from `devrails check` (git hook / CI) and `devrails audit`.

set -uo pipefail

violations=0
report() { echo "  [block-secrets] $1" >&2; violations=$((violations+1)); }

# scan <file> <grep-pattern> <message>
# Finds every matching line in the file and reports each one individually.
scan() {
  local f="$1" pattern="$2" msg="$3" lineno
  while IFS= read -r lineno; do
    [ -n "$lineno" ] && report "$f:$lineno: $msg"
  done < <(grep -niE "$pattern" "$f" 2>/dev/null | grep -v '^\s*//' | cut -d: -f1 || true)
}

for f in "$@"; do
  [ -f "$f" ] || continue
  case "$f" in
    *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.env*|*.json|*.yml|*.yaml|*.py|*.go|*.rb) ;;
    *) continue ;;
  esac

  scan "$f" \
    "(api[_-]?key|secret|client[_-]?secret|access[_-]?token|auth[_-]?token|private[_-]?key|password|passwd)[\"'][[:space:]]*[:=][[:space:]]*[\"'][^\"']{8,}" \
    "hardcoded credential (key/secret/token/password assigned a literal value)."

  scan "$f" \
    "(AKIA|ASIA)[A-Z0-9]{16}" \
    "possible AWS access key ID."

  scan "$f" \
    "sk-[A-Za-z0-9]{20,}" \
    "possible API secret key (sk-... pattern)."

  scan "$f" \
    "-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----" \
    "private key material embedded in source."

  scan "$f" \
    "gh[pousr]_[A-Za-z0-9]{30,}" \
    "possible GitHub token."

  scan "$f" \
    "NEXT_PUBLIC_[A-Z0-9_]*(SECRET|KEY|TOKEN|PASSWORD|PRIVATE)" \
    "secret exposed via NEXT_PUBLIC_ variable (reaches the browser)."

  if grep -q '"use client"' "$f" 2>/dev/null; then
    scan "$f" \
      "process\.env\.[A-Z0-9_]*(SECRET|KEY|TOKEN|PASSWORD|PRIVATE)" \
      'server secret (process.env) referenced inside a "use client" component.'
  fi
done

if [ "$violations" -gt 0 ]; then
  echo "block-secrets: $violations potential secret exposure(s) found. Move secrets to server-only env vars." >&2
  exit 1
fi
exit 0
