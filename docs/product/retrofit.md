# Retrofit — security remediation (container scan)

Level: **patch** — patch and minor bumps within the declared ranges; base
image digest refresh within the same tag line. No code changes beyond a
version/version-constraint edit unless a step proves otherwise.

Scope: the `api` module (Spring Boot application + its JRE base image).
The `app` (frontend) image scan was green.

## Baseline (recorded before any change)

- API test suite: **131 tests green** (CI `quality`/`backend` job).
- Docs gates green; app 62 tests green (unaffected by this retrofit).
- Image under scan: `tasky-api:scan`, built from `api/Dockerfile`.
- Trivy (pinned `v0.36.0`) reports **HIGH/CRITICAL** on the API image,
  grouped into five families, all transitive through the Spring Boot
  **4.0.6** BOM or the Ubuntu base:

| # | Family | Key packages | Notes |
|---|---|---|---|
| 1 | Jackson 2.x | `com.fasterxml.jackson.core:jackson-{core,databind,annotations}` | resolved `2.21.2` via `jackson-bom:2.21.2` |
| 2 | Jackson 3.x | `tools.jackson.core:jackson-databind` | managed by Boot `jackson-bom:3.1.2` |
| 3 | Tomcat | `tomcat-embed-{core,coyote,catalina}` | `11.0.21` |
| 4 | Netty | `netty-{codec-*,handler,resolver-dns}` | `4.2.12.Final` |
| 5 | Spring Framework | `spring-expression`, `spring-webmvc` | `7.0.7` |
| 6 | OS | `libssl3t64` (Ubuntu) | fixed in `3.5.5-1ubuntu3.6` |

## CVE triage

Reachability verdicts are conservative: this is a network-facing Spring
Boot API (Tomcat + Netty + Jackson are all on the request path), so the
default for these families is **reachable** unless a package is provably
unused. Evidence is recorded per step as the rescan confirms.

| CVE (representative) | Package | Severity | Reachable? | Fix version | Step |
|---|---|---|---|---|---|
| CVE-2026-54512/54513, CVE-2026-91776 | jackson-databind/core 2.x | HIGH/CRIT | yes (JSON request/response body) | 2.21.7 | 3 |
| CVE-2026-54512 (tools.jackson) | jackson-databind 3.x | HIGH | yes | Boot 4.0.8 → 3.1.5 | 2 |
| CVE-2026-41284/41293/43512/43513/43515/65182/65905/68525, CVE-2026-42498 | tomcat-embed 11.0.21 | HIGH | yes (HTTP/2, FORM auth, constraints) | Boot 4.0.8 → 11.0.24 | 2 |
| CVE-2026-42577/42579/42582/42583/42584/42587/44249/44892/44894/45416/45674/48748/50010/55831/55833/56745/56816/56819/59901/103111 | netty 4.2.12 | HIGH | yes (HTTP codecs, DNS resolver) | Boot 4.0.8 → 4.2.17 | 2 |
| CVE-2026-41842/41850 | spring-expression/webmvc 7.0.7 | HIGH | yes (MVC, SpEL) | Boot 4.0.8 → 7.0.9 | 2 |
| CVE-2026-84782 | libssl3t64 | HIGH | yes (TLS) | base image refresh | 1 |

No CVE in this set is accepted as risk; none are required to be recorded
"not affected" beyond the rescans below. Any that survive after the steps
will be re-triaged with `file:line` call-site evidence or escalated.

## EOL table

| Component | Current | Status | Target |
|---|---|---|---|
| Spring Boot | 4.0.6 | supported (4.0 line) | 4.0.8 (same line) |
| Java (temurin) | 25-jre | supported | same tag, digest refresh |
| PostgreSQL | 18 | supported | unchanged |
| Ubuntu (in JRE image) | 24.04 | supported | same line, digest refresh |

## Ordered steps (one concern each; each merged green before the next)

**Step 1 — Base image digest refresh (`libssl3t64`).**
Re-pin `eclipse-temurin:25-jre` (runtime) and `25-jdk` (builder) in
`api/Dockerfile` to current digests whose Ubuntu carries the patched
OpenSSL. Expected code impact: none (digest only). Risk: low. Verified by:
image rebuild + trivy rescan shows the OS rows gone. Rollback: revert the
digests.

**Step 2 — Spring Boot `4.0.6 → 4.0.8` (framework-managed families).**
Bump the Boot plugin/BOM in root `build.gradle`. This moves Tomcat →
11.0.24, Netty → 4.2.17, Spring Framework → 7.0.9, Jackson 3.x → 3.1.5,
clearing families 2–5. Expected code impact: none expected (patch line).
Risk: low–medium (transitive bumps can surface deprecations). Verified by:
`./gradlew :api:test` (131) + trivy rescan. Rollback: revert to 4.0.6.

**Step 3 — Jackson 2.x `2.21.2 → 2.21.7`.**
The `com.fasterxml.jackson` 2.x line is **not** managed by the Boot 4.0.8
BOM (which manages the `tools.jackson` 3.x line), so pin it explicitly —
`ext['jackson.version'] = '2.21.7'` or a resolutionStrategy constraint in
`api/build.gradle`. Clears family 1. Expected code impact: none. Risk: low.
Verified by: tests + rescan. Rollback: remove the constraint.

**Step 4 — Re-scan and close out.**
Rebuild the image, run trivy, update this file's before/after table, the
SBOM (`docs/product/sbom.cdx.json`) and any version references in
`docs/product/architecture.md`.

## Characterization safety net

The retrofit freezes behavior; the existing **131 API tests** (including
the timer/period/report flows) run on the baseline and after each step.
For the outermost layer, `quality.yml`'s `contract-check` boots the stack
and validates the OpenAPI contract — after the minio removal that job is
expected to run again, giving an HTTP-level check. If coverage is judged
thin for a changed family, add a characterization test before Step 2.

## Before/after (filled in at close-out)

| Metric | Before | After |
|---|---|---|
| HIGH/CRITICAL (API image) | 56 HIGH, 7 CRIT (trivy v0.36.0) | _pending_ |
| Spring Boot | 4.0.6 | _pending_ |
| Tomcat / Netty / Spring Framework | 11.0.21 / 4.2.12 / 7.0.7 | _pending_ |
| Jackson (2.x / 3.x) | 2.21.2 / 3.1.2 | _pending_ |
| API tests | 131 green | _pending_ |

## Open question for the user

Step 2 crosses the `patch` boundary only in the "minor bumps outside the
declared range" sense if Boot 4.0.8 is considered outside `4.0.6`; it is a
same-line patch release, so it is within `patch`. Steps 1–3 change no
application code. Confirm the level and whether to proceed step by step
with a merge after each.
