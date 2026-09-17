Title: House Call Policy (10km default)
Date: 2026-09-08

Decision
--------
House calls requested beyond a 10 km radius from the branch will be declined by default. Future releases may add a scaled travel fee option; this will require geocoding and distance calculations.

Rationale
---------
- Keeps initial scope simple and avoids edge-case customer service decisions.
- Enables launch in Harare while deferring complex pricing logic.

Consequences
------------
- UI will show a clear message when an entered address is beyond 10 km.
- Backend will validate distance (if lat/lon provided) and return a user-friendly decline response.
