import { useContext, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";

import { auth } from "../firebase";
import { MemberContext } from "../context/MemberContext";

type MemberRole = "admin" | "helper";

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: MemberRole[];
};

function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const [user, loadingUser] = useAuthState(auth);
  const memberContext = useContext(MemberContext);

  if (!memberContext) {
    throw new Error("MemberContext not found");
  }

  const { role, loadingRole } = memberContext;

  if (loadingUser || loadingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)]">
        <p className="text-[var(--muted)]">
          Checking access...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--cream)]">
        <p className="text-[var(--muted)]">
          Your account does not have access yet.
        </p>
      </div>
    );
  }

  if (
    allowedRoles &&
    !allowedRoles.includes(role)
  ) {
    return (
      <Navigate
        to={
          role === "helper"
            ? "/cleanings"
            : "/dashboard"
        }
        replace
      />
    );
  }

  return children;
}

export default ProtectedRoute;