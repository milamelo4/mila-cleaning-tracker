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
  getDoc,
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
  loadingClients: boolean;
  addClient: (client: Client) => Promise<void>;
  updateClient: (client: Client) => Promise<void>;
  deleteClient: (firestoreId: string) => Promise<void>;
};

export const ClientContext =
  createContext<ClientContextType | null>(null);

type ClientProviderProps = {
  children: ReactNode;
};

const clientsCollection = collection(
  db,
  "businesses",
  "mila-cleaning-tracker",
  "clients"
);

const cleaningsCollection = collection(
  db,
  "businesses",
  "mila-cleaning-tracker",
  "cleanings"
);

export function ClientProvider({
  children,
}: ClientProviderProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [user] = useAuthState(auth);

  const memberContext = useContext(MemberContext);

  if (!memberContext) {
    throw new Error("MemberContext not found");
  }

  const { role, loadingRole } = memberContext;

  useEffect(() => {
    const loadClients = async () => {
      if (loadingRole) {
        return;
      }

      if (!user || !role) {
        setClients([]);
        setLoadingClients(false);
        return;
      }

      setLoadingClients(true);

      try {
        if (role === "admin") {
          const snapshot = await getDocs(clientsCollection);

          const savedClients = snapshot.docs.map(
            (clientDocument) => {
              const data = clientDocument.data() as Omit<
                Client,
                "firestoreId"
              >;

              return {
                ...data,
                firestoreId: clientDocument.id,
                assignedHelpers: data.assignedHelpers ?? [],
              };
            }
          );

          setClients(savedClients);
          return;
        }

        const helperCleaningsQuery = query(
          cleaningsCollection,
          where(
            "assignedHelpers",
            "array-contains",
            user.uid
          )
        );

        const cleaningSnapshot = await getDocs(
          helperCleaningsQuery
        );

        const clientIds = Array.from(
          new Set(
            cleaningSnapshot.docs
              .map((cleaningDocument) => {
                const data = cleaningDocument.data();

                return typeof data.clientId === "string"
                  ? data.clientId
                  : "";
              })
              .filter((clientId) => clientId.length > 0)
          )
        );

        const clientSnapshots = await Promise.all(
          clientIds.map((clientId) =>
            getDoc(
              doc(
                db,
                "businesses",
                "mila-cleaning-tracker",
                "clients",
                clientId
              )
            )
          )
        );

        const helperClients: Client[] = [];

        clientSnapshots.forEach((clientDocument) => {
          if (!clientDocument.exists()) {
            return;
          }

          const data = clientDocument.data() as Omit<
            Client,
            "firestoreId"
          >;

          helperClients.push({
            ...data,
            firestoreId: clientDocument.id,
            assignedHelpers: data.assignedHelpers ?? [],
          });
        });

        setClients(helperClients);
      } catch (error) {
        console.error("Failed to load clients:", error);
        setClients([]);
      } finally {
        setLoadingClients(false);
      }
    };

    void loadClients();
  }, [user, role, loadingRole]);

  const addClient = async (client: Client) => {
    if (!user) {
      throw new Error(
        "You must be logged in to add a client."
      );
    }

    const docRef = await addDoc(
      clientsCollection,
      client
    );

    setClients((previousClients) => [
      ...previousClients,
      {
        ...client,
        firestoreId: docRef.id,
      },
    ]);
  };

  const updateClient = async (client: Client) => {
    if (!user) {
      throw new Error(
        "You must be logged in to update a client."
      );
    }

    if (!client.firestoreId) {
      throw new Error(
        "Client Firestore ID is missing."
      );
    }

    if (!Number.isInteger(client.id)) {
      throw new Error(
        "Client ID must be an integer."
      );
    }

    const clientDocument = doc(
      db,
      "businesses",
      "mila-cleaning-tracker",
      "clients",
      client.firestoreId
    );

    const clientData = {
      id: client.id,
      name: client.name.trim(),
      phone: client.phone,
      address: client.address.trim(),
      gateCode: client.gateCode.trim(),
      pricePerCleaning: Number(
        client.pricePerCleaning
      ),
      startDate: client.startDate,
      estimatedHours: Number(
        client.estimatedHours
      ),
      frequency: client.frequency,
      helperNeeded: Boolean(client.helperNeeded),
      assignedHelpers:
        client.assignedHelpers ?? [],
      notes: client.notes.trim(),
      active: Boolean(client.active),
    };

    await updateDoc(clientDocument, clientData);

    setClients((previousClients) =>
      previousClients.map((savedClient) =>
        savedClient.firestoreId ===
        client.firestoreId
          ? {
              ...client,
              ...clientData,
            }
          : savedClient
      )
    );
  };

  const deleteClient = async (
    firestoreId: string
  ) => {
    if (!user) {
      throw new Error(
        "You must be logged in to delete a client."
      );
    }

    const clientDocument = doc(
      db,
      "businesses",
      "mila-cleaning-tracker",
      "clients",
      firestoreId
    );

    await deleteDoc(clientDocument);

    setClients((previousClients) =>
      previousClients.filter(
        (client) =>
          client.firestoreId !== firestoreId
      )
    );
  };

  return (
    <ClientContext.Provider
      value={{
        clients,
        loadingClients,
        addClient,
        updateClient,
        deleteClient,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
}