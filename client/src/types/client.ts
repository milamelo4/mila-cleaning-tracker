export type BillingType =
  | "Per Cleaning"
  | "Fixed Monthly";

export interface Client {
  id: number;
  firestoreId?: string;

  name: string;
  phone: string;
  address: string;
  gateCode: string;

  billingType: BillingType;

  // Used when billingType is "Per Cleaning".
  pricePerCleaning: number;

  // Used when billingType is "Fixed Monthly".
  // Keep as 0 for per-cleaning clients.
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
  monthlyRate: number;
  startDate: string;
}