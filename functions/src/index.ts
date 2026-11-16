import {setGlobalOptions} from "firebase-functions";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import {initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import OpenAI from "openai";

import type {
  ClientSummary,
  CleaningSummary,
  HistoryMessage,
  PaymentSummary,
} from "./types";
import {
  addDays,
  addMonths,
  daysBetween,
  getMonday,
  getMonthEnd,
  getMonthStart,
  getUtahDateKey,
} from "./dateUtils";

import {calculateFinancialMetrics} from "./financialMetrics";

initializeApp();

setGlobalOptions({maxInstances: 1});

const db = getFirestore();
const openaiApiKey = defineSecret("OPENAI_API_KEY");

/**
 * Verifies that the current user is an admin.
 * @param {string | undefined} uid Firebase user ID.
 */
async function requireAdmin(uid?: string) {
  if (!uid) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in."
    );
  }

  const memberRef = db.doc(
    `businesses/mila-cleaning-tracker/members/${uid}`
  );

  const memberSnapshot = await memberRef.get();

  if (
    !memberSnapshot.exists ||
    memberSnapshot.data()?.role !== "admin"
  ) {
    throw new HttpsError(
      "permission-denied",
      "Only admins can use the assistant."
    );
  }
}


/**
 * Returns schedule totals for a date range.
 * @param {CleaningSummary[]} cleanings Cleaning records.
 * @param {string} startDate Range start.
 * @param {string} endDate Range end.
 * @return {object} Schedule totals.
 */
