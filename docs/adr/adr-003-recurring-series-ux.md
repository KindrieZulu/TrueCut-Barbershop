Title: Recurring Series UX (modify/cancel behavior)
Date: 2026-09-08

Decision
--------
Provide explicit endpoints and UI for recurring series actions: Cancel All Future, Pause Series, and Modify Future Occurrences. Individual occurrence cancellations remain supported.

Rationale
---------
- Gives clients clear control over series without impacting past occurrences.
- Aligns with accounting/reporting rules where each occurrence is its own booking record.

Consequences
------------
- API will expose series-level endpoints and perform transactional updates for bulk operations.
- The UI must communicate consequences (refunds, penalties) before committing series changes.
