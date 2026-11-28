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
- Coordinate frontend, backend and rules releases. Do not deploy the
  frontend-only change before the backend is enabled. Refresh all open
  app sessions: older clients may be denied when trying to create or
  delete a biweekly invoice and may still edit existing totals when
  their billing identity is unchanged.
- Biweekly invoice creation/deletion is now server-only; the UI hides
  its Delete button. Admin financial edits, notes and paid dates remain
  available; billing period and linked visit IDs are immutable from the
  browser. A durable void/reversal workflow is not part of this patch.
  Run npm run test:rules in functions against the demo emulator with
  client dependencies installed before deployment.
- Before merging, run npm ci, npm run lint and npm test in functions;
  npm ci, npm run lint and npm run build in client. Verify Firestore
  transactions, rules, scheduler permissions, deployment configuration
  and costs with an emulator/test project. Preview is not a substitute
  for integration tests.
- After approved deployment, verify the recovered invoice and mark it
  paid using the actual received date. No check is automatically
  marked paid.

The scheduler adds a recurring job and Firestore reads.
