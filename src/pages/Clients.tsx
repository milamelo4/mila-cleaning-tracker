import { useContext } from "react";
import { useNavigate } from "react-router-dom";
// import { CalendarDays, DollarSign, MapPin, Phone } from "lucide-react";
import { ClientContext } from "../context/ClientContext";


function Clients() {
  const navigate = useNavigate();
  const clientContext = useContext(ClientContext);

  if (!clientContext) {
    throw new Error("ClientContext not found");
  }

  const { clients } = clientContext;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Clients</h1>

        <p className="mt-1 text-slate-500">
          Manage your cleaning clients.
        </p>

        <button
          onClick={() => navigate("/clients/new")}
          className="mt-4 w-full rounded-xl bg-slate-900 py-3 font-medium text-white transition hover:bg-slate-800"
        >
          + Add Client
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-500">No clients yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {clients.map((client) => (
            <div
              key={client.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {client.name}
                  </h2>

                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    {/* <MapPin size={16} strokeWidth={2} /> */}
                    <span>{client.address}</span>
                  </div>
                </div>

                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                    client.active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {client.active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Per Cleaning
                  </p>

                  <div className="mt-1 flex items-center gap-2 text-emerald-600">
                    {/* <DollarSign size={16} strokeWidth={2} /> */}
                    <span className="text-lg font-semibold">
                      {client.pricePerCleaning}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Schedule
                  </p>

                  <div className="mt-1 flex items-center gap-2 text-slate-700">
                    {/* <CalendarDays size={16} strokeWidth={2} /> */}
                    <span>{client.frequency}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                {/* <Phone size={16} strokeWidth={2} /> */}
                <span>{client.phone}</span>
              </div>

              <button className="mt-5 w-full rounded-xl bg-slate-900 py-3 font-medium text-white transition hover:bg-slate-800">
                View Details
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Clients;