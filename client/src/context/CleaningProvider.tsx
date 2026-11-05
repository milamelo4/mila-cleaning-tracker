import { useContext, useEffect, useState, type ReactNode } from "react";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { useAuthState } from "react-firebase-hooks/auth";

import { auth, db } from "../firebase";
import type { Cleaning } from "../types/cleaning";
import { getDefaultHelperPayout } from "../utils/paymentCalculations";
import { CleaningContext } from "./CleaningContext";
import { MemberContext } from "./MemberContext";

type CleaningProviderProps = {
  children: ReactNode;
};

type CleaningSnapshotState = {
  scopeKey: string | null;
  cleanings: Cleaning[];
};

const cleaningsCollection = collection(
  db,
  "businesses",
  "mila-cleaning-tracker",
  "cleanings",
);

const clientsCollection = collection(
  db,
  "businesses",
  "mila-cleaning-tracker",
  "clients",
);

const paymentsCollection = collection(
  db,
  "businesses",
  "mila-cleaning-tracker",
  "payments",
);

const getCleaningData = (cleaning: Cleaning): Omit<Cleaning, "firestoreId"> => {
  return {
    clientId: cleaning.clientId,
    clientName: cleaning.clientName,
    clientPhone: cleaning.clientPhone,
    clientAddress: cleaning.clientAddress,
    clientGateCode: cleaning.clientGateCode,
    clientNotes: cleaning.clientNotes,
    date: cleaning.date,
    startTime: cleaning.startTime,
    estimatedHours: cleaning.estimatedHours,
    assignedHelpers: cleaning.assignedHelpers,
    status: cleaning.status,
    notes: cleaning.notes,
  };
};

const getSavedCleaning = (cleaningDoc: {
  id: string;
  data: () => Record<string, unknown>;
}): Cleaning => {
  const data = cleaningDoc.data() as Partial<Omit<Cleaning, "firestoreId">>;

  return {
    clientId: data.clientId ?? "",
    clientName: data.clientName ?? "",
    clientPhone: data.clientPhone ?? "",
    clientAddress: data.clientAddress ?? "",
    clientGateCode: data.clientGateCode ?? "",
    clientNotes: data.clientNotes ?? "",
    date: data.date ?? "",
    startTime: data.startTime ?? "",
    estimatedHours: data.estimatedHours ?? 0,
    assignedHelpers: data.assignedHelpers ?? [],
    status: data.status ?? "Scheduled",
    notes: data.notes ?? "",
    firestoreId: cleaningDoc.id,
  };
};

const getBillingPeriod = (cleaningDate: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleaningDate)) {
    throw new Error("Cleaning date is invalid.");
  }

  return cleaningDate.slice(0, 7);
};

const isDateInBillingPeriod = (date: unknown, billingPeriod: string) => {
  return typeof date === "string" && date.startsWith(`${billingPeriod}-`);
};

