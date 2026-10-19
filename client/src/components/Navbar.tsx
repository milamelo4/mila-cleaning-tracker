import { useContext } from "react";
import { NavLink } from "react-router-dom";
import { HomeIcon, Sparkles } from "lucide-react";

import { MemberContext } from "../context/MemberContext";

function Navbar() {
  const memberContext = useContext(MemberContext);

  if (!memberContext) {
    throw new Error("MemberContext not found");
  }

  const { role, loadingRole } = memberContext;

  const baseClass =
    "rounded-md px-2 py-2 text-sm font-medium transition-colors";

  const getLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${baseClass} ${
      isActive
        ? "bg-[var(--blue-hover)] text-white"
        : "text-[var(--muted-dark)] hover:bg-[var(--soft)]"
    }`;

  if (loadingRole) {
    return null;
  }

  return (
    <nav className="flex items-center px-2 py-3">
      {role === "admin" ? (
        <>
          <NavLink
            to="/dashboard"
            className={getLinkClass}
            aria-label="Dashboard"
            title="Dashboard"
          >
            <HomeIcon className="h-4 w-4" />
          </NavLink>

          <NavLink
            to="/clients"
            className={getLinkClass}
          >
            Clients
          </NavLink>

          <NavLink
            to="/cleanings"
            className={getLinkClass}
          >
            Cleanings
          </NavLink>

          <NavLink
            to="/payments"
            className={getLinkClass}
          >
            Payments
          </NavLink>

          <NavLink
            to="/finances"
            className={getLinkClass}
          >
            Finances
          </NavLink>

          <NavLink
            to="/assistant"
            className={getLinkClass}
            aria-label="Mila Assistant"
            title="Mila Assistant"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />

              <span className="hidden sm:inline">
                Assistant
              </span>
            </span>
          </NavLink>
        </>
      ) : (
        <NavLink
          to="/cleanings"
          className={getLinkClass}
        >
          My Cleanings
        </NavLink>
      )}
    </nav>
  );
}

export default Navbar;