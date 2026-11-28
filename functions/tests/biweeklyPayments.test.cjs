const {test} = require("node:test");
const assert = require("node:assert/strict");
const {planMissingBiweeklyPayments: plan} = require("../lib/billing/biweeklyPayments.js");

const client = {id: "client-1", data: {
  name: "Example client", active: true, billingType: "Biweekly",
  biweeklyAnchorDate: "2026-10-05", biweeklyRate: 500, pricePerCleaning: 125,
}};
const cleanings = ["03", "05", "10", "12"].map((day) => ({id: day, data: {
  date: `2026-11-${day}`, status: "Completed", estimatedHours: 3,
  assignedHelpers: [],
}}));
const paid = {id: "biweekly_client-1_2026-11-02", data: {
  billingType: "Biweekly", periodStart: "2026-10-20", periodEnd: "2026-11-02",
  amountCharged: 500, paid: true, paidDate: "2026-11-03",
}};
const run = (date = "2026-11-28", visits = cleanings, bills = [paid], rates = new Map()) =>
  plan(client, visits, bills, rates, date);

test("last cleaning precedes billing close; recovery creates correct invoice", () => {
  assert.deepEqual(run("2026-11-12"), []);
  const [invoice] = run();
  assert.equal(invoice.id, "biweekly_client-1_2026-11-16");
  assert.equal(invoice.data.periodStart, "2026-11-03");
  assert.equal(invoice.data.periodEnd, "2026-11-16");
  assert.deepEqual(invoice.data.includedCleaningIds, ["03", "05", "10", "12"]);
  assert.equal(invoice.data.amountCharged, 500);
  assert.equal(invoice.data.actualHours, 12);
  assert.equal(invoice.data.helperPayout, 0);
  assert.equal(invoice.data.paid, false);
});

test("repeated runs skip existing invoice, including paid and edited records", () => {
  const [invoice] = run();
  const recorded = {id: invoice.id, data: {...invoice.data, paid: true, amountCharged: 490}};
  assert.deepEqual(run("2026-11-28", cleanings, [paid, recorded]), []);
  assert.equal(recorded.data.amountCharged, 490);
  assert.equal(recorded.data.paid, true);
});

test("unresolved scheduled visits defer the bill; cancelled visits do not", () => {
  const visits = [...cleanings, {id: "extra", data: {date: "2026-11-15", status: "Scheduled"}}];
  assert.deepEqual(run("2026-11-28", visits), []);
  visits[4].data.status = "Cancelled";
  assert.equal(run("2026-11-28", visits).length, 1);
});

test("an open period is not billed even after the last cleaning", () => {
  const future = [{id: "17", data: {...cleanings[0].data, date: "2026-11-17"}}];
  assert.deepEqual(run("2026-11-28", future), []);
});

test("old per-cleaning or monthly invoices are not silently replaced", () => {
  const old = {id: "old", data: {cleaningDate: "2026-11-03", paid: true}};
  assert.deepEqual(run("2026-11-28", cleanings, [old]), []);
  const monthly = {id: "monthly_client-1_2026-11", data: {cleaningDate: "2026-11-25"}};
  assert.deepEqual(run("2026-11-28", cleanings, [monthly]), []);
});

test("helper payout respects custom percentage and does not double-count IDs", () => {
  const visits = cleanings.map((cleaning) => ({id: cleaning.id, data: {...cleaning.data}}));
  visits[0].data.assignedHelpers = ["helper-a", "helper-a", "helper-b"];
  const [invoice] = run("2026-11-28", visits, [paid], new Map([["helper-a", 35]]));
  assert.equal(invoice.data.helperPayout, 106.25);
});

test("pre-anchor unverified visits are not automatically back-billed", () => {
  const historical = [{id: "old", data: {...cleanings[0].data, date: "2026-09-15"}}];
  assert.deepEqual(run("2026-11-28", historical, []), []);
});

test("incomplete and invalid data fails closed rather than creating a bill", () => {
  const invalid = [{id: "bad", data: {...cleanings[0].data, estimatedHours: -1}}];
  assert.throws(() => run("2026-11-28", invalid));
  assert.deepEqual(run("2026-11-28", cleanings, [{id: "unknown", data: {}}]), []);
});
