import { createContext } from "react";

import type { Payment } from "../types/payment";

export type PaymentContextType = {
  payments: Payment[];
  addPayment: (
    payment: Payment
  ) => Promise<void>;
  updatePayment: (
    payment: Payment
  ) => Promise<void>;
  deletePayment: (
    firestoreId: string
  ) => Promise<void>;
};

export const PaymentContext =
  createContext<PaymentContextType | null>(
    null
  );