import {
  createContext,
  useState,
  type ReactNode,
} from "react";
import type { Client } from "../types/client";

type ClientContextType = {
  clients: Client[];
  addClient: (client: Client) => void;
};

export const ClientContext = createContext<ClientContextType | null>(null);

type ClientProviderProps = {
  children: ReactNode;
};

export function ClientProvider({ children }: ClientProviderProps) {
  const [clients, setClients] = useState<Client[]>([]);

  const addClient = (client: Client) => {
    setClients((prev) => [...prev, client]);
  };

  return (
    <ClientContext.Provider value={{ clients, addClient }}>
      {children}
    </ClientContext.Provider>
  );
}