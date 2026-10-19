import {
  createContext,
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
  getDocs,
  updateDoc,
} from "firebase/firestore";

import { useAuthState } from "react-firebase-hooks/auth";

import { auth, db } from "../firebase";
import type { Payment } from "../types/payment";
import { MemberContext } from "./MemberContext";

type PaymentContextType = {
  payments: Payment[];
  addPayment: (payment: Payment) => Promise<void>;
  updatePayment: (payment: Payment) => Promise<void>;
  deletePayment: (firestoreId: string) => Promise<void>;
};

export const PaymentContext =
  createContext<PaymentContextType | null>(null);

type PaymentProviderProps = {
  children: ReactNode;
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
  const [payments, setPayments] = useState<Payment[]>([]);
  const [user] = useAuthState(auth);

  const memberContext = useContext(MemberContext);

  if (!memberContext) {
    throw new Error("MemberContext not found");
  }

  const { role, loadingRole } = memberContext;

  useEffect(() => {
    const loadPayments = async () => {
      if (!user || loadingRole) {
        return;
      }

      if (role !== "admin") {
        setPayments([]);
        return;
      }

      const snapshot = await getDocs(paymentsCollection);

      const savedPayments = snapshot.docs.map(
        (paymentDoc) => {
          const data = paymentDoc.data() as Omit<
            Payment,
            "firestoreId"
          >;

          return {
            ...data,
            firestoreId: paymentDoc.id,
          };
        }
      );

      setPayments(savedPayments);
    };

    loadPayments();
  }, [user, role, loadingRole]);

  const addPayment = async (payment: Payment) => {
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

    const paymentData = getPaymentData(payment);

    const documentReference = await addDoc(
      paymentsCollection,
      paymentData
    );

    setPayments((currentPayments) => [
      ...currentPayments,
      {
        ...payment,
        firestoreId: documentReference.id,
      },
    ]);
  };

  const updatePayment = async (payment: Payment) => {
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
      db,
      "businesses",
      "mila-cleaning-tracker",
      "payments",
      payment.firestoreId
    );

    const paymentData = getPaymentData(payment);

    await updateDoc(paymentDocument, paymentData);

    setPayments((currentPayments) =>
      currentPayments.map((savedPayment) =>
        savedPayment.firestoreId === payment.firestoreId
          ? payment
          : savedPayment
      )
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
      db,
      "businesses",
      "mila-cleaning-tracker",
      "payments",
      firestoreId
    );

    await deleteDoc(paymentDocument);

    setPayments((currentPayments) =>
      currentPayments.filter(
        (payment) =>
          payment.firestoreId !== firestoreId
      )
    );
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