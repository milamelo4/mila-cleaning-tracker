export type HistoryMessage = {
  role?: unknown;
  content?: unknown;
};

export type CleaningSummary = {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  startTime: string;
  estimatedHours: number;
  status: string;
};

export type PaymentBillingType =
  | "Per Cleaning"
  | "Biweekly"
  | "Fixed Monthly";

export type PaymentSummary = {
  id: string;
  clientId: string;
  clientName: string;
  billingType?: PaymentBillingType;
  cleaningDate: string;
  periodStart?: string;
  periodEnd?: string;
  amountCharged: number;
  actualHours: number;
  helperPayout: number;
  paid: boolean;
  paidDate: string;
};

export type ClientSummary = {
  id: string;
  name: string;
  pricePerCleaning: number;
  frequency: string;
  helperNeeded: boolean;
  active: boolean;
};
