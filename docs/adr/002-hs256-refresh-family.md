# ADR-002: HS256 access tokens + opaque refresh families (no RS256/sessions)

- Context: single backend serves the SPA; no multi-service JWT verification need.
- Options: (a) HS256 + server-side refresh families, (b) RS256, (c) server sessions.
- Decision: short HS256 access JWT (in-memory FE) + opaque rotated refresh
  family in HttpOnly cookie with reuse detection (revokes family).
- Consequences: secret rotation is a short maintenance (no dual-accept);
  families persist across rotation; reuse signals theft (metric + alert).
- Revisit when: a second verifying service appears (→ RS256/JWKS).
