import type {
  ClientSummary,
  CleaningSummary,
  PaymentSummary,
} from "../types/business";

type SafeHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

type BuildAssistantInputParams = {
  businessMetrics: unknown;
  clients: ClientSummary[];
  cleanings: CleaningSummary[];
  payments: PaymentSummary[];
  history: SafeHistoryMessage[];
  question: string;
};

/**
 * Builds the system instructions for Mila Assistant.
 * @param {string} todayDate Current Utah date.
 * @return {string} Assistant instructions.
 */
export function buildAssistantInstructions(
  todayDate: string
): string {
  return `
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
- Remaining scheduled cleanings = future cleanings still marked Scheduled.
- Remaining scheduled revenue = revenue expected from those scheduled cleanings,
  calculated using each client's billing type.
- Projected billed revenue = billed revenue already recorded plus remaining
  scheduled revenue.
- For Per Cleaning clients, each future cleaning uses pricePerCleaning.
- For Fixed Monthly clients, monthlyRate is counted once per client/month.
- For Biweekly clients, biweeklyRate is counted once per 14-day billing period.
- Use projectedBilledRevenueByMonth for monthly revenue projections instead of
  calculating a projection yourself.  

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
`;
}

/**
 * Builds the user input sent to Mila Assistant.
 * @param {BuildAssistantInputParams} params Assistant context.
 * @return {string} Assistant input.
 */
export function buildAssistantInput({
  businessMetrics,
  clients,
  cleanings,
  payments,
  history,
  question,
}: BuildAssistantInputParams): string {
  return `
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
${JSON.stringify(history)}

CURRENT QUESTION:
${question.trim()}
`;
}
