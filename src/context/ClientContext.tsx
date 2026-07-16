import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { MemberContext } from "./MemberContext";

import {
  collection,
  addDoc,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";

import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";
import type { Client } from "../types/client";

type ClientContextType = {
  clients: Client[];
  addClient: (client: Client) => Promise<void>;
  updateClient: (client: Client) => Promise<void>;
  deleteClient: (firestoreId: string) => Promise<void>;
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

  const memberContext = useContext(MemberContext);

  if (!memberContext) {
    throw new Error("MemberContext not found");
  }

  const { role, loadingRole } = memberContext;

useEffect(() => {
  const loadClients = async () => {
    if (!user || loadingRole) {
      return;
    }

    if (!role) {
      setClients([]);
      return;
    }

    const clientsQuery =
      role === "admin"
        ? clientsCollection
        : query(
            clientsCollection,
            where("assignedHelpers", "array-contains", user.uid)
          );

  const snapshot = await getDocs(clientsQuery);

  const savedClients = snapshot.docs.map((doc) => {
  const data = doc.data() as Omit<Client, "firestoreId">;

    return {
      ...data,
      firestoreId: doc.id,
      assignedHelpers: data.assignedHelpers ?? [],
    };
});

    setClients(savedClients);
  };

  loadClients();
}, [user, role, loadingRole]);

  const addClient = async (client: Client) => {
    if (!user) {
      throw new Error("You must be logged in to add a client.");
    }

    const docRef = await addDoc(clientsCollection, client);

    setClients((prev) => [
      ...prev,
      {
        ...client,
        firestoreId: docRef.id,
      },
    ]);
  };

  const updateClient = async (client: Client) => {
    if (!user) {
      throw new Error("You must be logged in to update a client.");
    }

    if (!client.firestoreId) {
      throw new Error("Client Firestore ID is missing.");
    }

    const clientDoc = doc(
      db,
      "businesses",
      "mila-cleaning-tracker",
      "clients",
      client.firestoreId
    );

    const { firestoreId, ...clientData } = client;

    await updateDoc(clientDoc, clientData);

    setClients((prev) =>
      prev.map((savedClient) =>
        savedClient.firestoreId === firestoreId
          ? client
          : savedClient
      )
    );
  };

  const deleteClient = async (firestoreId: string) => {
    if (!user) {
      throw new Error("You must be logged in to delete a client.");
    }

    const clientDoc = doc(
      db,
      "businesses",
      "mila-cleaning-tracker",
      "clients",
      firestoreId
    );

    await deleteDoc(clientDoc);

    setClients((prev) =>
      prev.filter((client) => client.firestoreId !== firestoreId)
    );
  };

  return (
    <ClientContext.Provider value={{ clients, addClient, updateClient, deleteClient }}>
      {children}
    </ClientContext.Provider>
  );
}