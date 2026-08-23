import { useContext } from "react";
import { NavLink } from "react-router-dom";
import { MemberContext } from "../context/MemberContext";

import { HomeIcon} from "lucide-react";  

function Navbar() {
  const memberContext = useContext(MemberContext);

  if (!memberContext) {
    throw new Error("MemberContext not found");
  }

  const { role, loadingRole } = memberContext;

  const baseClass =
    "rounded-md px-3 py-2 text-sm font-medium transition-colors";

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
    <nav className="flex items-center pr-3 pl-2 py-3">
      {role === "admin" ? (
        <>
          <NavLink
            to="/dashboard"
            className={getLinkClass}
          >
            <HomeIcon className=" inline h-4 w-4" />
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