import { NavLink } from "react-router-dom";

function Navbar() {
 const baseClass =
  "rounded-md px-3 py-2 text-sm font-medium transition-colors";

  return (
    <nav className="flex gap-2 px-4 py-3">
      <NavLink
        to="/dashboard"
        className={({ isActive }) =>
          `${baseClass} ${
            isActive
            ? "bg-[var(--olive-hover)] text-white"
            : "text-[var(--muted-dark)] hover:bg-[var(--soft)]"
          }`
        }
      >
        Dashboard
      </NavLink>

      <NavLink
        to="/clients"
        className={({ isActive }) =>
          `${baseClass} ${
            isActive
            ? "bg-[var(--olive-hover)] text-white"
            : "text-[var(--muted-dark)] hover:bg-[var(--soft)]"
          }`
        }
      >
        Clients
      </NavLink>

      <NavLink
        to="/cleanings"
        className={({ isActive }) =>
          `${baseClass} ${
            isActive
            ? "bg-[var(--olive-hover)] text-white"
            : "text-[var(--muted-dark)] hover:bg-[var(--soft)]"
          }`
        }
      >
        Cleanings
      </NavLink>

      <NavLink
        to="/payments"
        className={({ isActive }) =>
          `${baseClass} ${
            isActive
            ? "bg-[var(--olive-hover)] text-white"
            : "text-[var(--muted-dark)] hover:bg-[var(--soft)]"
          }`
        }
      >
        Payments
      </NavLink>
    </nav>
  );
}

export default Navbar;