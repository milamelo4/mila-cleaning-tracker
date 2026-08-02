import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";
import { MemberContext } from "./MemberContext";
import type { Cleaning } from "../types/cleaning";

type CleaningContextType = {
  cleanings: Cleaning[];
  addCleaning: (cleaning: Cleaning) => Promise<void>;
  addCleanings: (cleanings: Cleaning[]) => Promise<void>;
  updateCleaning: (cleaning: Cleaning) => Promise<void>;
  deleteCleaning: (firestoreId: string) => Promise<void>;
};

export const CleaningContext =
  createContext<CleaningContextType | null>(null);

type CleaningProviderProps = {
  children: ReactNode;
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
    date: cleaning.date,
    startTime: cleaning.startTime,
    estimatedHours: cleaning.estimatedHours,
    assignedHelpers: cleaning.assignedHelpers,
    status: cleaning.status,
    notes: cleaning.notes,
  };
};

export function CleaningProvider({
  children,
}: CleaningProviderProps) {
  const [cleanings, setCleanings] = useState<Cleaning[]>([]);
  const [user] = useAuthState(auth);

  const memberContext = useContext(MemberContext);

  if (!memberContext) {
    throw new Error("MemberContext not found");
  }

  const { role, loadingRole } = memberContext;

  useEffect(() => {
    const loadCleanings = async () => {
      if (!user || loadingRole) {
        return;
      }

      if (!role) {
        setCleanings([]);
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
                user.uid
              )
            );

      const snapshot = await getDocs(cleaningsQuery);

      const savedCleanings = snapshot.docs.map(
        (cleaningDoc) => {
          const data = cleaningDoc.data() as Omit<
            Cleaning,
            "firestoreId"
          >;

          return {
            ...data,
            firestoreId: cleaningDoc.id,
            assignedHelpers: data.assignedHelpers ?? [],
          };
        }
      );

      setCleanings(savedCleanings);
    };

    loadCleanings();
  }, [user, role, loadingRole]);

  const addCleanings = async (
    newCleanings: Cleaning[]
  ) => {
    if (!user) {
      throw new Error(
        "You must be logged in to add cleanings."
      );
    }

    if (newCleanings.length === 0) {
      return;
    }

    const batch = writeBatch(db);

    const savedCleanings = newCleanings.map(
      (cleaning) => {
        const cleaningDoc = doc(cleaningsCollection);
        const cleaningData = getCleaningData(cleaning);

        batch.set(cleaningDoc, cleaningData);

        return {
          ...cleaning,
          firestoreId: cleaningDoc.id,
        };
      }
    );

    await batch.commit();

    setCleanings((previousCleanings) => [
      ...previousCleanings,
      ...savedCleanings,
    ]);
  };

  const addCleaning = async (cleaning: Cleaning) => {
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

    setCleanings((previousCleanings) =>
      previousCleanings.map((savedCleaning) =>
        savedCleaning.firestoreId ===
        cleaning.firestoreId
          ? cleaning
          : savedCleaning
      )
    );
  };

  const deleteCleaning = async (
    firestoreId: string
  ) => {
    if (!user) {
      throw new Error(
        "You must be logged in to delete a cleaning."
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

    setCleanings((previousCleanings) =>
      previousCleanings.filter(
        (cleaning) =>
          cleaning.firestoreId !== firestoreId
      )
    );
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