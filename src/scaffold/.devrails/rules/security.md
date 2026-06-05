---
title: Security
description: Security requirements for input, auth, data, and secrets
globs: []
alwaysApply: true
---

The server never trusts the client.

- Secrets live only in server contexts — never in `"use client"` files, `NEXT_PUBLIC_*`, source code, or logs. No hardcoded keys, tokens, connection strings, or private keys.
- Validate every external input on the server with a schema (Server Action args, route bodies, query params, webhooks). Validate type, shape, length, and allowed values; reject unexpected fields. Client-side validation is UX only.
- Re-check authentication on the server for every protected action. Enforce per-resource authorization (ownership/role), not just "logged in" — guard against IDOR (changing an `id` to reach another user's data). Enforce at the data-access layer, not middleware alone.
- Use parameterized queries / safe ORM APIs; never concatenate SQL with user input. Avoid `dangerouslySetInnerHTML` (sanitize if unavoidable). Allow-list dynamic fetch/redirect targets (SSRF / open redirect).
- Return only the fields the client needs; never serialize whole DB records. Error responses are generic to users; details go to server logs.
- Set security headers (CSP where feasible, `nosniff`, `Referrer-Policy`, HSTS in prod). Session cookies: `httpOnly`, `secure`, `SameSite`. Protect state-changing requests against CSRF. Validate file uploads (type, size, storage) and never trust their content.
