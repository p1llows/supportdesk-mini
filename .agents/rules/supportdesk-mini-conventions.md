---
trigger: always_on
---

# SupportDesk Mini — Project Conventions

- Tech stack is locked: Laravel 12 + shadcn/ui (NOT Material UI, despite the original spec). Do not migrate UI libraries.
- API responses always use { "status": "success"/"error", "data": {...} } envelope, "message" added when relevant.
- All routes prefixed /api/v1/, protected routes use auth:sanctum.
- Roles are exactly: admin, agent, requester. Nothing else.
- tickets.department_id is the only department reference. Never reintroduce a string department column.
- Approved departments are exactly: Information Technology, Human Resources, Finance, Operations, Facilities.
- Every commit message starts with the issue number it targets, e.g. "#13 add status transition endpoint". Never bundle unrelated changes into a tagged commit.
- Never claim a frontend feature is "done" without using the browser tool to actually navigate to the page, screenshot it, and confirm the element renders and is clickable. A passing build or test suite is NOT proof a UI feature works.
- Do not re-plan or redesign an already-approved implementation plan. If something in an approved plan looks wrong, stop and flag it — do not silently deviate.
- Only implement what is explicitly scoped in the current task. Do not pull in functionality from other issues even if related.