export type BillingType =
  | "Per Cleaning"
  | "Biweekly"
  | "Fixed Monthly";

export interface Client {
  id: number;
  firestoreId?: string;

  name: string;
  phone: string;
  address: string;
  gateCode: string;

  billingType: BillingType;

  // Reference price for one cleaning.
  // Also useful for helper payout calculations.
  pricePerCleaning: number;

  // Amount the client pays every 14 days.
  // Keep as 0 when billingType is not "Biweekly".
  biweeklyRate: number;

  // One known invoice/pay-cycle date.
  // Example for Made by Mary: "2026-10-05".
  // Used to calculate all 14-day billing periods.
  biweeklyAnchorDate: string;

  // Used only when billingType is "Fixed Monthly".
  // Keep as 0 for other billing types.
  monthlyRate: number;

  startDate: string;
  estimatedHours: number;

  frequency:
    | "Weekly"
    | "Twice Weekly"
    | "Twice Monthly"
    | "Monthly"
    | "As Needed";

  helperNeeded: boolean;
  assignedHelpers: string[];

  notes: string;
  pricingNotes: string;
  cleaningInstructions: string;

  active: boolean;
}

export interface ClientFinancial {
  clientId: string;
  billingType: BillingType;

  pricePerCleaning: number;

  biweeklyRate: number;
  biweeklyAnchorDate: string;

  monthlyRate: number;

  startDate: string;
}