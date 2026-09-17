## What changed and why

<!-- One or two sentences. Link an issue/ADR if relevant. -->

## Testing

<!-- What you ran and what it proved. "Build passes" is not testing - what
     behavior did you actually verify, and against what (unit test, a real
     database, a running server)? -->

## Security considerations

Fill this in now, not in a later hardening pass - see docs/security-assessment.md's
process recommendation.

- [ ] N/A - this change has no security-relevant surface (docs, tests-only, styling)
- [ ] Touches auth, sessions, cookies, or tokens
- [ ] Touches payments, the ledger, or anything financial
- [ ] Adds or changes a DB query built from user input
- [ ] Adds a new dependency (checked for known CVEs / maintenance status)
- [ ] Adds or changes an API endpoint (confirmed request body is validated via a DTO, not an inline type)
- [ ] Introduces or changes a secret, credential, or environment variable requirement

If any box above is checked, briefly explain what you verified:

<!-- e.g. "New endpoint uses RegisterDto with class-validator; confirmed
     extra/malicious fields are rejected via a test." -->
