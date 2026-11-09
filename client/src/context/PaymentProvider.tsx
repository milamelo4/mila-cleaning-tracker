import { useContext, useEffect, useState, type ReactNode } from "react";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

import { useAuthState } from "react-firebase-hooks/auth";

import { auth, db } from "../firebase";
import type { Payment } from "../types/payment";
import { MemberContext } from "./MemberContext";
import { PaymentContext } from "./PaymentContext";

type PaymentProviderProps = {
  children: ReactNode;
};

type PaymentSnapshotState = {
  scopeKey: string | null;
  payments: Payment[];
};

const paymentsCollection = collection(
  db,
  "businesses",
  "mila-cleaning-tracker",
  "payments",
);

const getPaymentData = (payment: Payment) => {
  return {
    clientId: payment.clientId,
    clientName: payment.clientName,

    cleaningId: payment.cleaningId,
    cleaningDate: payment.cleaningDate,

    amountCharged: payment.amountCharged,

    actualHours: payment.actualHours,

    helperPayout: payment.helperPayout,

    paid: payment.paid,
    paidDate: payment.paidDate,
    notes: payment.notes,

    /*
     * New payment fields are only written
     * when they actually exist.
     *
     * This keeps older per-cleaning
     * payments compatible during migration.
     */
    ...(payment.billingType
      ? {
          billingType: payment.billingType,
        }
      : {}),

    ...(payment.periodStart
      ? {
          periodStart: payment.periodStart,
        }
      : {}),

    ...(payment.periodEnd
      ? {
          periodEnd: payment.periodEnd,
        }
      : {}),

    ...(payment.includedCleaningIds
      ? {
          includedCleaningIds: payment.includedCleaningIds,
        }
      : {}),
  };
};

export function PaymentProvider({ children }: PaymentProviderProps) {
  const [paymentSnapshot, setPaymentSnapshot] = useState<PaymentSnapshotState>({
    scopeKey: null,
    payments: [],
  });

  const [user] = useAuthState(auth);

  const memberContext = useContext(MemberContext);

  if (!memberContext) {
    throw new Error("MemberContext not found");
  }

  const { role, loadingRole } = memberContext;

  const userId = user?.uid ?? null;

  const activeScopeKey =
    !loadingRole && userId && role === "admin" ? `${userId}:admin` : null;

  useEffect(() => {
    if (!activeScopeKey) {
      return;
    }

    const unsubscribe = onSnapshot(
      paymentsCollection,

      (snapshot) => {
        const savedPayments = snapshot.docs.map((paymentDocument) => {
          const data = paymentDocument.data();

          const payment: Payment = {
            firestoreId: paymentDocument.id,

            clientId: typeof data.clientId === "string" ? data.clientId : "",

            clientName:
              typeof data.clientName === "string" ? data.clientName : "",

            billingType:
              data.billingType === "Per Cleaning" ||
              data.billingType === "Biweekly" ||
              data.billingType === "Fixed Monthly"
                ? data.billingType
                : undefined,

            cleaningId:
              typeof data.cleaningId === "string" ? data.cleaningId : "",

            cleaningDate:
              typeof data.cleaningDate === "string" ? data.cleaningDate : "",

            periodStart:
              typeof data.periodStart === "string"
                ? data.periodStart
                : undefined,

            periodEnd:
              typeof data.periodEnd === "string" ? data.periodEnd : undefined,

            includedCleaningIds: Array.isArray(data.includedCleaningIds)
              ? data.includedCleaningIds.filter(
                  (cleaningId): cleaningId is string =>
                    typeof cleaningId === "string",
                )
              : undefined,

            amountCharged:
              typeof data.amountCharged === "number" ? data.amountCharged : 0,

            actualHours:
              typeof data.actualHours === "number" ? data.actualHours : 0,

            helperPayout:
              typeof data.helperPayout === "number" ? data.helperPayout : 0,

            paid: data.paid === true,

            paidDate: typeof data.paidDate === "string" ? data.paidDate : "",

            notes: typeof data.notes === "string" ? data.notes : "",
          };

          return payment;
        });

        setPaymentSnapshot({
          scopeKey: activeScopeKey,
          payments: savedPayments,
        });
      },

      (error) => {
        console.error("Failed to listen for payment updates:", error);

        setPaymentSnapshot({
          scopeKey: activeScopeKey,
          payments: [],
        });
      },
    );

    return unsubscribe;
  }, [activeScopeKey]);

  const payments =
    paymentSnapshot.scopeKey === activeScopeKey ? paymentSnapshot.payments : [];

  const addPayment = async (payment: Payment) => {
    if (!user) {
      throw new Error("You must be logged in to add a payment.");
    }

    if (role !== "admin") {
      throw new Error("Only an admin can add a payment.");
    }

    const paymentData = getPaymentData(payment);

    await addDoc(paymentsCollection, paymentData);
  };

  const updatePayment = async (payment: Payment) => {
    if (!user) {
      throw new Error("You must be logged in to update a payment.");
    }

    if (role !== "admin") {
      throw new Error("Only an admin can update a payment.");
    }

    if (!payment.firestoreId) {
      throw new Error("Payment Firestore ID is missing.");
    }

    const paymentDocument = doc(paymentsCollection, payment.firestoreId);

    const paymentData = getPaymentData(payment);

    await updateDoc(paymentDocument, paymentData);
  };

  const deletePayment = async (firestoreId: string) => {
    if (!user) {
      throw new Error("You must be logged in to delete a payment.");
    }

    if (role !== "admin") {
      throw new Error("Only an admin can delete a payment.");
    }

    const paymentDocument = doc(paymentsCollection, firestoreId);

    await deleteDoc(paymentDocument);
  };

  return (
    <PaymentContext.Provider
      value={{
        payments,
        addPayment,
        updatePayment,
        deletePayment,
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
}
