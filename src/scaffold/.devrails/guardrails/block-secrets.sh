#!/usr/bin/env bash
#
# devrails :: block-secrets (tool-agnostic guardrail)
#
# Usage: block-secrets.sh <file> [<file> ...]
# Scans the given files for hardcoded secrets and for secrets leaking into
# client-reachable code. Exit 0 = clean, exit 1 = violations found.
#
# This runs from `devrails check`, which is wired into the git pre-commit hook
# and CI — so enforcement works regardless of which AI tool wrote the code.

set -uo pipefail

violations=0
report() { echo "  [block-secrets] $1: $2" >&2; violations=$((violations+1)); }

for f in "$@"; do
  [ -f "$f" ] || continue
  case "$f" in
    *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.env*|*.json|*.yml|*.yaml|*.py|*.go|*.rb) ;;
    *) continue ;;
  esac

  content="$(cat "$f")"

  printf '%s' "$content" | grep -Eiq '(api[_-]?key|secret|client[_-]?secret|access[_-]?token|auth[_-]?token|private[_-]?key|password|passwd)["'"'"']?\s*[:=]\s*["'"'"'][^"'"'"']{8,}' \
    && report "$f" "possible hardcoded credential (key/secret/token/password = literal)."

  printf '%s' "$content" | grep -Eq '(AKIA|ASIA)[A-Z0-9]{16}'       && report "$f" "possible AWS access key ID."
  printf '%s' "$content" | grep -Eq 'sk-[A-Za-z0-9]{20,}'           && report "$f" "possible API secret key (sk-... )."
  printf '%s' "$content" | grep -Eq 'gh[pousr]_[A-Za-z0-9]{30,}'    && report "$f" "possible GitHub token."
  printf '%s' "$content" | grep -Eq -- '-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----' \
    && report "$f" "private key material in source."

  printf '%s' "$content" | grep -Eiq 'NEXT_PUBLIC_[A-Z0-9_]*(SECRET|KEY|TOKEN|PASSWORD|PRIVATE)' \
    && report "$f" "secret-looking value exposed via NEXT_PUBLIC_ (reaches the browser)."

  if printf '%s' "$content" | grep -q '"use client"'; then
    printf '%s' "$content" | grep -Eq 'process\.env\.[A-Z0-9_]*(SECRET|KEY|TOKEN|PASSWORD|PRIVATE)' \
      && report "$f" "server secret (process.env) referenced inside a \"use client\" component."
  fi
done

if [ "$violations" -gt 0 ]; then
  echo "block-secrets: $violations potential secret exposure(s) found. Move secrets to server-only env vars." >&2
  exit 1
fi
exit 0
