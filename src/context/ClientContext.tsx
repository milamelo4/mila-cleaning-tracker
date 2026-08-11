import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { MemberContext } from "./MemberContext";

import {
  addDoc,
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

const normalizeClient = (
  client: Client
): Client => ({
  ...client,
  assignedHelpers:
    client.assignedHelpers ?? [],
  notes: client.notes ?? "",
  pricingNotes:
    client.pricingNotes ?? "",
  cleaningInstructions:
    client.cleaningInstructions ?? "",
});

const getHelperSafeClientData = (
  client: Client
) => ({
  clientName: client.name.trim(),
  clientPhone: client.phone,
  clientAddress: client.address.trim(),
  clientGateCode: client.gateCode.trim(),

  // Only helper-safe instructions are copied
  // into cleaning documents.
  clientNotes:
    client.cleaningInstructions.trim(),
});

const syncExistingCleaningClientData = async (
  clients: Client[]
) => {
  const clientsByFirestoreId = new Map(
    clients
      .filter(
        (client) => Boolean(client.firestoreId)
      )
      .map((client) => [
        client.firestoreId as string,
        client,
      ])
  );

  const cleaningSnapshot =
    await getDocs(cleaningsCollection);

  const cleaningsToUpdate =
    cleaningSnapshot.docs.filter(
      (cleaningDocument) => {
        const data =
          cleaningDocument.data();

        const clientId =
          typeof data.clientId === "string"
            ? data.clientId
            : "";

        const client =
          clientsByFirestoreId.get(clientId);

        if (!client) {
          return false;
        }

        const safeData =
          getHelperSafeClientData(client);

        return (
          data.clientName !==
            safeData.clientName ||
          data.clientPhone !==
            safeData.clientPhone ||
          data.clientAddress !==
            safeData.clientAddress ||
          data.clientGateCode !==
            safeData.clientGateCode ||
          data.clientNotes !==
            safeData.clientNotes
        );
      }
    );

  const batchSize = 450;

  for (
    let index = 0;
    index < cleaningsToUpdate.length;
    index += batchSize
  ) {
    const batch = writeBatch(db);

    cleaningsToUpdate
      .slice(index, index + batchSize)
      .forEach(
        (cleaningDocument) => {
          const data =
            cleaningDocument.data();

          const clientId =
            typeof data.clientId ===
            "string"
              ? data.clientId
              : "";

          const client =
            clientsByFirestoreId.get(
              clientId
            );

          if (!client) {
            return;
          }

          batch.update(
            cleaningDocument.ref,
            getHelperSafeClientData(
              client
            )
          );
        }
      );

    await batch.commit();
  }
};

export function ClientProvider({
  children,
}: ClientProviderProps) {
  const [clients, setClients] =
    useState<Client[]>([]);
  const [
    loadingClients,
    setLoadingClients,
  ] = useState(true);

  const [user] = useAuthState(auth);

  const memberContext =
    useContext(MemberContext);

  if (!memberContext) {
    throw new Error(
      "MemberContext not found"
    );
  }

  const { role, loadingRole } =
    memberContext;

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

      if (role !== "admin") {
        setClients([]);
        setLoadingClients(false);
        return;
      }

      setLoadingClients(true);

      try {
        const snapshot =
          await getDocs(
            clientsCollection
          );

        const savedClients =
          snapshot.docs.map(
            (clientDocument) => {
              const data =
                clientDocument.data() as Omit<
                  Client,
                  "firestoreId"
                >;

              return normalizeClient({
                ...data,
                firestoreId:
                  clientDocument.id,
              });
            }
          );

        setClients(savedClients);

        try {
          await syncExistingCleaningClientData(
            savedClients
          );
        } catch (error) {
          console.error(
            "Failed to sync helper-safe cleaning details:",
            error
          );
        }
      } catch (error) {
        console.error(
          "Failed to load clients:",
          error
        );
        setClients([]);
      } finally {
        setLoadingClients(false);
      }
    };

    void loadClients();
  }, [user, role, loadingRole]);

  const addClient = async (
    client: Client
  ) => {
    if (!user) {
      throw new Error(
        "You must be logged in to add a client."
      );
    }

    if (role !== "admin") {
      throw new Error(
        "Only an admin can add clients."
      );
    }

    const normalizedClient =
      normalizeClient({
        ...client,
        name: client.name.trim(),
        address:
          client.address.trim(),
        gateCode:
          client.gateCode.trim(),
        notes: client.notes.trim(),
        pricingNotes:
          client.pricingNotes.trim(),
        cleaningInstructions:
          client.cleaningInstructions.trim(),
      });

    const docRef = await addDoc(
      clientsCollection,
      normalizedClient
    );

    setClients(
      (previousClients) => [
        ...previousClients,
        {
          ...normalizedClient,
          firestoreId: docRef.id,
        },
      ]
    );
  };

  const updateClient = async (
    client: Client
  ) => {
    if (!user) {
      throw new Error(
        "You must be logged in to update a client."
      );
    }

    if (role !== "admin") {
      throw new Error(
        "Only an admin can update clients."
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
      address:
        client.address.trim(),
      gateCode:
        client.gateCode.trim(),
      pricePerCleaning: Number(
        client.pricePerCleaning
      ),
      startDate: client.startDate,
      estimatedHours: Number(
        client.estimatedHours
      ),
      frequency: client.frequency,
      helperNeeded: Boolean(
        client.helperNeeded
      ),
      assignedHelpers:
        client.assignedHelpers ?? [],

      // Admin-only fields
      notes:
        client.notes.trim(),
      pricingNotes:
        client.pricingNotes.trim(),

      // Helper-safe field
      cleaningInstructions:
        client.cleaningInstructions.trim(),

      active: Boolean(client.active),
    };

    await updateDoc(
      clientDocument,
      clientData
    );

    const updatedClient =
      normalizeClient({
        ...client,
        ...clientData,
      });

    const relatedCleaningsQuery =
      query(
        cleaningsCollection,
        where(
          "clientId",
          "==",
          client.firestoreId
        )
      );

    const relatedCleanings =
      await getDocs(
        relatedCleaningsQuery
      );

    const safeClientData =
      getHelperSafeClientData(
        updatedClient
      );

    const batchSize = 450;

    for (
      let index = 0;
      index <
      relatedCleanings.docs.length;
      index += batchSize
    ) {
      const batch = writeBatch(db);

      relatedCleanings.docs
        .slice(
          index,
          index + batchSize
        )
        .forEach(
          (cleaningDocument) => {
            batch.update(
              cleaningDocument.ref,
              safeClientData
            );
          }
        );

      await batch.commit();
    }

    setClients(
      (previousClients) =>
        previousClients.map(
          (savedClient) =>
            savedClient.firestoreId ===
            client.firestoreId
              ? updatedClient
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

    if (role !== "admin") {
      throw new Error(
        "Only an admin can delete clients."
      );
    }

    const clientDocument = doc(
      db,
      "businesses",
      "mila-cleaning-tracker",
      "clients",
      firestoreId
    );

    await deleteDoc(
      clientDocument
    );

    setClients(
      (previousClients) =>
        previousClients.filter(
          (client) =>
            client.firestoreId !==
            firestoreId
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