function countCleanings(
  cleanings: CleaningSummary[],
  startDate: string,
  endDate: string
) {
  const matchingCleanings = cleanings.filter(
    (cleaning) =>
      cleaning.date >= startDate &&
      cleaning.date <= endDate &&
      cleaning.status !== "Cancelled"
  );

  return {
    startDate,
    endDate,
    total: matchingCleanings.length,
    scheduled: matchingCleanings.filter(
      (cleaning) =>
        cleaning.status === "Scheduled"
    ).length,
    completed: matchingCleanings.filter(
      (cleaning) =>
        cleaning.status === "Completed"
    ).length,
    estimatedHours: matchingCleanings.reduce(
      (total, cleaning) =>
        total + cleaning.estimatedHours,
      0
    ),
  };
}

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
  async (request) => {
    await requireAdmin(request.auth?.uid);

    const question =
      request.data?.question;

    const history =
      Array.isArray(request.data.history) ?
        request.data.history :
        [];

    const safeHistory = history
      .filter(
        (message: HistoryMessage) =>
          message &&
          (
            message.role === "user" ||
            message.role === "assistant"
          ) &&
          typeof message.content === "string"
      )
      .slice(-12)
      .map(
        (message: HistoryMessage) => ({
          role:
            message.role as
              "user" | "assistant",
          content:
            (message.content as string)
              .slice(0, 5000),
        })
      );

    if (
      typeof question !== "string" ||
      question.trim().length === 0
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Please enter a question."
      );
    }

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
          pricePerCleaning:
            typeof data.pricePerCleaning ===
            "number" ?
              data.pricePerCleaning :
              0,
          frequency:
            typeof data.frequency ===
            "string" ?
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
            typeof data.clientName ===
            "string" ?
              data.clientName :
              "",
          date:
            typeof data.date === "string" ?
              data.date :
              "",
          startTime:
            typeof data.startTime ===
            "string" ?
              data.startTime :
              "",
          estimatedHours:
            typeof data.estimatedHours ===
            "number" ?
              data.estimatedHours :
              0,
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
            typeof data.clientName ===
            "string" ?
              data.clientName :
              "",
          billingType:
  data.billingType === "Biweekly" ||
  data.billingType === "Fixed Monthly" ||
  data.billingType === "Per Cleaning" ?
    data.billingType :
    undefined,
          cleaningDate:
  typeof data.cleaningDate ===
  "string" ?
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
            typeof data.amountCharged ===
            "number" ?
              data.amountCharged :
              0,
          actualHours:
            typeof data.actualHours ===
            "number" ?
              data.actualHours :
              0,
          helperPayout:
            typeof data.helperPayout ===
            "number" ?
              data.helperPayout :
              0,
          paid:
            data.paid === true,
          paidDate:
            typeof data.paidDate ===
            "string" ?
              data.paidDate :
              "",
        };
      });

    const todayDate = getUtahDateKey();
    const tomorrowDate =
      addDays(todayDate, 1);
    const yesterdayDate =
      addDays(todayDate, -1);

    const thisWeekStart =
      getMonday(todayDate);
    const thisWeekEnd =
      addDays(thisWeekStart, 6);

    const nextWeekStart =
      addDays(thisWeekStart, 7);
    const nextWeekEnd =
      addDays(nextWeekStart, 6);

    const thisMonthStart =
      getMonthStart(todayDate);
    const thisMonthEnd =
      getMonthEnd(todayDate);

    const lastMonthStart =
      addMonths(todayDate, -1);
    const lastMonthEnd =
      getMonthEnd(lastMonthStart);

    const nextMonthStart =
      addMonths(todayDate, 1);
    const nextMonthEnd =
      getMonthEnd(nextMonthStart);

    const scheduleMetrics = {
      today: countCleanings(
        cleanings,
        todayDate,
        todayDate
      ),
      tomorrow: countCleanings(
        cleanings,
        tomorrowDate,
        tomorrowDate
      ),
      yesterday: countCleanings(
        cleanings,
        yesterdayDate,
        yesterdayDate
      ),
      thisWeek: countCleanings(
        cleanings,
        thisWeekStart,
        thisWeekEnd
      ),
      nextWeek: countCleanings(
        cleanings,
        nextWeekStart,
        nextWeekEnd
      ),
      thisMonth: countCleanings(
        cleanings,
        thisMonthStart,
        thisMonthEnd
      ),
      lastMonth: countCleanings(
        cleanings,
        lastMonthStart,
        lastMonthEnd
      ),
      nextMonth: countCleanings(
        cleanings,
        nextMonthStart,
        nextMonthEnd
      ),
    };

    const weekdayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const cleaningsByWeekday:
      Record<string, number> = {
        Sunday: 0,
        Monday: 0,
        Tuesday: 0,
        Wednesday: 0,
        Thursday: 0,
        Friday: 0,
        Saturday: 0,
      };

    for (const cleaning of cleanings) {
      if (
        cleaning.status === "Cancelled" ||
        !cleaning.date
      ) {
        continue;
      }

      const [year, month, day] =
        cleaning.date
          .split("-")
          .map(Number);

      const date = new Date(
        Date.UTC(year, month - 1, day)
      );

      const weekday =
        weekdayNames[date.getUTCDay()];

      cleaningsByWeekday[weekday] += 1;
    }

    const highestCleaningCount =
      Math.max(
        ...Object.values(
          cleaningsByWeekday
        )
      );

    const busiestWeekdays =
      Object.entries(cleaningsByWeekday)
        .filter(
          ([, count]) =>
            count ===
              highestCleaningCount &&
            count > 0
        )
        .map(([weekday]) => weekday);

    const {
      billedRevenueByMonth,
      cashReceivedByMonth,
      helperPayoutsByMonth,
      netAfterHelperByMonth,
      unpaidBalance,
      unpaidByClient,
      billedRevenueByClient,
      helperPayoutsByClient,
      netAfterHelperByClient,
      totalBilledRevenue,
      totalCashReceived,
      totalHelperPayouts,
    } = calculateFinancialMetrics(payments);

    const lastCleaningByClient:
      Record<string, string> = {};

    const nextCleaningByClient:
      Record<string, string> = {};

    const completedCountByClient:
      Record<string, number> = {};

    const scheduledCountByClient:
      Record<string, number> = {};

    const cancelledCountByClient:
      Record<string, number> = {};

    const pastScheduledCleanings =
      cleanings
        .filter(
          (cleaning) =>
            cleaning.status ===
              "Scheduled" &&
            cleaning.date < todayDate
        )
        .sort(
          (a, b) =>
            a.date.localeCompare(b.date)
        )
        .map((cleaning) => ({
          clientId: cleaning.clientId,
          clientName:
            cleaning.clientName,
          date: cleaning.date,
          startTime:
            cleaning.startTime,
        }));

    for (const cleaning of cleanings) {
      const clientKey =
        cleaning.clientId;

      if (!clientKey) {
        continue;
      }

      if (
        cleaning.status === "Completed"
      ) {
        completedCountByClient[
          clientKey
        ] =
          (
            completedCountByClient[
              clientKey
            ] ?? 0
          ) + 1;

        const currentLast =
          lastCleaningByClient[
            clientKey
          ];

        if (
          !currentLast ||
          cleaning.date > currentLast
        ) {
          lastCleaningByClient[
            clientKey
          ] = cleaning.date;
        }
      }

      if (
        cleaning.status === "Scheduled"
      ) {
        scheduledCountByClient[
          clientKey
        ] =
          (
            scheduledCountByClient[
              clientKey
            ] ?? 0
          ) + 1;

        if (
          cleaning.date >= todayDate
        ) {
          const currentNext =
            nextCleaningByClient[
              clientKey
            ];

          if (
            !currentNext ||
            cleaning.date < currentNext
          ) {
            nextCleaningByClient[
              clientKey
            ] = cleaning.date;
          }
        }
      }

      if (
        cleaning.status === "Cancelled"
      ) {
        cancelledCountByClient[
          clientKey
        ] =
          (
            cancelledCountByClient[
              clientKey
            ] ?? 0
          ) + 1;
      }
    }

    const clientInsights = clients
      .map((client) => {
        const lastCleaning =
          lastCleaningByClient[
            client.id
          ] ?? null;

        const nextCleaning =
          nextCleaningByClient[
            client.id
          ] ?? null;

        const unpaid =
          unpaidByClient[
            client.name
          ] ?? 0;

        const billedRevenue =
          billedRevenueByClient[
            client.name
          ] ?? 0;

        return {
          clientId: client.id,
          name: client.name,
          active: client.active,
          frequency:
            client.frequency,
          pricePerCleaning:
            client.pricePerCleaning,
          helperNeeded:
            client.helperNeeded,
          lastCompletedCleaning:
            lastCleaning,
          daysSinceLastCompleted:
            lastCleaning ?
              daysBetween(
                lastCleaning,
                todayDate
              ) :
              null,
          nextScheduledCleaning:
            nextCleaning,
          completedCleanings:
            completedCountByClient[
              client.id
            ] ?? 0,
          scheduledCleanings:
            scheduledCountByClient[
              client.id
            ] ?? 0,
          cancelledCleanings:
            cancelledCountByClient[
              client.id
            ] ?? 0,
          unpaidBalance: unpaid,
          billedRevenue,
          netAfterHelper:
            netAfterHelperByClient[
              client.name
            ] ?? 0,
        };
      })
      .sort(
        (a, b) =>
          a.name.localeCompare(b.name)
      );

    const activeClientsWithoutHistory =
      clientInsights
        .filter(
          (client) =>
            client.active &&
            client.lastCompletedCleaning ===
              null
        )
        .map((client) => client.name);

    const clientsByOldestLastCleaning =
      [...clientInsights]
        .filter((client) => client.active)
        .sort((a, b) => {
          if (
            a.daysSinceLastCompleted === null &&
            b.daysSinceLastCompleted !== null
          ) {
            return -1;
          }

          if (
            a.daysSinceLastCompleted !== null &&
            b.daysSinceLastCompleted === null
          ) {
            return 1;
          }

          return (
            (b.daysSinceLastCompleted ?? -1) -
            (a.daysSinceLastCompleted ?? -1)
          );
        })
        .map((client) => ({
          name: client.name,
          lastCompletedCleaning:
            client.lastCompletedCleaning,
          daysSinceLastCompleted:
            client.daysSinceLastCompleted,
          nextScheduledCleaning:
            client.nextScheduledCleaning,
        }));

    const clientsByRevenue =
      [...clientInsights]
        .sort(
          (a, b) =>
            b.billedRevenue -
            a.billedRevenue
        )
        .map((client) => ({
          name: client.name,
          billedRevenue:
            client.billedRevenue,
          netAfterHelper:
            client.netAfterHelper,
        }));

    const clientsWithUnpaidBalance =
      clientInsights
        .filter(
          (client) =>
            client.unpaidBalance > 0
        )
        .sort(
          (a, b) =>
            b.unpaidBalance -
            a.unpaidBalance
        )
        .map((client) => ({
          name: client.name,
          unpaidBalance:
            client.unpaidBalance,
        }));

    const clientsRequiringHelpers =
      clientInsights
        .filter(
          (client) =>
            client.active &&
            client.helperNeeded
        )
        .map((client) => client.name);

    const businessMetrics = {
      currentDate: todayDate,
      scheduleMetrics,
      cleaningsByWeekday,
      busiestWeekdays,
      financials: {
        billedRevenueByMonth,
        cashReceivedByMonth,
        helperPayoutsByMonth,
        netAfterHelperByMonth,
        unpaidBalance,
        unpaidByClient,
        billedRevenueByClient,
        helperPayoutsByClient,
        netAfterHelperByClient,
        totalBilledRevenue,
        totalCashReceived,
        totalHelperPayouts,
        totalNetAfterHelper:
          totalBilledRevenue -
          totalHelperPayouts,
      },
      clientInsights,
      clientsByOldestLastCleaning,
      clientsByRevenue,
      clientsWithUnpaidBalance,
      clientsRequiringHelpers,
      pastScheduledCleanings,
      activeClientsWithoutHistory,
    };

    const openai = new OpenAI({
      apiKey: openaiApiKey.value(),
    });

    const response =
      await openai.responses.create({
        model: "gpt-5.6-luna",

        instructions: `
You are Mila Assistant, an assistant for Mila's cleaning business.

Today's Utah date is ${todayDate}.

Use the exact metrics provided in EXACT BUSINESS METRICS whenever they
answer the question. Do not recalculate exact totals if a metric already
exists.

Financial definitions:
- Billed revenue = total amount charged, grouped by payment reference date.
- For Biweekly payments, the payment reference date is periodEnd.
- For Per Cleaning and legacy payments, the payment reference date is 
cleaningDate.
- Cash received = paid payments, grouped by paid date.
- Unpaid balance = total amount still unpaid.
- Net after helper = billed revenue minus helper payouts.
- Net after helper is not true profit because other expenses are not
  included.

Schedule definitions:
- today = today's Utah date.
- this week = Monday through Sunday of the current week.
- next week = Monday through Sunday of the following week.
- cancelled cleanings are excluded from schedule totals.
- cleanings by weekday counts all non-cancelled cleanings in the data.
- busiest weekdays are the weekday or weekdays with the highest count.
- past scheduled cleanings are appointments dated before today that are
  still marked Scheduled. They may need completion review.

Client insight definitions:
- last completed cleaning is the most recent Completed cleaning.
- days since last completed is calculated from today's Utah date.
- next scheduled cleaning is the soonest Scheduled cleaning on or after
  today.
- client revenue uses payment records associated with that client.
- clients by oldest last cleaning ranks active clients from least recent.
- clients by revenue ranks clients from highest billed revenue to lowest.
- clients with unpaid balance is already sorted from highest to lowest.
- active clients without history have no Completed cleaning in the data.

Use the safe business data provided to answer questions about clients,
cleanings, schedules, and payments.

Do not invent information.
If the answer is not supported by the provided data, say you do not have
enough information.
Keep answers clear and concise.
`,

        input: `
EXACT BUSINESS METRICS:
${JSON.stringify(businessMetrics)}

SAFE BUSINESS DATA

Clients:
${JSON.stringify(clients)}

Cleanings:
${JSON.stringify(cleanings)}

Payments:
${JSON.stringify(payments)}

CONVERSATION HISTORY:
${JSON.stringify(safeHistory)}

CURRENT QUESTION:
${question.trim()}
`,
      });

    return {
      answer: response.output_text,
    };
  }
);
