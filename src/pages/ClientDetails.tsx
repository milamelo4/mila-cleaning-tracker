import { useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarDays, DollarSign, MapPin, Phone } from "lucide-react";
import { ClientContext } from "../context/ClientContext";

function ClientDetails() {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const clientContext = useContext(ClientContext);

  if (!clientContext) {
    throw new Error("ClientContext not found");
  }

  const { clients } = clientContext;

  const client = clients.find(
    (client) => client.firestoreId === clientId
  );

  if (!client) {
    return (
      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--card)] p-6 shadow-sm">
        <p className="text-[var(--muted)]">Client not found.</p>

        <button
          onClick={() => navigate("/clients")}
          className="mt-4 rounded-xl bg-[var(--olive-dark)] px-4 py-2 font-medium text-white"
        >
          Back to Clients
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate("/clients")}
        className="mb-4 text-sm font-medium text-[var(--olive)] hover:underline"
      >
        ← Back to Clients
      </button>

      <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--card)] p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[var(--charcoal)]">
            {client.name}
          </h1>

          <p className="mt-1 text-[var(--muted)]">
            Full client details
          </p>
        </div>

        <div className="space-y-5">
          <a
            href={`tel:${client.phone.replace(/\D/g, "")}`}
            className="flex items-center gap-3 text-[var(--muted)] hover:text-[var(--olive-dark)] hover:underline"
          >
            <Phone size={18} />
            <span>{client.phone}</span>
          </a>

          <a
            href={`https://maps.apple.com/?q=${encodeURIComponent(
              client.address
            )}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 text-[var(--muted)] hover:text-[var(--olive-dark)] hover:underline"
          >
            <MapPin size={18} />
            <span>{client.address}</span>
          </a>

          <div className="flex items-center gap-3 text-[var(--olive)]">
            <DollarSign size={18} />
            <span className="font-semibold">
              ${client.pricePerCleaning} per cleaning
            </span>
          </div>

          <div className="flex items-center gap-3 text-[var(--muted)]">
            <CalendarDays size={18} />
            <span>{client.frequency}</span>
          </div>

          <div className="border-t border-[var(--border-soft)] pt-5">
            <p className="text-sm font-medium text-[var(--charcoal)]">
              Gate / Garage Code
            </p>
            <p className="mt-1 text-[var(--muted)]">
              {client.gateCode || "No code added"}
            </p>
          </div>

          <div className="border-t border-[var(--border-soft)] pt-5">
            <p className="text-sm font-medium text-[var(--charcoal)]">
              Notes
            </p>
            <p className="mt-1 whitespace-pre-line text-[var(--muted)]">
              {client.notes || "No notes added"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClientDetails;