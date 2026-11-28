import {setGlobalOptions} from "firebase-functions";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";

import {requireAdmin} from "./auth/requireAdmin";
import {
  handleAskMilaAssistant,
} from "./assistant/handleAskMilaAssistant";

initializeApp();

setGlobalOptions({maxInstances: 1});

const db = getFirestore();
const openaiApiKey = defineSecret("OPENAI_API_KEY");

export const findLastCleaning = onCall(
  async (request) => {
    await requireAdmin(request.auth?.uid);

    const clientName = request.data?.clientName;

    if (
      typeof clientName !== "string" ||
      clientName.trim().length === 0
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Please provide a client name."
      );
    }

    const clientsRef = db.collection(
      "businesses/mila-cleaning-tracker/clients"
    );

    const clientsSnapshot =
      await clientsRef.get();

    const normalizedName =
      clientName.trim().toLowerCase();

    const matchingClients =
      clientsSnapshot.docs.filter(
        (clientDoc) =>
          clientDoc
            .data()
            .name
            ?.trim()
            .toLowerCase() === normalizedName
      );

    if (matchingClients.length === 0) {
      return {
        found: false,
        message:
          "I could not find a client named " +
          `"${clientName.trim()}".`,
      };
    }

    if (matchingClients.length > 1) {
      return {
        found: false,
        message:
          "More than one client matches " +
          `"${clientName.trim()}".`,
      };
    }

    const clientDoc = matchingClients[0];

    const cleaningsRef = db.collection(
      "businesses/mila-cleaning-tracker/cleanings"
    );

    const cleaningsSnapshot =
      await cleaningsRef
        .where("clientId", "==", clientDoc.id)
        .get();

    const completedCleanings =
      cleaningsSnapshot.docs
        .map((cleaningDoc) => {
          const data =
            cleaningDoc.data() as {
              status?: string;
              date?: string;
            };

          return {
            firestoreId: cleaningDoc.id,
            status: data.status,
            date: data.date,
          };
        })
        .filter(
          (cleaning) =>
            cleaning.status === "Completed" &&
            typeof cleaning.date === "string"
        )
        .sort(
          (a, b) =>
            String(b.date).localeCompare(
              String(a.date)
            )
        );

    if (completedCleanings.length === 0) {
      return {
        found: false,
        clientName: clientDoc.data().name,
        message:
          `${clientDoc.data().name} has no ` +
          "completed cleanings.",
      };
    }

    const lastCleaning =
      completedCleanings[0];

    return {
      found: true,
      clientName: clientDoc.data().name,
      date: lastCleaning.date,
      cleaningId:
        lastCleaning.firestoreId,
    };
  }
);

export const askMilaAssistant = onCall(
  {
    secrets: [openaiApiKey],
    invoker: "public",
  },
  async (request) =>
    handleAskMilaAssistant({
      uid: request.auth?.uid,
      data: request.data,
      apiKey: openaiApiKey.value(),
    })
);

export {reconcileBiweeklyPayments} from "./billing/reconcileBiweeklyPayments";
