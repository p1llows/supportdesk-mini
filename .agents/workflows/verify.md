---
description: Runs the full backend/frontend verification suite and shows raw output only.
---

# Verify

Run the following commands in order and display the full, raw output of each — do not summarize, interpret, or claim pass/fail on the user's behalf:

1. docker compose exec app php artisan test
2. docker compose exec frontend npx tsc --noEmit -p tsconfig.app.json
3. docker compose exec frontend npm run build
4. git diff --check
5. git log --oneline -10
6. git status --short

After running all six, stop. Do not proceed to any other action.