import {
  createContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  collection,
  addDoc,
  getDocs,
} from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";
import type { Client } from "../types/client";

type ClientContextType = {
  clients: Client[];
  addClient: (client: Client) => Promise<void>;
};

export const ClientContext = createContext<ClientContextType | null>(null);

type ClientProviderProps = {
  children: ReactNode;
};

const clientsCollection = collection(
  db,
  "businesses",
  "mila-cleaning-tracker",
  "clients"
);

export function ClientProvider({ children }: ClientProviderProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [user] = useAuthState(auth);

  useEffect(() => {
    const loadClients = async () => {
      if (!user) {
        setClients([]);
        return;
      }

      const snapshot = await getDocs(clientsCollection);

      const savedClients = snapshot.docs.map((doc) => ({
        firestoreId: doc.id,
        ...doc.data(),
      })) as Client[];

      setClients(savedClients);
    };

    loadClients();
  }, [user]);

  const addClient = async (client: Client) => {
    if (!user) {
      throw new Error("You must be logged in to add a client.");
    }

    await addDoc(clientsCollection, client);

    setClients((prev) => [...prev, client]);
  };

  return (
    <ClientContext.Provider value={{ clients, addClient }}>
      {children}
    </ClientContext.Provider>
  );
}