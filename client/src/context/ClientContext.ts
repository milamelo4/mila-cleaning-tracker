import { createContext } from "react";

import type { Client } from "../types/client";

export type ClientContextType = {
  clients: Client[];
  loadingClients: boolean;
  addClient: (client: Client) => Promise<void>;
  updateClient: (client: Client) => Promise<void>;
  deleteClient: (
    firestoreId: string
  ) => Promise<void>;
};

export const ClientContext =
  createContext<ClientContextType | null>(null);