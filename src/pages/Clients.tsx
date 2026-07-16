import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  DollarSign,
  MapPin,
  Phone,
  Plus,
} from "lucide-react";
import { ClientContext } from "../context/ClientContext";
import type { Client } from "../types/client";

function getMonthlyEstimate(client: Client) {
  const price = client.pricePerCleaning || 0;

  switch (client.frequency) {
    case "Weekly":
      return price * 4;
    case "Twice Weekly":
      return price * 8;
    case "Twice Monthly":
      return price * 2;
    case "Monthly":
      return price;
    default:
      return 0;
  }
}

function Clients() {
  const navigate = useNavigate();
  const clientContext = useContext(ClientContext);

  if (!clientContext) {
    throw new Error("ClientContext not found");
  }

  const { clients } = clientContext;

  const activeClients = clients.filter((client) => client.active).length;

  const monthlyEstimate = clients.reduce((total, client) => {
    if (!client.active) return total;
    return total + getMonthlyEstimate(client);
  }, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[var(--border-soft)] bg-[var(--card)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--blue-dark)]">
              Client List
            </p>

            <h1 className="mt-1 text-3xl font-bold text-[var(--charcoal)]">
              Clients
            </h1>

            <p className="mt-1 text-[var(--blue-dark)]">
              Manage your cleaning clients, pricing, and schedule details.
            </p>
          </div>

          <button
            onClick={() => navigate("/clients/new")}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--blue-dark)] px-5 py-3 font-semibold text-white transition hover:bg-[var(--blue-hover)] sm:w-auto"
          >
            <Plus size={18} />
            Add Client
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-[var(--cream)] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--blue-dark)]">
              Total
            </p>
            <p className="mt-1 text-2xl font-bold text-[var(--charcoal)]">
              {clients.length}
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--cream)] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--blue-dark)]">
              Active
            </p>
            <p className="mt-1 text-2xl font-bold text-[var(--charcoal)]">
              {activeClients}
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--cream)] p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--blue-dark)]">
              Monthly
            </p>
            <p className="mt-1 text-2xl font-bold text-[var(--charcoal)]">
              ${monthlyEstimate}
            </p>
          </div>
        </div>
      </section>

      {clients.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--border-soft)] bg-[var(--card)] p-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-[var(--charcoal)]">
            No clients yet
          </p>

          <p className="mt-2 text-[var(--charcoal)]">
            Add your first client to start building your cleaning tracker.
          </p>

          <button
            onClick={() => navigate("/clients/new")}
            className="mt-5 rounded-2xl bg-[var(--blue-dark)] px-5 py-3 font-semibold text-white transition hover:bg-[var(--blue-hover)]"
          >
            Add First Client
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {clients.map((client) => (
            <article
              key={client.firestoreId || client.id}
              className="group rounded-3xl border border-[var(--border-soft)] bg-[var(--card)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold text-[var(--charcoal)]">
                      {client.name}
                    </h2>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        client.active
                          ? "bg-[var(--olive-soft)] text-[var(--olive-deep)]"
                          : "bg-[var(--soft)] text-[var(--muted-dark)]"
                      }`}
                    >
                      {client.active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <a
                    href={`https://maps.apple.com/?q=${encodeURIComponent(
                      client.address
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Open in Maps"
                    aria-label={`Open ${client.address} in Maps`}
                    className="mt-3 flex items-start gap-2 text-sm text-[var(--muted)] transition hover:text-[var(--blue-dark)] hover:underline"
                  >
                    <MapPin
                      size={16}
                      strokeWidth={2}
                      className="mt-0.5 shrink-0"
                    />
                    <span>{client.address}</span>
                  </a>
                </div>

                <button
                  onClick={() => navigate(`/clients/${client.firestoreId}`)}
                  className="rounded-full bg-[var(--cream)] p-3 text-[var(--blue-dark)] transition group-hover:bg-[var(--blue-dark)] group-hover:text-white"
                  aria-label={`View details for ${client.name}`}
                >
                  <ArrowRight size={18} />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[var(--cream)] p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--blue-dark)]">
                    Per Cleaning
                  </p>

                  <div className="mt-2 flex items-center gap-2 text-[var(--blue)]">
                    <DollarSign size={16} strokeWidth={2} />
                    <span className="text-xl font-bold">
                      {client.pricePerCleaning}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-[var(--cream)] p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--blue-dark)]">
                    Schedule
                  </p>

                  <div className="mt-2 flex items-center gap-2 text-[var(--charcoal)]">
                    <CalendarDays size={16} strokeWidth={2} />
                    <span className="font-semibold">{client.frequency}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-4 border-t border-[var(--border-soft)] pt-4">
                <a
                  href={`tel:${client.phone.replace(/\D/g, "")}`}
                  className="flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--blue-dark)] hover:underline"
                  title={`Call ${client.name}`}
                  aria-label={`Call ${client.name} at ${client.phone}`}
                >
                  <Phone size={16} strokeWidth={2} />
                  <span>{client.phone}</span>
                </a>

                <button
                  onClick={() => navigate(`/clients/${client.firestoreId}`)}
                  className="flex items-center gap-1 text-sm font-semibold text-[var(--blue-dark)] transition hover:text-[var(--blue)] hover:underline"
                >
                  View Details
                  <ArrowRight size={15} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default Clients;