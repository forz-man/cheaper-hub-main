---
name: Verification review integrity
description: Concurrency and state-transition rules that keep vendor verification approvals trustworthy.
---

Pending vendor verification submissions must be immutable. A vendor may submit initially or resubmit after a decline, but may not replace a pending or approved submission. Admin decisions must transition only a pending record and must match the exact revision the admin loaded, with both checks enforced while the database row is locked.

**Why:** Without both state and revision checks, a vendor could replace identity details after an admin opens the review and receive approval based on stale information. API-only checks are insufficient because concurrent requests and service-role callers can bypass them.

**How to apply:** Any future verification submission or review path must preserve database-enforced state transitions, optimistic revision matching, and row-level serialization. Keep public badges derived only from the resulting admin-controlled approved status.