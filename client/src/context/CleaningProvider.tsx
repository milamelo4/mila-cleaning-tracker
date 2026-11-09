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

type SavedCleaningData = Omit<Cleaning, "firestoreId">;

type CleaningWithId = {
  id: string;
  data: SavedCleaningData;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

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

const parseIsoDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Billing date is invalid.");
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Billing date is invalid.");
  }

  return date;
};

const formatIsoDate = (date: Date) => {
  return date.toISOString().slice(0, 10);
};

const getBiweeklyPeriod = (cleaningDate: string, anchorDate: string) => {
  const cleaning = parseIsoDate(cleaningDate);

  const anchor = parseIsoDate(anchorDate);

  const differenceInDays = Math.round(
    (cleaning.getTime() - anchor.getTime()) / DAY_IN_MS,
  );

  /*
   * The anchor represents a known
   * END date of a 14-day pay cycle.
   *
   * Example:
   * anchor = 2026-10-05
   *
   * periods:
   * 09/22 - 10/05
   * 10/06 - 10/19
   * 10/20 - 11/02
   */
  const cycleOffset = Math.ceil(differenceInDays / 14);

  const periodEndDate = new Date(
    anchor.getTime() + cycleOffset * 14 * DAY_IN_MS,
  );

  const periodStartDate = new Date(periodEndDate.getTime() - 13 * DAY_IN_MS);

  return {
    periodStart: formatIsoDate(periodStartDate),

    periodEnd: formatIsoDate(periodEndDate),
  };
};

