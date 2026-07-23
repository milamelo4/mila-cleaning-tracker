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

export const MemberContext = createContext<MemberContextType | null>(null);

type MemberProviderProps = {
  children: ReactNode;
};

const membersCollection = collection(
  db,
  "businesses",
  "mila-cleaning-tracker",
  "members"
);

export function MemberProvider({ children }: MemberProviderProps) {
  const [user, loadingUser] = useAuthState(auth);
  const [role, setRole] = useState<MemberRole | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [helpers, setHelpers] = useState<Member[]>([]);

  useEffect(() => {
    const loadRole = async () => {
      if (loadingUser) {
        return;
      }
      if (!user) {
        setRole(null);
        setLoadingRole(false);
        return;
      }

      setLoadingRole(true);

      const memberDoc = doc(
        db,
        "businesses",
        "mila-cleaning-tracker",
        "members",
        user.uid
      );

      const snapshot = await getDoc(memberDoc);

      if (!snapshot.exists()) {
        setRole(null);
        setLoadingRole(false);
        return;
      }

      const memberData = snapshot.data();
      const currentRole = memberData.role as MemberRole;

      setRole(currentRole);

      if (currentRole === "admin") {
        const helpersQuery = query(
          membersCollection,
          where("role", "==", "helper")
        );

      const helpersSnapshot = await getDocs(helpersQuery);

      const savedHelpers = helpersSnapshot.docs.map((helperDoc) => {
      const helperData = helperDoc.data() as Omit<Member, "uid">;

      return {
        ...helperData,
        uid: helperDoc.id,
      };
    });

    setHelpers(savedHelpers);
  } else {
    setHelpers([]);
  }

  setLoadingRole(false);
    };

      loadRole();
    }, [user, loadingUser]);

    return (
      <MemberContext.Provider value={{ role, loadingRole, helpers }}>
        {children}
      </MemberContext.Provider>
    );
}