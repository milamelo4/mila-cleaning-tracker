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
  assignedHelpers: string[];
  status: string;
};

export type BillingType =
  | "Per Cleaning"
  | "Biweekly"
  | "Fixed Monthly";

export type PaymentBillingType = BillingType;

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
  billingType: BillingType;
  pricePerCleaning: number;
  monthlyRate: number;
  biweeklyRate: number;
  biweeklyAnchorDate: string;
  frequency: string;
  helperNeeded: boolean;
  active: boolean;
};
