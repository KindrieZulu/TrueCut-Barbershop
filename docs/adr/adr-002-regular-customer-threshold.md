Title: Regular Customer Threshold
Date: 2026-09-08

Decision
--------
A client will be flagged as a Regular Customer when they have completed 5 paid services in the last 60 days.

Rationale
---------
- Balances reward with recency to avoid long-tail historical accounts gaining priority.
- Configurable via `system_settings` to change thresholds without code deploy.

Consequences
------------
- System will evaluate eligibility at booking-time using `evaluateRegularCustomerEligibility`.
- Admins may tune settings for promotions or loyalty experiments.
