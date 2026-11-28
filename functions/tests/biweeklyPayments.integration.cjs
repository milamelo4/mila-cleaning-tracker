const assert = require("node:assert/strict");
const {randomUUID} = require("node:crypto");
const {test} = require("node:test");

// Hard-coded demo project and loopback endpoint. Never use production.
const projectId = "demo-mila-cleaning-tracker";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.GCLOUD_PROJECT = projectId;
process.env.GOOGLE_CLOUD_PROJECT = projectId;
process.env.FIREBASE_CONFIG = JSON.stringify({projectId});
process.env.BIWEEKLY_RECONCILIATION_WRITE_ENABLED = "false";

const {initializeApp, deleteApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {
  getBusinessDate,
  reconcileBiweeklyPayments,
} = require("../lib/billing/reconcileBiweeklyPayments.js");

function shift(date, days) {
  const value = new Date(date + "T00:00:00Z");
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

test("scheduled handler recovers a missing payment in the Firestore emulator", async () => {
  // Confirm that the local emulator is reachable before creating records.
  const response = await fetch("http://127.0.0.1:4400/emulators");
  assert.ok(response.ok, "Start the demo emulators first.");
  const services = await response.json();
  assert.equal(services.firestore?.port, 8080);

  const app = initializeApp({projectId});
  const db = getFirestore(app);
  const business = db.doc("businesses/mila-cleaning-tracker");
  const clients = business.collection("clients");
  const cleanings = business.collection("cleanings");
  const payments = business.collection("payments");
  const members = business.collection("members");
  const id = "integration-" + randomUUID();
  const today = getBusinessDate(new Date());
  // Relative dates reproduce the November 3–16 scenario on any day.
  const priorEnd = shift(today, -26);
  const missingEnd = shift(today, -12);
  const openEnd = shift(today, 2);
  const prior = payments.doc("biweekly_" + id + "_" + priorEnd);
  const missing = payments.doc("biweekly_" + id + "_" + missingEnd);
  const open = payments.doc("biweekly_" + id + "_" + openEnd);
  const helper = members.doc(id);
  const client = clients.doc(id);
  const visits = [-25, -23, -18, -16, -11, -9, -4, -2].map((days, i) => ({
    ref: cleanings.doc(id + "-" + i),
    data: {
      clientId: id,
      date: shift(today, days),
      status: "Completed",
      estimatedHours: 3,
      assignedHelpers: i === 0 ? [helper.id] : [],
    },
  }));
  const original = {
    clientId: id, clientName: "Integration test client",
    cleaningId: "", cleaningDate: "", billingType: "Biweekly",
    periodStart: shift(priorEnd, -13), periodEnd: priorEnd,
    includedCleaningIds: [], amountCharged: 490, actualHours: 12,
    helperPayout: 0, paid: true, paidDate: shift(priorEnd, 1),
    notes: "Preserve this paid record",
  };
  const run = () => reconcileBiweeklyPayments.run({
    scheduleTime: new Date().toISOString(),
  });

  try {
    // The job processes all active biweekly clients, so require an empty
    // dedicated demo database rather than modifying unrelated fixtures.
    assert.ok((await clients.limit(1).get()).empty,
      "Use a fresh, empty demo emulator for this integration test.");
    const setup = db.batch();
    setup.set(client, {
      name: "Integration test client", active: true,
      billingType: "Biweekly", biweeklyAnchorDate: shift(today, -54),
      biweeklyRate: 500, pricePerCleaning: 125,
    });
    setup.set(helper, {role: "helper", payoutPercentage: 35});
    setup.set(prior, original);
    for (const visit of visits) setup.set(visit.ref, visit.data);
    await setup.commit();

    await run();
    assert.equal((await missing.get()).exists, false, "Preview must not write");
    console.log("PASS: Preview mode creates no invoice");

    process.env.BIWEEKLY_RECONCILIATION_WRITE_ENABLED = "true";
    await run();
    const invoice = (await missing.get()).data();
    assert.ok(invoice, "Missing invoice was not created");
    assert.equal(invoice.amountCharged, 500);
    assert.equal(invoice.periodStart, shift(missingEnd, -13));
    assert.equal(invoice.periodEnd, missingEnd);
    assert.deepEqual(invoice.includedCleaningIds,
      visits.slice(0, 4).map(({ref}) => ref.id));
    assert.equal(invoice.actualHours, 12);
    assert.equal(invoice.helperPayout, 43.75);
    assert.equal(invoice.paid, false);
    assert.equal((await open.get()).exists, false);
    assert.deepEqual((await prior.get()).data(), original);
    console.log("PASS: Recovered $500 invoice, correct dates, visits and helper payout");
    console.log("PASS: Open period skipped; existing paid invoice preserved");

    await missing.update({paid: true, paidDate: today, amountCharged: 495});
    const edited = (await missing.get()).data();
    await run();
    assert.deepEqual((await missing.get()).data(), edited);
    assert.equal((await payments.where("clientId", "==", id).get()).size, 2);
    console.log("PASS: Second run creates no duplicates or changes to paid invoices");
  } finally {
    // Remove only this test's documents; production is never connected.
    const cleanup = db.batch();
    for (const ref of [client, helper, prior, missing, open,
      ...visits.map((visit) => visit.ref)]) cleanup.delete(ref);
    try {
      await cleanup.commit();
    } finally {
      await db.terminate();
      await deleteApp(app);
    }
  }
});
