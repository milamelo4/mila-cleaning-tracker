import {
  createContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { doc, getDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";

type MemberRole = "admin" | "helper";

type MemberContextType = {
  role: MemberRole | null;
  loadingRole: boolean;
};

export const MemberContext = createContext<MemberContextType | null>(null);

type MemberProviderProps = {
  children: ReactNode;
};

export function MemberProvider({ children }: MemberProviderProps) {
  const [user] = useAuthState(auth);
  const [role, setRole] = useState<MemberRole | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    const loadRole = async () => {
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

      setRole(memberData.role as MemberRole);
      setLoadingRole(false);
    };

    loadRole();
  }, [user]);

  return (
    <MemberContext.Provider value={{ role, loadingRole }}>
      {children}
    </MemberContext.Provider>
  );
}