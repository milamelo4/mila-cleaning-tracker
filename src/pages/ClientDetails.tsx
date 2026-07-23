import { useContext } from "react";
import { MemberContext } from "../context/MemberContext";
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
    Banknote,
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

    const memberContext = useContext(MemberContext);

    if (!memberContext) {
        throw new Error("MemberContext not found");
    }

    const { role } = memberContext;

    if (!clientContext) {
        throw new Error("ClientContext not found");
    }

    const { clients, deleteClient } = clientContext;

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
            className="mt-4 rounded-2xl bg-[var(--blue-dark)] px-4 py-2 font-medium text-white transition hover:bg-[var(--blue-hover)]"
            >
            Back to Clients
            </button>
        </div>
        );
    }

    const monthlyEstimate = (() => {
        const price = client?.pricePerCleaning || 0;

        switch (client?.frequency) {
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
})  ();

    return (
        <div className="space-y-5">
            <button
                onClick={() => navigate("/clients")}
                className="text-sm font-semibold text-[var(--blue-dark)] hover:underline"
            >
                ← Back to Clients
            </button>

            <section className="rounded-3xl border border-[var(--border-soft)] bg-[var(--card)] p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--blue-dark)] text-white">
                        <UserRound size={26} />
                        </div>

                        <div>
                            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--blue-dark)]">
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
                        <Phone size={20} className="text-[var(--blue)]" />

                        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[var(--charcoal)]">
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
                        <MapPin size={20} className="text-[var(--blue)]" />

                        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[var(--charcoal)]">
                        Open Map
                        </p>

                        <p className="mt-1 font-semibold text-[var(--charcoal)]">
                        Address
                        </p>
                    </a>
                </div>
            </section>

            <section className="rounded-3xl border border-[var(--border-soft)] bg-[var(--card)] p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-[var(--blue-dark)]">
                Cleaning Info
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-[var(--cream)] p-4">                        
                        <Banknote size={20} className="text-[var(--blue)]" />

                        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[var(--charcoal)]">
                        Price per cleaning
                        </p>

                        <p className="mt-2 text-2xl font-bold text-[var(--charcoal)]">
                        ${client.pricePerCleaning}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[var(--cream)] p-4">
                        <Banknote size={20} className="text-[var(--blue)]" />

                        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[var(--charcoal)]">
                            Monthly Est.
                        </p>

                        <p className="mt-1 font-bold text-2xl text-[var(--charcoal)]">
                            ${monthlyEstimate.toFixed(2)}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[var(--cream)] p-4">
                        <CalendarDays size={20} className="text-[var(--blue)]" />

                        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[var(--charcoal)]">
                        Schedule
                        </p>

                        <p className="mt-1 font-semibold text-[var(--charcoal)]">
                        {client.frequency}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[var(--cream)] p-4">
                        <Clock size={20} className="text-[var(--blue)]" />

                        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[var(--charcoal)]">
                        Hours
                        </p>

                        <p className="mt-1 font-semibold text-[var(--charcoal)]">
                        {client.estimatedHours
                            ? `${client.estimatedHours} hrs`
                            : "No hours added"}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[var(--cream)] p-4">
                        <TrendingUp size={20} className="text-[var(--blue)]" />

                        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[var(--charcoal)]">
                        Hourly Est.
                        </p>

                        <p className="mt-1 font-semibold text-[var(--charcoal)]">
                        {hourlyEstimate > 0
                            ? `$${hourlyEstimate.toFixed(2)}/hr`
                            : "No estimate"}
                        </p>
                    </div>

                    <div className="rounded-2xl bg-[var(--cream)] p-4">
                        <CalendarDays size={20} className="text-[var(--blue)]" />

                        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-[var(--charcoal)]">
                        Started Working
                        </p>

                        <p className="mt-1 font-semibold text-[var(--charcoal)]">
                        {formattedStartDate}
                        </p>
                    </div>
                    
                </div>
            </section>

            <section className="rounded-3xl border border-[var(--border-soft)] bg-[var(--card)] p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-[var(--blue-dark)]">
                Access
                </p>

                <div className="mt-4 rounded-2xl bg-[var(--cream)] p-4">
                    <div className="flex items-start gap-3">
                        <KeyRound size={20} className="mt-0.5 text-[var(--blue)]" />

                        <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-[var(--charcoal)]">
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
                <StickyNote size={20} className="text-[var(--blue)]" />

                    <p className="text-sm font-semibold uppercase tracking-wide text-[var(--blue-dark)]">
                        Notes
                    </p>
                </div>

                <div className="mt-4 rounded-2xl bg-[var(--cream)] p-4">
                    <p className="whitespace-pre-line text-[var(--charcoal)] font-semibold ">
                        {client.notes || "No notes added"}
                    </p>
                </div>
            </section>

            {role === "admin" && (
                <div className="mt-6 flex gap-3">
                    <button
                    onClick={() => navigate(`/clients/${client.firestoreId}/edit`)}
                    className="w-full rounded-xl bg-[var(--blue-dark)] py-3 font-medium text-white transition hover:bg-[var(--blue)]"
                    >
                    Edit Client
                    </button>

                    <button
                    onClick={async () => {
                        const confirmed = window.confirm(
                        `Delete ${client.name}? This cannot be undone.`
                        );

                        if (!confirmed || !client.firestoreId) return;

                        await deleteClient(client.firestoreId);
                        navigate("/clients");
                    }}
                    className="w-full rounded-xl border border-red-700 py-3 font-medium text-red-700 transition hover:bg-red-100"
                    >
                    Delete Client
                    </button>
                </div>
            )}
        </div>
    );
}

export default ClientDetails;