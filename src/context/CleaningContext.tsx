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
  query,
  updateDoc,
  where,
} from "firebase/firestore";

import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";
import { MemberContext } from "./MemberContext";
import type { Cleaning } from "../types/cleaning";

type CleaningContextType = {
  cleanings: Cleaning[];
  addCleaning: (cleaning: Cleaning) => Promise<void>;
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

export function CleaningProvider({ children }: CleaningProviderProps) {
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
              where("assignedHelpers", "array-contains", user.uid)
            );

      const snapshot = await getDocs(cleaningsQuery);

      const savedCleanings = snapshot.docs.map((cleaningDoc) => {
        const data = cleaningDoc.data() as Omit<
          Cleaning,
          "firestoreId"
        >;

        return {
          ...data,
          firestoreId: cleaningDoc.id,
          assignedHelpers: data.assignedHelpers ?? [],
        };
      });

      setCleanings(savedCleanings);
    };

    loadCleanings();
  }, [user, role, loadingRole]);

  const addCleaning = async (cleaning: Cleaning) => {
    if (!user) {
      throw new Error("You must be logged in to add a cleaning.");
    }

    const { firestoreId, ...cleaningData } = cleaning;
    const docRef = await addDoc(cleaningsCollection, cleaningData);

    setCleanings((previousCleanings) => [
      ...previousCleanings,
      {
        ...cleaning,
        firestoreId: docRef.id,
      },
    ]);
  };

  const updateCleaning = async (cleaning: Cleaning) => {
    if (!user) {
      throw new Error("You must be logged in to update a cleaning.");
    }

    if (!cleaning.firestoreId) {
      throw new Error("Cleaning Firestore ID is missing.");
    }

    const cleaningDoc = doc(
      db,
      "businesses",
      "mila-cleaning-tracker",
      "cleanings",
      cleaning.firestoreId
    );

    const { firestoreId, ...cleaningData } = cleaning;

    await updateDoc(cleaningDoc, cleaningData);

    setCleanings((previousCleanings) =>
      previousCleanings.map((savedCleaning) =>
        savedCleaning.firestoreId === firestoreId
          ? cleaning
          : savedCleaning
      )
    );
  };

  const deleteCleaning = async (firestoreId: string) => {
    if (!user) {
      throw new Error("You must be logged in to delete a cleaning.");
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
        (cleaning) => cleaning.firestoreId !== firestoreId
      )
    );
  };

  return (
    <CleaningContext.Provider
      value={{
        cleanings,
        addCleaning,
        updateCleaning,
        deleteCleaning,
      }}
    >
      {children}
    </CleaningContext.Provider>
  );
}