import { createContext } from "react";

export type MemberRole =
  | "admin"
  | "helper";

export type Member = {
  uid: string;
  email: string;
  role: MemberRole;
};

export type MemberContextType = {
  role: MemberRole | null;
  loadingRole: boolean;
  helpers: Member[];
};

export const MemberContext =
  createContext<MemberContextType | null>(
    null
  );