export function CleaningProvider({ children }: CleaningProviderProps) {
  const [cleaningSnapshot, setCleaningSnapshot] =
    useState<CleaningSnapshotState>({
      scopeKey: null,
      cleanings: [],
    });

  const [user] = useAuthState(auth);

  const memberContext = useContext(MemberContext);

  if (!memberContext) {
    throw new Error("MemberContext not found");
  }

  const { role, loadingRole } = memberContext;

  const userId = user?.uid ?? null;

  const activeScopeKey =
    !loadingRole && userId && role ? `${userId}:${role}` : null;

  useEffect(() => {
    if (!activeScopeKey || !userId || !role) {
      return;
    }

    const cleaningsQuery =
      role === "admin"
        ? cleaningsCollection
        : query(
            cleaningsCollection,
            where("assignedHelpers", "array-contains", userId),
          );

    const unsubscribe = onSnapshot(
      cleaningsQuery,
      (snapshot) => {
        const savedCleanings = snapshot.docs.map((cleaningDoc) =>
          getSavedCleaning(cleaningDoc),
        );

        setCleaningSnapshot({
          scopeKey: activeScopeKey,
          cleanings: savedCleanings,
        });
      },
      (error) => {
        console.error("Failed to listen for cleaning updates:", error);

        setCleaningSnapshot({
          scopeKey: activeScopeKey,
          cleanings: [],
        });
      },
    );

    return unsubscribe;
  }, [activeScopeKey, role, userId]);

  const cleanings =
    cleaningSnapshot.scopeKey === activeScopeKey
      ? cleaningSnapshot.cleanings
      : [];

  const addCleanings = async (newCleanings: Cleaning[]) => {
    if (!user) {
      throw new Error("You must be logged in to add cleanings.");
    }

    if (role !== "admin") {
      throw new Error("Only an admin can add cleanings.");
    }

    if (newCleanings.length === 0) {
      return;
    }

    const batch = writeBatch(db);

    newCleanings.forEach((cleaning) => {
      const cleaningDoc = doc(cleaningsCollection);

      batch.set(cleaningDoc, getCleaningData(cleaning));
    });

    await batch.commit();
  };

  const addCleaning = async (cleaning: Cleaning) => {
    await addCleanings([cleaning]);
  };

  const updateCleaning = async (cleaning: Cleaning) => {
    if (!user) {
      throw new Error("You must be logged in to update a cleaning.");
    }

    if (role !== "admin") {
      throw new Error("Only an admin can update cleanings.");
    }

    if (!cleaning.firestoreId) {
      throw new Error("Cleaning Firestore ID is missing.");
    }

    const cleaningDoc = doc(cleaningsCollection, cleaning.firestoreId);

    const cleaningData = getCleaningData(cleaning);

    if (cleaning.status !== "Completed") {
      await updateDoc(cleaningDoc, cleaningData);

      return;
    }

    const clientDoc = doc(clientsCollection, cleaning.clientId);

    const clientSnapshot = await getDoc(clientDoc);

    if (!clientSnapshot.exists()) {
      throw new Error("Client could not be found.");
    }

    const clientData = clientSnapshot.data();

    const clientName =
      typeof clientData.name === "string" ? clientData.name : "";

    if (!clientName.trim()) {
      throw new Error("Client name is missing or invalid.");
    }

    const billingType =
      clientData.billingType === "Fixed Monthly"
        ? "Fixed Monthly"
        : "Per Cleaning";

    const pricePerCleaning =
      typeof clientData.pricePerCleaning === "number"
        ? clientData.pricePerCleaning
        : 0;

    // =====================================================
    // PER CLEANING
    // =====================================================

    if (billingType === "Per Cleaning") {
      const existingPaymentQuery = query(
        paymentsCollection,
        where("cleaningId", "==", cleaning.firestoreId),
      );

      const existingPaymentSnapshot = await getDocs(existingPaymentQuery);

      if (!existingPaymentSnapshot.empty) {
        await updateDoc(cleaningDoc, cleaningData);

        return;
      }

      if (pricePerCleaning <= 0) {
        throw new Error("Client price per cleaning is missing or invalid.");
      }

      const hasHelper = cleaning.assignedHelpers.length > 0;

      const helperPayout = getDefaultHelperPayout(pricePerCleaning, hasHelper);

      const paymentDoc = doc(paymentsCollection, cleaning.firestoreId);

      const paymentData = {
        cleaningId: cleaning.firestoreId,

        clientId: cleaning.clientId,

        clientName,

        cleaningDate: cleaning.date,

        amountCharged: pricePerCleaning,

        actualHours: cleaning.estimatedHours,

        helperPayout,

        paid: false,

        paidDate: "",

        notes: "",
      };

      const batch = writeBatch(db);

      batch.update(cleaningDoc, cleaningData);

      batch.set(paymentDoc, paymentData);

      await batch.commit();

      return;
    }

    // =====================================================
    // FIXED MONTHLY
    // =====================================================

    const monthlyRate =
      typeof clientData.monthlyRate === "number" ? clientData.monthlyRate : 0;

    if (monthlyRate <= 0) {
      throw new Error("Client monthly rate is missing or invalid.");
    }

    const billingPeriod = getBillingPeriod(cleaning.date);

    /*
      Find every cleaning for this client
      so the monthly payment can hold the
      correct total hours/helper payout.
    */
    const relatedCleaningsQuery = query(
      cleaningsCollection,
      where("clientId", "==", cleaning.clientId),
    );

    const relatedCleaningsSnapshot = await getDocs(relatedCleaningsQuery);

    const completedCleaningsThisMonth = relatedCleaningsSnapshot.docs
      .filter((cleaningDocument) => {
        if (cleaningDocument.id === cleaning.firestoreId) {
          return false;
        }

        const data = cleaningDocument.data();

        return (
          data.status === "Completed" &&
          isDateInBillingPeriod(data.date, billingPeriod)
        );
      })
      .map((cleaningDocument) => cleaningDocument.data());

    const monthlyCleanings = [...completedCleaningsThisMonth, cleaningData];

    const actualHours = monthlyCleanings.reduce((total, monthlyCleaning) => {
      const hours =
        typeof monthlyCleaning.estimatedHours === "number"
          ? monthlyCleaning.estimatedHours
          : 0;

      return total + hours;
    }, 0);

    const helperPayout = monthlyCleanings.reduce((total, monthlyCleaning) => {
      const helpers = Array.isArray(monthlyCleaning.assignedHelpers)
        ? monthlyCleaning.assignedHelpers
        : [];

      const hasHelper = helpers.length > 0;

      if (!hasHelper) {
        return total;
      }

      if (pricePerCleaning <= 0) {
        throw new Error(
          "Fixed-monthly client needs a valid reference price per cleaning to calculate helper payout.",
        );
      }

      return total + getDefaultHelperPayout(pricePerCleaning, true);
    }, 0);

    if (helperPayout > monthlyRate) {
      throw new Error(
        "Monthly helper payout cannot be greater than the monthly client rate.",
      );
    }

    /*
      One predictable payment document
      for this client and month.
    */
    const monthlyPaymentId = `monthly_${cleaning.clientId}_${billingPeriod}`;

    const monthlyPaymentDoc = doc(paymentsCollection, monthlyPaymentId);

    const monthlyPaymentSnapshot = await getDoc(monthlyPaymentDoc);

    /*
      Find ALL other payment records for
      this client in this same month.

      These are legacy per-cleaning
      payments such as Mary's $125.
    */
    const clientPaymentsQuery = query(
      paymentsCollection,
      where("clientId", "==", cleaning.clientId),
    );

    const clientPaymentsSnapshot = await getDocs(clientPaymentsQuery);

    const oldPaymentsThisMonth = clientPaymentsSnapshot.docs.filter(
      (paymentDocument) => {
        if (paymentDocument.id === monthlyPaymentId) {
          return false;
        }

        return isDateInBillingPeriod(
          paymentDocument.data().cleaningDate,
          billingPeriod,
        );
      },
    );

    const batch = writeBatch(db);

    batch.update(cleaningDoc, cleaningData);

    // =====================================================
    // MONTHLY PAYMENT ALREADY EXISTS
    // =====================================================

    if (monthlyPaymentSnapshot.exists()) {
      /*
        Keep the existing paid status,
        paid date and notes.

        Only update the monthly financial
        totals.
      */
      batch.update(monthlyPaymentDoc, {
        amountCharged: monthlyRate,

        actualHours,

        helperPayout,
      });

      /*
        Delete every legacy per-cleaning
        payment for the same client/month.

        Mary:
        $1,000 monthly stays
        $125 November payment disappears
      */
      oldPaymentsThisMonth.forEach((paymentDocument) => {
        batch.delete(paymentDocument.ref);
      });

      await batch.commit();

      return;
    }

    // =====================================================
    // FIRST MONTHLY PAYMENT
    // =====================================================

    /*
      If this client already had legacy
      per-cleaning records, preserve the
      paid state only if ALL of those
      records were paid.
    */
    const allOldPaymentsPaid =
      oldPaymentsThisMonth.length > 0 &&
      oldPaymentsThisMonth.every(
        (paymentDocument) => paymentDocument.data().paid === true,
      );

    const oldPaidDates = oldPaymentsThisMonth
      .map((paymentDocument) => paymentDocument.data().paidDate)
      .filter(
        (paidDate): paidDate is string =>
          typeof paidDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(paidDate),
      )
      .sort();

    const paidDate =
      allOldPaymentsPaid && oldPaidDates.length > 0
        ? oldPaidDates[oldPaidDates.length - 1]
        : "";

    const monthlyPaymentData = {
      cleaningId: cleaning.firestoreId,

      clientId: cleaning.clientId,

      clientName,

      cleaningDate: cleaning.date,

      amountCharged: monthlyRate,

      actualHours,

      helperPayout,

      paid: allOldPaymentsPaid,

      paidDate,

      notes: "",
    };

    batch.set(monthlyPaymentDoc, monthlyPaymentData);

    oldPaymentsThisMonth.forEach((paymentDocument) => {
      batch.delete(paymentDocument.ref);
    });

    await batch.commit();
  };

  const deleteCleaning = async (firestoreId: string) => {
    if (!user) {
      throw new Error("You must be logged in to delete a cleaning.");
    }

    if (role !== "admin") {
      throw new Error("Only an admin can delete cleanings.");
    }

    const cleaningDoc = doc(cleaningsCollection, firestoreId);

    await deleteDoc(cleaningDoc);
  };

  return (
    <CleaningContext.Provider
      value={{
        cleanings,
        addCleaning,
        addCleanings,
        updateCleaning,
        deleteCleaning,
      }}
    >
      {children}
    </CleaningContext.Provider>
  );
}
