# Biweekly payment reconciliation — rollout checklist

This change moves biweekly invoice creation to a daily scheduled Firebase
function (3:15 AM America/Denver). A closed cycle with completed visits and
no scheduled visits remaining can produce one unpaid invoice, even if the
last cleaning occurred before the billing end date.

- Deterministic document IDs and transactional create-only writes avoid
  overwriting existing invoices. Ambiguous overlapping legacy invoices
  are skipped for manual review. Existing invoices are not recalculated;
  edits after billing require manual adjustment. Other billing types are
  unchanged.
- Uses current client rates and custom helper percentages (default 50%).
  Historical rates are not stored. Review **all** proposed historical
  invoices against actual historical billing and helper rates before
  enabling writes. Inactive clients and periods before the anchor or
  earliest matching historical biweekly invoice need manual review.
- The scheduled function defaults to preview-only mode:
  BIWEEKLY_RECONCILIATION_WRITE_ENABLED=false. Inspect the private Firebase
  function logs for candidate client IDs, period end dates and amounts.
  Never enable writes before verifying candidates.
- Do not deploy the frontend-only change before the backend is enabled.
  Review stale browser clients and enforce the intended biweekly payment
  write/delete policy with Firestore rules before enabling writes. A
  manually deleted invoice can be recreated by reconciliation; decide
  on a durable void policy first. Review existing manual edit/deletion
  flows and stale-client interactions in the emulator.
- Before merging, run npm ci, npm run lint and npm test in functions;
  npm ci, npm run lint and npm run build in client. Verify Firestore
  transactions, rules, scheduler permissions, deployment configuration
  and costs with an emulator/test project. Preview is not a substitute
  for integration tests.
- After approved deployment, verify the recovered invoice and mark it
  paid using the actual received date. No check is automatically
  marked paid.

The scheduler adds a recurring job and Firestore reads.
