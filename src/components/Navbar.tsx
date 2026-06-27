import { NavLink } from "react-router-dom";

function Navbar() {
  const baseClass =
    "rounded-md px-4 py-2 text-sm font-medium transition-colors";

  return (
    <nav className="flex gap-2 px-6 py-3">
      <NavLink
        to="/"
        className={({ isActive }) =>
          `${baseClass} ${
            isActive
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
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
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
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
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
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
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`
        }
      >
        Payments
      </NavLink>
    </nav>
  );
}

export default Navbar;