export type PaymentBillingType =
  | "Per Cleaning"
  | "Biweekly"
  | "Fixed Monthly";

export interface Payment {
  firestoreId?: string;

  clientId: string;
  clientName: string;

  /*
   * Older payment records do not have billingType yet,
   * so this stays optional during the migration.
   */
  billingType?: PaymentBillingType;

  /*
   * Per-cleaning payments use these.
   *
   * Biweekly payments will leave them blank.
   */
  cleaningId: string;
  cleaningDate: string;

  /*
   * Biweekly payments use these.
   *
   * Existing payments do not have them yet,
   * so they stay optional during the migration.
   */
  periodStart?: string;
  periodEnd?: string;
  includedCleaningIds?: string[];

  amountCharged: number;
  actualHours: number;
  helperPayout: number;

  paid: boolean;
  paidDate: string;

  notes: string;
}