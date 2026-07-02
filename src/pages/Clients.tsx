import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, DollarSign, MapPin, Phone } from "lucide-react";
import { ClientContext } from "../context/ClientContext";

function Clients() {
  const navigate = useNavigate();
  const clientContext = useContext(ClientContext);

  if (!clientContext) {
    throw new Error("ClientContext not found");
  }

  const { clients } = clientContext;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--charcoal)]">
          Clients
        </h1>

        <p className="mt-1 text-[var(--muted)]">
          Manage your cleaning clients.
        </p>

        <button
          onClick={() => navigate("/clients/new")}
          className="mt-4 w-full rounded-xl bg-[var(--olive)] py-3 font-medium text-white transition hover:bg-[var(--olive-hover)]"
        >
          + Add Client
        </button>
      </div>

    {clients.length === 0 ? (
      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--card)] p-8 text-center shadow-sm">
        <p className="text-[var(--muted)]">No clients yet.</p>
      </div>
    ) : (
      <div className="space-y-4">
        {clients.map((client) => (
          <div
            key={client.id}
            className="rounded-2xl border border-[var(--border-soft)] bg-[var(--card)] p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[var(--charcoal)]">
                  {client.name}
                </h2>

                <a
                  href={`https://maps.apple.com/?q=${encodeURIComponent(
                    client.address
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Open in Maps"
                  aria-label={`Open ${client.address} in Maps`}
                  className="mt-2 flex items-center gap-2 text-sm text-[var(--muted)] transition hover:text-[var(--olive-dark)] hover:underline"
                >
                  <MapPin size={16} strokeWidth={2} />
                  <span>{client.address}</span>
                </a>
              </div>

              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                  client.active
                    ? "bg-[var(--olive-soft)] text-[var(--olive)]"
                    : "bg-[var(--soft)] text-[var(--muted)]"
                }`}
              >
                {client.active ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                  Per Cleaning
                </p>

                <div className="mt-1 flex items-center gap-2 text-[var(--olive)]">
                  <DollarSign size={16} strokeWidth={2} />
                  <span className="text-lg font-semibold">
                    {client.pricePerCleaning}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
                  Schedule
                </p>

                <div className="mt-1 flex items-center gap-2 text-[var(--muted)]">
                  <CalendarDays size={16} strokeWidth={2} />
                  <span>{client.frequency}</span>
                </div>
              </div>
            </div>

            <a
              href={`tel:${client.phone.replace(/\D/g, "")}`}
              className="mt-5 flex items-center gap-2 border-t border-[var(--border-soft)] pt-4 text-sm text-[var(--muted)] transition hover:text-[var(--olive-dark)] hover:underline"
              title={`Call ${client.name}`}
              aria-label={`Call ${client.name} at ${client.phone}`}
            >
              <Phone size={16} strokeWidth={2} />
              <span>{client.phone}</span>
            </a>

            <button className="mt-5 w-full rounded-xl bg-[var(--olive-dark)] py-3 font-medium text-white transition hover:bg-[var(--olive)]">
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