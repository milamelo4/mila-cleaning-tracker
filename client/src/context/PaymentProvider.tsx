import {
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

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
  "payments"
);

const getPaymentData = (
  payment: Payment
): Omit<Payment, "firestoreId"> => {
  return {
    cleaningId: payment.cleaningId,
    clientId: payment.clientId,
    clientName: payment.clientName,
    cleaningDate: payment.cleaningDate,
    amountCharged: payment.amountCharged,
    actualHours: payment.actualHours,
    helperPayout: payment.helperPayout,
    paid: payment.paid,
    paidDate: payment.paidDate,
    notes: payment.notes,
  };
};

export function PaymentProvider({
  children,
}: PaymentProviderProps) {
  const [paymentSnapshot, setPaymentSnapshot] =
    useState<PaymentSnapshotState>({
      scopeKey: null,
      payments: [],
    });

  const [user] = useAuthState(auth);

  const memberContext =
    useContext(MemberContext);

  if (!memberContext) {
    throw new Error(
      "MemberContext not found"
    );
  }

  const { role, loadingRole } =
    memberContext;

  const userId = user?.uid ?? null;

  const activeScopeKey =
    !loadingRole &&
    userId &&
    role === "admin"
      ? `${userId}:admin`
      : null;

  useEffect(() => {
    if (!activeScopeKey) {
      return;
    }

    const unsubscribe = onSnapshot(
      paymentsCollection,
      (snapshot) => {
        const savedPayments =
          snapshot.docs.map(
            (paymentDocument) => {
              const data =
                paymentDocument.data() as Omit<
                  Payment,
                  "firestoreId"
                >;

              return {
                ...data,
                firestoreId:
                  paymentDocument.id,
              };
            }
          );

        setPaymentSnapshot({
          scopeKey: activeScopeKey,
          payments: savedPayments,
        });
      },
      (error) => {
        console.error(
          "Failed to listen for payment updates:",
          error
        );

        setPaymentSnapshot({
          scopeKey: activeScopeKey,
          payments: [],
        });
      }
    );

    return unsubscribe;
  }, [activeScopeKey]);

  const payments =
    paymentSnapshot.scopeKey ===
    activeScopeKey
      ? paymentSnapshot.payments
      : [];

  const addPayment = async (
    payment: Payment
  ) => {
    if (!user) {
      throw new Error(
        "You must be logged in to add a payment."
      );
    }

    if (role !== "admin") {
      throw new Error(
        "Only an admin can add a payment."
      );
    }

    const paymentData =
      getPaymentData(payment);

    await addDoc(
      paymentsCollection,
      paymentData
    );
  };

  const updatePayment = async (
    payment: Payment
  ) => {
    if (!user) {
      throw new Error(
        "You must be logged in to update a payment."
      );
    }

    if (role !== "admin") {
      throw new Error(
        "Only an admin can update a payment."
      );
    }

    if (!payment.firestoreId) {
      throw new Error(
        "Payment Firestore ID is missing."
      );
    }

    const paymentDocument = doc(
      paymentsCollection,
      payment.firestoreId
    );

    const paymentData =
      getPaymentData(payment);

    await updateDoc(
      paymentDocument,
      paymentData
    );
  };

  const deletePayment = async (
    firestoreId: string
  ) => {
    if (!user) {
      throw new Error(
        "You must be logged in to delete a payment."
      );
    }

    if (role !== "admin") {
      throw new Error(
        "Only an admin can delete a payment."
      );
    }

    const paymentDocument = doc(
      paymentsCollection,
      firestoreId
    );

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