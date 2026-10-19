import { createContext } from "react";

import type { Cleaning } from "../types/cleaning";

export type CleaningContextType = {
  cleanings: Cleaning[];
  addCleaning: (cleaning: Cleaning) => Promise<void>;
  addCleanings: (cleanings: Cleaning[]) => Promise<void>;
  updateCleaning: (cleaning: Cleaning) => Promise<void>;
  deleteCleaning: (firestoreId: string) => Promise<void>;
};

export const CleaningContext =
  createContext<CleaningContextType | null>(null);