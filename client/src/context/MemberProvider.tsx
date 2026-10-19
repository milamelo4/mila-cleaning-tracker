import {
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
import {
  MemberContext,
  type Member,
  type MemberRole,
} from "./MemberContext";

type MemberProviderProps = {
  children: ReactNode;
};

type MemberState = {
  userId: string | null;
  role: MemberRole | null;
  helpers: Member[];
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
  const [user, loadingUser] =
    useAuthState(auth);

  const [memberState, setMemberState] =
    useState<MemberState>({
      userId: null,
      role: null,
      helpers: [],
    });

  const userId = user?.uid ?? null;

  useEffect(() => {
    let cancelled = false;

    const loadMemberAccess = async () => {
      if (loadingUser || !userId) {
        return;
      }

      try {
        const memberDocument = doc(
          db,
          "businesses",
          "mila-cleaning-tracker",
          "members",
          userId
        );

        const snapshot =
          await getDoc(memberDocument);

        if (cancelled) {
          return;
        }

        if (!snapshot.exists()) {
          setMemberState({
            userId,
            role: null,
            helpers: [],
          });
          return;
        }

        const memberData =
          snapshot.data();

        const currentRole =
          memberData.role;

        if (!isMemberRole(currentRole)) {
          setMemberState({
            userId,
            role: null,
            helpers: [],
          });
          return;
        }

        if (currentRole !== "admin") {
          setMemberState({
            userId,
            role: currentRole,
            helpers: [],
          });
          return;
        }

        const helpersQuery = query(
          membersCollection,
          where("role", "==", "helper")
        );

        const helpersSnapshot =
          await getDocs(helpersQuery);

        if (cancelled) {
          return;
        }

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

        setMemberState({
          userId,
          role: currentRole,
          helpers: savedHelpers,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "Failed to load member access:",
          error
        );

        setMemberState({
          userId,
          role: null,
          helpers: [],
        });
      }
    };

    void loadMemberAccess();

    return () => {
      cancelled = true;
    };
  }, [userId, loadingUser]);

  const stateBelongsToCurrentUser =
    userId !== null &&
    memberState.userId === userId;

  const role =
    stateBelongsToCurrentUser
      ? memberState.role
      : null;

  const helpers =
    stateBelongsToCurrentUser
      ? memberState.helpers
      : [];

  const loadingRole =
    loadingUser ||
    (
      userId !== null &&
      !stateBelongsToCurrentUser
    );

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