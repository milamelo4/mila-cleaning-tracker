import {getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions";
import {defineBoolean} from "firebase-functions/params";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {planMissingBiweeklyPayments} from "./biweeklyPayments";

const BUSINESS = "businesses/mila-cleaning-tracker";
const TIME_ZONE = "America/Denver";
const writeEnabled = defineBoolean("BIWEEKLY_RECONCILIATION_WRITE_ENABLED", {
  default: false,
});

/**
 * Gets today's date in the business timezone, independent of server UTC.
 * @param {Date} now Current instant.
 * @return {string} ISO date.
 */
export function getBusinessDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const read = (type: string) =>
    parts.find((part) => part.type === type)?.value;
  return `${read("year")}-${read("month")}-${read("day")}`;
}

// A daily run catches periods even without a visit on their final day.
// Default to preview; confirm historical rates before enabling writes.
export const reconcileBiweeklyPayments = onSchedule({
  schedule: "15 3 * * *",
  timeZone: TIME_ZONE,
  region: "us-central1",
  maxInstances: 1,
  retryCount: 2,
}, async () => {
  const db = getFirestore();
  const business = db.doc(BUSINESS);
  const clients = business.collection("clients");
  const cleanings = business.collection("cleanings");
  const payments = business.collection("payments");
  const helpers = business.collection("members").where("role", "==", "helper");
  const today = getBusinessDate(new Date());
  const shouldWrite = writeEnabled.value();
  const clientSnapshot = await clients.where("billingType", "==", "Biweekly")
    .get();
  let created = 0;
  let failures = 0;

  for (const client of clientSnapshot.docs) {
    if (client.data().active !== true) continue;
    try {
      const result = await db.runTransaction(async (transaction) => {
        const current = await transaction.get(client.ref);
        if (!current.exists) return [];
        const [cleaningSnapshot, paymentSnapshot, helperSnapshot] =
          await Promise.all([
            transaction.get(cleanings.where("clientId", "==", client.id)),
            transaction.get(payments.where("clientId", "==", client.id)),
            transaction.get(helpers),
          ]);
        const rates = new Map<string, number>();
        for (const helper of helperSnapshot.docs) {
          const rate = helper.data().payoutPercentage;
          if (typeof rate === "number" && Number.isFinite(rate) &&
              rate >= 0 && rate <= 100) rates.set(helper.id, rate);
        }
        const planned = planMissingBiweeklyPayments(
          {id: current.id, data: current.data() ?? {}},
          cleaningSnapshot.docs.map((doc) => ({id: doc.id, data: doc.data()})),
          paymentSnapshot.docs.map((doc) => ({id: doc.id, data: doc.data()})),
          rates,
          today
        );
        // Bound writes to Firestore transaction limits.
        const batch = planned.slice(0, 200);
        if (shouldWrite) {
          for (const payment of batch) {
            transaction.create(payments.doc(payment.id), payment.data);
          }
        }
        return batch;
      });
      if (shouldWrite) {
        created += result.length;
      } else {
        logger.info("Biweekly billing preview", {
          clientId: client.id,
          candidates: result.map(({data}) => ({
            periodEnd: data.periodEnd,
            amountCharged: data.amountCharged,
            helperPayout: data.helperPayout,
          })),
        });
      }
    } catch (error) {
      failures++;
      logger.error("Biweekly billing reconciliation needs review", {
        clientId: client.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  logger.info("Biweekly billing reconciliation completed", {
    preview: !shouldWrite,
    created,
    failures,
  });
  if (failures) throw new Error("One or more biweekly clients need review.");
});
