import {getFirestore} from "firebase-admin/firestore";

import type {
  ClientSummary,
  CleaningSummary,
  PaymentSummary,
} from "../types/business";

export type BusinessData = {
  clients: ClientSummary[];
  cleanings: CleaningSummary[];
  payments: PaymentSummary[];
};

/**
 * Loads the business data used by Mila Assistant.
 * @return {Promise<BusinessData>} Safe business data.
 */
export async function loadBusinessData():
Promise<BusinessData> {
  const db = getFirestore();

  const [
    clientsSnapshot,
    cleaningsSnapshot,
    paymentsSnapshot,
  ] = await Promise.all([
    db.collection(
      "businesses/mila-cleaning-tracker/clients"
    ).get(),
    db.collection(
      "businesses/mila-cleaning-tracker/cleanings"
    ).get(),
    db.collection(
      "businesses/mila-cleaning-tracker/payments"
    ).get(),
  ]);

  const clients: ClientSummary[] =
    clientsSnapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,

        name:
          typeof data.name === "string" ?
            data.name :
            "",

        billingType:
          data.billingType === "Biweekly" ?
            "Biweekly" :
            data.billingType === "Fixed Monthly" ?
              "Fixed Monthly" :
              "Per Cleaning",

        pricePerCleaning:
          typeof data.pricePerCleaning === "number" ?
            data.pricePerCleaning :
            0,

        monthlyRate:
          typeof data.monthlyRate === "number" ?
            data.monthlyRate :
            0,

        biweeklyRate:
          typeof data.biweeklyRate === "number" ?
            data.biweeklyRate :
            0,

        biweeklyAnchorDate:
          typeof data.biweeklyAnchorDate === "string" ?
            data.biweeklyAnchorDate :
            "",

        frequency:
          typeof data.frequency === "string" ?
            data.frequency :
            "",

        helperNeeded:
          data.helperNeeded === true,

        active:
          data.active === true,
      };
    });

  const cleanings: CleaningSummary[] =
    cleaningsSnapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        clientId:
          typeof data.clientId === "string" ?
            data.clientId :
            "",
        clientName:
          typeof data.clientName === "string" ?
            data.clientName :
            "",
        date:
          typeof data.date === "string" ?
            data.date :
            "",
        startTime:
          typeof data.startTime === "string" ?
            data.startTime :
            "",
        estimatedHours:
          typeof data.estimatedHours === "number" ?
            data.estimatedHours :
            0,
        assignedHelpers:
          Array.isArray(data.assignedHelpers) ?
            data.assignedHelpers.filter(
              (helper): helper is string =>
                typeof helper === "string"
            ) :
            [],
        status:
          typeof data.status === "string" ?
            data.status :
            "",
      };
    });

  const payments: PaymentSummary[] =
    paymentsSnapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        clientId:
          typeof data.clientId === "string" ?
            data.clientId :
            "",
        clientName:
          typeof data.clientName === "string" ?
            data.clientName :
            "",
        billingType:
          data.billingType === "Biweekly" ||
          data.billingType === "Fixed Monthly" ||
          data.billingType === "Per Cleaning" ?
            data.billingType :
            undefined,
        cleaningDate:
          typeof data.cleaningDate === "string" ?
            data.cleaningDate :
            "",
        periodStart:
          typeof data.periodStart === "string" ?
            data.periodStart :
            undefined,
        periodEnd:
          typeof data.periodEnd === "string" ?
            data.periodEnd :
            undefined,
        amountCharged:
          typeof data.amountCharged === "number" ?
            data.amountCharged :
            0,
        actualHours:
          typeof data.actualHours === "number" ?
            data.actualHours :
            0,
        helperPayout:
          typeof data.helperPayout === "number" ?
            data.helperPayout :
            0,
        paid:
          data.paid === true,
        paidDate:
          typeof data.paidDate === "string" ?
            data.paidDate :
            "",
      };
    });

  return {
    clients,
    cleanings,
    payments,
  };
}
