import {
  createContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";

type MemberRole = "admin" | "helper";

export type Member = {
  uid: string;
  email: string;
  role: MemberRole;
};

type MemberContextType = {
  role: MemberRole | null;
  loadingRole: boolean;
  helpers: Member[];
};

export const MemberContext =
  createContext<MemberContextType | null>(null);

type MemberProviderProps = {
  children: ReactNode;
};

const membersCollection = collection(
  db,
  "businesses",
  "mila-cleaning-tracker",
  "members"
);

const isMemberRole = (
  value: unknown
): value is MemberRole =>
  value === "admin" || value === "helper";

export function MemberProvider({
  children,
}: MemberProviderProps) {
  const [user, loadingUser] = useAuthState(auth);
  const [role, setRole] =
    useState<MemberRole | null>(null);
  const [loadingRole, setLoadingRole] =
    useState(true);
  const [helpers, setHelpers] =
    useState<Member[]>([]);

  useEffect(() => {
    const loadRole = async () => {
      if (loadingUser) {
        return;
      }

      if (!user) {
        setRole(null);
        setHelpers([]);
        setLoadingRole(false);
        return;
      }

      setLoadingRole(true);

      try {
        const memberDocument = doc(
          db,
          "businesses",
          "mila-cleaning-tracker",
          "members",
          user.uid
        );

        const snapshot = await getDoc(
          memberDocument
        );

        if (!snapshot.exists()) {
          setRole(null);
          setHelpers([]);
          return;
        }

        const memberData = snapshot.data();
        const currentRole = memberData.role;

        if (!isMemberRole(currentRole)) {
          setRole(null);
          setHelpers([]);
          return;
        }

        setRole(currentRole);

        if (currentRole !== "admin") {
          setHelpers([]);
          return;
        }

        const helpersQuery = query(
          membersCollection,
          where("role", "==", "helper")
        );

        const helpersSnapshot =
          await getDocs(helpersQuery);

        const savedHelpers =
          helpersSnapshot.docs.map(
            (helperDocument) => {
              const helperData =
                helperDocument.data();

              return {
                uid: helperDocument.id,
                email:
                  typeof helperData.email ===
                  "string"
                    ? helperData.email
                    : "",
                role: "helper" as const,
              };
            }
          );

        setHelpers(savedHelpers);
      } catch (error) {
        console.error(
          "Failed to load member access:",
          error
        );
        setRole(null);
        setHelpers([]);
      } finally {
        setLoadingRole(false);
      }
    };

    void loadRole();
  }, [user, loadingUser]);

  return (
    <MemberContext.Provider
      value={{
        role,
        loadingRole,
        helpers,
      }}
    >
      {children}
    </MemberContext.Provider>
  );
}