const isDateInRange = (value: unknown, startDate: string, endDate: string) => {
  return typeof value === "string" && value >= startDate && value <= endDate;
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
      clientData.billingType === "Biweekly"
        ? "Biweekly"
        : clientData.billingType === "Fixed Monthly"
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
    // BIWEEKLY — EVERY 14 DAYS
    // =====================================================

    if (billingType === "Biweekly") {
      const biweeklyRate =
        typeof clientData.biweeklyRate === "number"
          ? clientData.biweeklyRate
          : 0;

      const biweeklyAnchorDate =
        typeof clientData.biweeklyAnchorDate === "string"
          ? clientData.biweeklyAnchorDate
          : "";

      if (biweeklyRate <= 0) {
        throw new Error("Client biweekly rate is missing or invalid.");
      }

      if (pricePerCleaning <= 0) {
        throw new Error("Biweekly client needs a valid price per cleaning.");
      }

      const { periodStart, periodEnd } = getBiweeklyPeriod(
        cleaning.date,
        biweeklyAnchorDate,
      );

      /*
       * Find all completed cleanings
       * for this client inside this
       * exact 14-day period.
       */
      const relatedCleaningsQuery = query(
        cleaningsCollection,
        where("clientId", "==", cleaning.clientId),
      );

      const relatedCleaningsSnapshot = await getDocs(relatedCleaningsQuery);

      const completedCleaningsInPeriod: CleaningWithId[] =
        relatedCleaningsSnapshot.docs
          .filter((cleaningDocument) => {
            if (cleaningDocument.id === cleaning.firestoreId) {
              return false;
            }

            const data = cleaningDocument.data();

            return (
              data.status === "Completed" &&
              isDateInRange(data.date, periodStart, periodEnd)
            );
          })
          .map((cleaningDocument) => ({
            id: cleaningDocument.id,

            data: cleaningDocument.data() as SavedCleaningData,
          }));

      const periodCleanings: CleaningWithId[] = [
        ...completedCleaningsInPeriod,
        {
          id: cleaning.firestoreId,

          data: cleaningData,
        },
      ].sort((first, second) =>
        first.data.date.localeCompare(second.data.date),
      );

      const includedCleaningIds = periodCleanings.map(
        (periodCleaning) => periodCleaning.id,
      );

      const actualHours = periodCleanings.reduce((total, periodCleaning) => {
        const hours =
          typeof periodCleaning.data.estimatedHours === "number"
            ? periodCleaning.data.estimatedHours
            : 0;

        return total + hours;
      }, 0);

      const helperPayout = periodCleanings.reduce((total, periodCleaning) => {
        const helpers = Array.isArray(periodCleaning.data.assignedHelpers)
          ? periodCleaning.data.assignedHelpers
          : [];

        if (helpers.length === 0) {
          return total;
        }

        return total + getDefaultHelperPayout(pricePerCleaning, true);
      }, 0);

      if (helperPayout > biweeklyRate) {
        throw new Error(
          "Biweekly helper payout cannot be greater than the biweekly client rate.",
        );
      }

      /*
       * One predictable payment
       * document per 14-day cycle.
       */
      const biweeklyPaymentId = `biweekly_${cleaning.clientId}_${periodEnd}`;

      const biweeklyPaymentDoc = doc(paymentsCollection, biweeklyPaymentId);

      const biweeklyPaymentSnapshot = await getDoc(biweeklyPaymentDoc);

      const now = new Date();

      const today = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
      ].join("-");

      const hasScheduledCleaningsRemaining = relatedCleaningsSnapshot.docs.some(
        (cleaningDocument) => {
          if (cleaningDocument.id === cleaning.firestoreId) {
            return false;
          }

          const data = cleaningDocument.data();

          return (
            data.status === "Scheduled" &&
            isDateInRange(data.date, periodStart, periodEnd)
          );
        },
      );

      /*
       * Do not create the full biweekly payment
       * while the 14-day cycle is still in progress.
       *
       * If an early payment record already exists,
       * remove it.
       */
      if (today < periodEnd || hasScheduledCleaningsRemaining) {
        const pendingBatch = writeBatch(db);

        pendingBatch.update(cleaningDoc, cleaningData);

        if (biweeklyPaymentSnapshot.exists()) {
          pendingBatch.delete(biweeklyPaymentDoc);
        }

        await pendingBatch.commit();

        return;
      }

      /*
       * Find old payment records
       * inside this same 14-day period.
       *
       * This lets us clean up old
       * per-cleaning/monthly records
       * as clients move to Biweekly.
       */
      const clientPaymentsQuery = query(
        paymentsCollection,
        where("clientId", "==", cleaning.clientId),
      );

      const clientPaymentsSnapshot = await getDocs(clientPaymentsQuery);

      const oldPaymentsInPeriod = clientPaymentsSnapshot.docs.filter(
        (paymentDocument) => {
          if (paymentDocument.id === biweeklyPaymentId) {
            return false;
          }

          const data = paymentDocument.data();

          if (data.billingType === "Biweekly") {
            return false;
          }

          return isDateInRange(data.cleaningDate, periodStart, periodEnd);
        },
      );

      const batch = writeBatch(db);

      batch.update(cleaningDoc, cleaningData);

      // ===================================================
      // BIWEEKLY PAYMENT ALREADY EXISTS
      // ===================================================

      if (biweeklyPaymentSnapshot.exists()) {
        /*
         * Keep paid status,
         * paid date and notes.
         *
         * Recalculate work totals.
         */
        batch.update(biweeklyPaymentDoc, {
          billingType: "Biweekly",

          periodStart,

          periodEnd,

          includedCleaningIds,

          amountCharged: biweeklyRate,

          actualHours,

          helperPayout,
        });

        oldPaymentsInPeriod.forEach((paymentDocument) => {
          batch.delete(paymentDocument.ref);
        });

        await batch.commit();

        return;
      }

      // ===================================================
      // FIRST BIWEEKLY PAYMENT FOR THIS PERIOD
      // ===================================================

      /*
       * During migration, preserve
       * paid status only when ALL old
       * records in this period were
       * already marked paid.
       */
      const allOldPaymentsPaid =
        oldPaymentsInPeriod.length > 0 &&
        oldPaymentsInPeriod.every(
          (paymentDocument) => paymentDocument.data().paid === true,
        );

      const oldPaidDates = oldPaymentsInPeriod
        .map((paymentDocument) => paymentDocument.data().paidDate)
        .filter(
          (paidDate): paidDate is string =>
            typeof paidDate === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(paidDate),
        )
        .sort();

      const paidDate =
        allOldPaymentsPaid && oldPaidDates.length > 0
          ? oldPaidDates[oldPaidDates.length - 1]
          : "";

      const biweeklyPaymentData = {
        cleaningId: "",

        clientId: cleaning.clientId,

        clientName,

        cleaningDate: "",

        billingType: "Biweekly",

        periodStart,

        periodEnd,

        includedCleaningIds,

        amountCharged: biweeklyRate,

        actualHours,

        helperPayout,

        paid: allOldPaymentsPaid,

        paidDate,

        notes: "",
      };

      batch.set(biweeklyPaymentDoc, biweeklyPaymentData);

      oldPaymentsInPeriod.forEach((paymentDocument) => {
        batch.delete(paymentDocument.ref);
      });

      await batch.commit();

      return;
    }

    // =====================================================
    // FIXED MONTHLY — LEGACY SUPPORT
    // =====================================================

    const monthlyRate =
      typeof clientData.monthlyRate === "number" ? clientData.monthlyRate : 0;

    if (monthlyRate <= 0) {
      throw new Error("Client monthly rate is missing or invalid.");
    }

    const billingPeriod = getBillingPeriod(cleaning.date);

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

    const monthlyPaymentId = `monthly_${cleaning.clientId}_${billingPeriod}`;

    const monthlyPaymentDoc = doc(paymentsCollection, monthlyPaymentId);

    const monthlyPaymentSnapshot = await getDoc(monthlyPaymentDoc);

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

    if (monthlyPaymentSnapshot.exists()) {
      batch.update(monthlyPaymentDoc, {
        amountCharged: monthlyRate,

        actualHours,

        helperPayout,
      });

      oldPaymentsThisMonth.forEach((paymentDocument) => {
        batch.delete(paymentDocument.ref);
      });

      await batch.commit();

      return;
    }

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
