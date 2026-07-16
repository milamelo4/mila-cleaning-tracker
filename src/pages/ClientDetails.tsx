import { useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    CalendarDays,
    Clock,
    KeyRound,
    MapPin,
    Phone,
    StickyNote,
    TrendingUp,
    UserRound,
} from "lucide-react";
import { ClientContext } from "../context/ClientContext";

function formatPhoneNumber(phone: string) {
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  return phone;
}

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

    const hourlyEstimate =
    client && client.estimatedHours > 0
        ? client.pricePerCleaning / client.estimatedHours
        : 0;

    const formattedStartDate = client?.startDate
    ? new Date(client.startDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        })
    : "No start date";

    if (!client) {
        return (
        <div className="rounded-3xl border border-[var(--border-soft)] bg-[var(--card)] p-6 shadow-sm">
            <p className="text-[var(--charcoal)]">Client not found.</p>

            <button
            onClick={() => navigate("/clients")}
            className="mt-4 rounded-2xl bg-[var(--olive-dark)] px-4 py-2 font-medium text-white transition hover:bg-[var(--olive-hover)]"
            >
            Back to Clients
            </button>
        </div>
        );
    }

    return (
        <div className="space-y-5">
            <button
                onClick={() => navigate("/clients")}
                className="text-sm font-semibold text-[var(--olive)] hover:underline"
            >
                ← Back to Clients
            </button>

        <section className="rounded-3xl border border-[var(--border-soft)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--olive-dark)] text-white">
                    <UserRound size={26} />
                    </div>

                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--olive)]">
                            Client Profile
                        </p>

                        <h1 className="mt-1 text-2xl font-bold text-[var(--charcoal)]">
                            {client.name}
                        </h1>

                        <p className="mt-1 text-[var(--muted)]">
                            {client.frequency} cleaning client
                        </p>
                    </div>
                </div>

                <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    client.active
                        ? "bg-[var(--olive-soft)] text-[var(--olive-deep)]"
                        : "bg-[var(--soft)] text-[var(--muted-dark)]"
                    }`}
                >
                    {client.active ? "Active" : "Inactive"}
                </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
                <a
                    href={`tel:${client.phone.replace(/\D/g, "")}`}
                    className="rounded-2xl bg-[var(--cream)] p-4 transition hover:bg-[var(--olive-soft)]"
                >
                    <Phone size={20} className="text-[var(--olive)]" />

                    <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Call
                    </p>

                    <p className="mt-1 break-words font-semibold text-[var(--charcoal)]">
                    {formatPhoneNumber(client.phone) || "No phone"}
                    </p>
                </a>

                <a
                    href={`https://maps.apple.com/?q=${encodeURIComponent(
                    client.address
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl bg-[var(--cream)] p-4 transition hover:bg-[var(--olive-soft)]"
                >
                    <MapPin size={20} className="text-[var(--olive)]" />

                    <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Open Map
                    </p>

                    <p className="mt-1 font-semibold text-[var(--charcoal)]">
                    Address
                    </p>
                </a>
            </div>
        </section>

        <section className="rounded-3xl border border-[var(--border-soft)] bg-[var(--card)] p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--olive)]">
            Cleaning Info
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[var(--cream)] p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Price
                    </p>

                    <p className="mt-2 text-2xl font-bold text-[var(--charcoal)]">
                    ${client.pricePerCleaning}
                    </p>

                    <p className="text-sm text-[var(--muted)]">per cleaning</p>
                </div>

                <div className="rounded-2xl bg-[var(--cream)] p-4">
                    <CalendarDays size={20} className="text-[var(--olive)]" />

                    <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Schedule
                    </p>

                    <p className="mt-1 font-semibold text-[var(--charcoal)]">
                    {client.frequency}
                    </p>
                </div>

                <div className="rounded-2xl bg-[var(--cream)] p-4">
                    <Clock size={20} className="text-[var(--olive)]" />

                    <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Hours
                    </p>

                    <p className="mt-1 font-semibold text-[var(--charcoal)]">
                    {client.estimatedHours
                        ? `${client.estimatedHours} hrs`
                        : "No hours added"}
                    </p>
                </div>

                <div className="rounded-2xl bg-[var(--cream)] p-4">
                    <TrendingUp size={20} className="text-[var(--olive)]" />

                    <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Hourly Est.
                    </p>

                    <p className="mt-1 font-semibold text-[var(--charcoal)]">
                    {hourlyEstimate > 0
                        ? `$${hourlyEstimate.toFixed(2)}/hr`
                        : "No estimate"}
                    </p>
                </div>

                <div className="col-span-2 rounded-2xl bg-[var(--cream)] p-4">
                    <CalendarDays size={20} className="text-[var(--olive)]" />

                    <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    Started Working
                    </p>

                    <p className="mt-1 font-semibold text-[var(--charcoal)]">
                    {formattedStartDate}
                    </p>
                </div>
            </div>
        </section>

        <section className="rounded-3xl border border-[var(--border-soft)] bg-[var(--card)] p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--olive)]">
            Access
            </p>

            <div className="mt-4 rounded-2xl bg-[var(--cream)] p-4">
                <div className="flex items-start gap-3">
                    <KeyRound size={20} className="mt-0.5 text-[var(--olive)]" />

                    <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                            Gate / Garage Code
                        </p>

                        <p className="mt-1 font-semibold text-[var(--charcoal)]">
                            {client.gateCode || "No code added"}
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <section className="rounded-3xl border border-[var(--border-soft)] bg-[var(--card)] p-5 shadow-sm">
            <div className="flex items-center gap-2">
            <StickyNote size={20} className="text-[var(--olive)]" />

                <p className="text-sm font-semibold uppercase tracking-wide text-[var(--olive)]">
                    Notes
                </p>
            </div>

            <div className="mt-4 rounded-2xl bg-[var(--cream)] p-4">
                <p className="whitespace-pre-line text-[var(--muted)]">
                    {client.notes || "No notes added"}
                </p>
            </div>
        </section>
    </div>
  );
}

export default ClientDetails;