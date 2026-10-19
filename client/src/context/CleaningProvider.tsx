import {
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { useAuthState } from "react-firebase-hooks/auth";

import { auth, db } from "../firebase";
import type { Cleaning } from "../types/cleaning";
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
  "cleanings"
);

const getCleaningData = (
  cleaning: Cleaning
): Omit<Cleaning, "firestoreId"> => {
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

const getSavedCleaning = (
  cleaningDoc: {
    id: string;
    data: () => Record<string, unknown>;
  }
): Cleaning => {
  const data = cleaningDoc.data() as Partial<
    Omit<Cleaning, "firestoreId">
  >;

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

export function CleaningProvider({
  children,
}: CleaningProviderProps) {
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
    !loadingRole && userId && role
      ? `${userId}:${role}`
      : null;

  useEffect(() => {
    if (!activeScopeKey || !userId || !role) {
      return;
    }

    const cleaningsQuery =
      role === "admin"
        ? cleaningsCollection
        : query(
            cleaningsCollection,
            where(
              "assignedHelpers",
              "array-contains",
              userId
            )
          );

    const unsubscribe = onSnapshot(
      cleaningsQuery,
      (snapshot) => {
        const savedCleanings = snapshot.docs.map(
          (cleaningDoc) =>
            getSavedCleaning(cleaningDoc)
        );

        setCleaningSnapshot({
          scopeKey: activeScopeKey,
          cleanings: savedCleanings,
        });
      },
      (error) => {
        console.error(
          "Failed to listen for cleaning updates:",
          error
        );

        setCleaningSnapshot({
          scopeKey: activeScopeKey,
          cleanings: [],
        });
      }
    );

    return unsubscribe;
  }, [activeScopeKey, role, userId]);

  const cleanings =
    cleaningSnapshot.scopeKey === activeScopeKey
      ? cleaningSnapshot.cleanings
      : [];

  const addCleanings = async (
    newCleanings: Cleaning[]
  ) => {
    if (!user) {
      throw new Error(
        "You must be logged in to add cleanings."
      );
    }

    if (role !== "admin") {
      throw new Error(
        "Only an admin can add cleanings."
      );
    }

    if (newCleanings.length === 0) {
      return;
    }

    const batch = writeBatch(db);

    newCleanings.forEach((cleaning) => {
      const cleaningDoc = doc(cleaningsCollection);
      const cleaningData = getCleaningData(cleaning);

      batch.set(cleaningDoc, cleaningData);
    });

    await batch.commit();
  };

  const addCleaning = async (
    cleaning: Cleaning
  ) => {
    await addCleanings([cleaning]);
  };

  const updateCleaning = async (
    cleaning: Cleaning
  ) => {
    if (!user) {
      throw new Error(
        "You must be logged in to update a cleaning."
      );
    }

    if (role !== "admin") {
      throw new Error(
        "Only an admin can update cleanings."
      );
    }

    if (!cleaning.firestoreId) {
      throw new Error(
        "Cleaning Firestore ID is missing."
      );
    }

    const cleaningDoc = doc(
      db,
      "businesses",
      "mila-cleaning-tracker",
      "cleanings",
      cleaning.firestoreId
    );

    const cleaningData = getCleaningData(cleaning);

    await updateDoc(cleaningDoc, cleaningData);
  };

  const deleteCleaning = async (
    firestoreId: string
  ) => {
    if (!user) {
      throw new Error(
        "You must be logged in to delete a cleaning."
      );
    }

    if (role !== "admin") {
      throw new Error(
        "Only an admin can delete cleanings."
      );
    }

    const cleaningDoc = doc(
      db,
      "businesses",
      "mila-cleaning-tracker",
      "cleanings",
      firestoreId
    );

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